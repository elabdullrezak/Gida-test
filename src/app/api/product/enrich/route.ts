import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, scans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateScore } from "@/lib/scoring";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fotoğraf (OCR) veya manuel girişle ürün içeriğini tamamlar/günceller,
// yeniden puanlar ve veritabanına kaydeder.
export async function POST(req: NextRequest) {
  let debugBarcode = "";
  try {
    const body = await req.json();
    const idRaw = String(body.id || "").trim();
    const id = UUID_RE.test(idRaw) ? idRaw : null;
    let barcode: string | null = String(body.barcode || "").trim().replace(/\s+/g, "") || null;
    debugBarcode = barcode || "";
    const name = String(body.name || "").trim();
    const brand = String(body.brand || "").trim() || null;
    const quantity = String(body.quantity || "").trim() || null;
    const ingredientsText = String(body.ingredientsText || "").trim();
    const source: string = body.source === "ocr" ? "ocr" : "manual";

    const rawN = (body.nutriments || {}) as Record<string, unknown>;
    const numOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "."));
      if (!Number.isFinite(n) || n < 0) return null;
      return Math.round(n * 100) / 100;
    };
    const nutriments = {
      energyKcal: numOrNull(rawN.energyKcal),
      fat: numOrNull(rawN.fat),
      saturatedFat: numOrNull(rawN.saturatedFat),
      carbs: numOrNull(rawN.carbs),
      sugars: numOrNull(rawN.sugars),
      fiber: numOrNull(rawN.fiber),
      protein: numOrNull(rawN.protein),
      salt: numOrNull(rawN.salt),
      sodium: numOrNull(rawN.sodium),
    };

    if (!name) return NextResponse.json({ error: "Ürün adı gerekli" }, { status: 400 });
    if (!ingredientsText || ingredientsText.length < 5)
      return NextResponse.json({ error: "İçerik metni çok kısa — en az birkaç bileşen yazın" }, { status: 400 });

    // mevcut kaydı bul: önce id, sonra barkod (id değerinin barkod olarak
    // gönderildiği eski istemcilerle uyumluluk için uuid benzeri barkodu da id say)
    let prev: typeof products.$inferSelect | null = null;
    if (id) {
      const rows = await db.select().from(products).where(eq(products.id, id as never)).limit(1);
      if (rows.length > 0) prev = rows[0];
    }
    if (!prev && barcode) {
      if (UUID_RE.test(barcode)) {
        const rows = await db.select().from(products).where(eq(products.id, barcode as never)).limit(1);
        if (rows.length > 0) prev = rows[0];
      }
      if (!prev) {
        const rows = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1);
        if (rows.length > 0) prev = rows[0];
      }
    }

    if (!barcode || UUID_RE.test(barcode)) barcode = prev?.barcode ?? "MAN-" + Date.now().toString(36).toUpperCase();

    const result = calculateScore({ ingredientsText, nutriments, nova: prev?.nova ?? null });

    const row = {
      barcode,
      name,
      brand: brand ?? prev?.brand ?? null,
      imageUrl: prev?.imageUrl ?? null,
      quantity: quantity ?? prev?.quantity ?? null,
      categories: prev?.categories ?? null,
      ingredientsText,
      ingredients: result.ingredients,
      additives: result.additives.map((a) => ({ code: a.code, name: a.name, risk: a.risk })),
      nutriments: nutriments as Record<string, number | null>,
      nutritionTabs: [],
      allergens: prev?.allergens ?? [],
      manufacturer: prev?.manufacturer ?? null,
      nutriscore: prev?.nutriscore ?? null,
      nova: prev?.nova ?? null,
      score: result.score,
      scoreLabel: result.label,
      notes: result.notes,
      source, // kullanıcı düzeltmesi her zaman en güncel kaynaktır
      scanCount: (prev?.scanCount ?? 0) + 1,
      updatedAt: new Date(),
    };

    let saved: typeof products.$inferSelect | undefined;
    if (prev) {
      const upd = await db.update(products).set(row).where(eq(products.id, prev.id)).returning();
      saved = upd[0];
    } else {
      const ins = await db
        .insert(products)
        .values(row)
        .onConflictDoUpdate({ target: products.barcode, set: row })
        .returning();
      saved = ins[0];
    }
    if (!saved) throw new Error("Kayıt oluşturulamadı (boş sonuç)");
    await db
      .insert(scans)
      .values({ productId: saved.id, barcode: saved.barcode, productName: saved.name, score: saved.score })
      .catch(() => {});

    return NextResponse.json({ product: saved, source });
  } catch (e) {
    console.error("enrich failed", debugBarcode, e);
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return NextResponse.json({ error: `Kaydedilemedi (${msg})` }, { status: 500 });
  }
}
