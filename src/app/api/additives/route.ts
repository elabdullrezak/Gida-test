import { NextRequest, NextResponse } from "next/server";
import { ADDITIVES_DB } from "@/lib/additives";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").toLocaleLowerCase("tr-TR");
  const all = Object.values(ADDITIVES_DB);
  const filtered = q ? all.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLocaleLowerCase("tr-TR").includes(q) || a.func.toLocaleLowerCase("tr-TR").includes(q)) : all;
  return NextResponse.json({ additives: filtered.slice(0, 200), total: all.length });
}
