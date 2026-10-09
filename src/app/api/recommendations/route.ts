import { NextRequest, NextResponse } from "next/server";
import { getIngrRecommendations } from "@/lib/ingr";

export const dynamic = "force-dynamic";
export async function GET(req:NextRequest) {
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode || !/^\d{4,14}$/.test(barcode)) return NextResponse.json({sections:[],error:"Geçerli bir barkod gerekli."},{status:400});
  try { return NextResponse.json({sections:await getIngrRecommendations(barcode),source:"ingr"}); }
  catch(e) { return NextResponse.json({sections:[],error:e instanceof Error ? e.message : "Benzer ürünler alınamadı."},{status:502}); }
}
