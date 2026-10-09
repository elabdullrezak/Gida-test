import { NextRequest, NextResponse } from "next/server";
import { getIngrConfig, saveIngrConfig, resetIngrConfig, maskToken } from "@/lib/settings";

export const dynamic = "force-dynamic";

function jwtExpiry(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (typeof payload.exp === "number") return new Date(payload.exp * 1000).toISOString();
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const cfg = await getIngrConfig();
  return NextResponse.json({
    clientId: cfg.clientId,
    hasToken: cfg.token.length > 0,
    tokenPreview: maskToken(cfg.token),
    tokenExpiry: cfg.token ? jwtExpiry(cfg.token) : null,
    version: cfg.version,
    build: cfg.build,
    lat: cfg.lat,
    lng: cfg.lng,
    country: cfg.country,
    customized: cfg.customized,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "reset") {
      await resetIngrConfig();
      return NextResponse.json({ ok: true, reset: true });
    }
    if (body.action === "test") {
      const { getIngrRecent } = await import("@/lib/ingr");
      try {
        const { items } = await getIngrRecent(0, 1);
        return NextResponse.json({ ok: true, message: `Bağlantı çalışıyor (${items.length} ürün alındı).` });
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "Bağlantı testi başarısız." },
          { status: 502 }
        );
      }
    }
    const fields = ["clientId", "token", "version", "build", "lat", "lng", "country"] as const;
    const input: Partial<Record<(typeof fields)[number], string>> = {};
    for (const f of fields) {
      const v = typeof body[f] === "string" ? body[f].trim() : "";
      if (v && !v.includes("•")) input[f] = v;
    }
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: "Kaydedilecek bir değer girin." }, { status: 400 });
    }
    await saveIngrConfig(input);
    const cfg = await getIngrConfig();
    return NextResponse.json({
      ok: true,
      hasToken: cfg.token.length > 0,
      tokenPreview: maskToken(cfg.token),
      tokenExpiry: cfg.token ? jwtExpiry(cfg.token) : null,
      customized: cfg.customized,
    });
  } catch {
    return NextResponse.json({ error: "Ayarlar kaydedilemedi." }, { status: 500 });
  }
}
