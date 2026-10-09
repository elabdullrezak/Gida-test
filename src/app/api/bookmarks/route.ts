import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, products } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { resolveProduct, productCard } from "@/lib/product-store";

export const dynamic="force-dynamic";
export async function GET() {
  try {
    const rows=await db.select({bookmark:bookmarks,product:products}).from(bookmarks)
      .innerJoin(products,eq(bookmarks.productId,products.id))
      .where(inArray(products.source,["ingr","manual","ocr"]))
      .orderBy(desc(bookmarks.createdAt));
    return NextResponse.json({bookmarks:rows.map(r=>({...productCard(r.product),id:r.bookmark.id,productId:r.product.id,createdAt:r.bookmark.createdAt?.toISOString() || null,isSaved:true}))});
  } catch {return NextResponse.json({bookmarks:[],error:"Favoriler yüklenemedi."},{status:500});}
}
export async function POST(req:NextRequest) {
  try {
    const body=await req.json();
    const barcode=String(body.barcode || "").trim();
    if(!/^\d{4,14}$/.test(barcode) && !/^MAN-[A-Z0-9]+$/i.test(barcode)) return NextResponse.json({error:"Geçerli bir barkod gerekli."},{status:400});
    const result=await resolveProduct(barcode);
    if(!result) return NextResponse.json({error:"Ürün ingr veritabanında bulunamadı."},{status:404});
    await db.insert(bookmarks).values({productId:result.product.id,barcode:result.product.barcode}).onConflictDoNothing();
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:"Ürün kaydedilemedi. Tekrar deneyin."},{status:502});}
}
export async function DELETE(req:NextRequest) {
  const barcode=req.nextUrl.searchParams.get("barcode") || "";
  if(!barcode) return NextResponse.json({error:"Barkod gerekli."},{status:400});
  try {await db.delete(bookmarks).where(eq(bookmarks.barcode,barcode));return NextResponse.json({ok:true});}
  catch {return NextResponse.json({error:"Ürün kaldırılamadı."},{status:500});}
}
