import { NextRequest, NextResponse } from "next/server";
import { getIngrRecent } from "@/lib/ingr";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") || "0", 10) || 0);
  const count = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "50", 10) || 50));
  try {
    const {items,pagination} = await getIngrRecent(page,count);
    return NextResponse.json({products:items,pagination,source:"ingr"});
  } catch(e) {
    return NextResponse.json({products:[],error:e instanceof Error ? e.message : "Yeni eklenenler alınamadı."}, {status:502});
  }
}
