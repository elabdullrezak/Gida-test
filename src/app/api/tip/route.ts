import { NextResponse } from "next/server";
import { getIngrDailyMessage } from "@/lib/ingr";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({tip:await getIngrDailyMessage(),source:"ingr"}); }
  catch(e) { return NextResponse.json({tip:null,error:e instanceof Error ? e.message : "Günün ipucu alınamadı."},{status:502}); }
}
