import { NextRequest, NextResponse } from "next/server";
import { mergedScanHistory } from "@/lib/history";

export const dynamic="force-dynamic";
export async function GET(req:NextRequest) {
  const q=req.nextUrl.searchParams;
  const page=Math.max(0,parseInt(q.get("pageIndex") || q.get("page") || "0",10) || 0);
  const count=Math.min(50,Math.max(1,parseInt(q.get("pageCount") || q.get("count") || "10",10) || 10));
  try{return NextResponse.json(await mergedScanHistory(page,count));}
  catch{return NextResponse.json({history:[],error:"Son taramalar yüklenemedi."},{status:500});}
}
