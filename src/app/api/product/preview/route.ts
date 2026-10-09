import { NextRequest, NextResponse } from "next/server";
import { calculateScore } from "@/lib/scoring";

// Kaydetmeden canlı analiz önizlemesi (manuel/OCR giriş ekranı için).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ingredientsText = String(body.ingredientsText || "").trim();
    if (!ingredientsText || ingredientsText.length < 3) {
      return NextResponse.json({ error: "İçerik metni çok kısa" }, { status: 400 });
    }
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
    const r = calculateScore({ ingredientsText, nutriments });
    return NextResponse.json({
      score: r.score,
      label: r.label,
      range: r.range,
      color: r.color,
      additives: r.additives.map((a) => ({ code: a.code, name: a.name, risk: a.risk })),
      ingredients: r.ingredients,
      notes: r.notes.map((x) => ({ title: x.title, severity: x.severity })),
      breakdown: r.breakdown,
    });
  } catch {
    return NextResponse.json({ error: "Önizleme hesaplanamadı" }, { status: 500 });
  }
}
