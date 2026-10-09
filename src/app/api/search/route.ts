import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ilike, or, desc, and, inArray } from "drizzle-orm";
import { searchIngr } from "@/lib/ingr";
import { productCard } from "@/lib/product-store";

export const dynamic="force-dynamic";
const SEARCH_COUNT = 50;

export async function GET(req:NextRequest) {
  const q=(req.nextUrl.searchParams.get("q") || "").trim().slice(0,120);
  if(q.length<2) return NextResponse.json({local:[],online:[],query:q,provider:"ingr",count:SEARCH_COUNT});
  const local=await db.select().from(products).where(and(inArray(products.source,["manual","ocr"]),or(ilike(products.name,`%${q}%`),ilike(products.brand,`%${q}%`),ilike(products.barcode,`%${q}%`)))).orderBy(desc(products.updatedAt)).limit(10);
  const ownCodes=new Set(local.map(p=>p.barcode));
  try {
    const online=(await searchIngr(q,SEARCH_COUNT)).filter(p=>!ownCodes.has(p.barcode));
    return NextResponse.json({query:q,provider:"ingr",count:SEARCH_COUNT,local:local.map(productCard),online,onlineError:null});
  }catch(e){return NextResponse.json({query:q,provider:"ingr",count:SEARCH_COUNT,local:local.map(productCard),online:[],onlineError:e instanceof Error?e.message:"ingr araması tamamlanamadı."});}
}
