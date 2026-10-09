import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productLists, listEntries, bookmarks, products } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { resolveProduct, productCard } from "@/lib/product-store";

export const dynamic="force-dynamic";
async function ensureBuiltins() {
  await db.insert(productLists).values([
    {id:"cart",name:"Sepetim",icon:"cart",kind:"builtin"},
    {id:"disliked",name:"Beğenmediklerim",icon:"trash",kind:"builtin"},
  ]).onConflictDoNothing();
}
export async function GET(req:NextRequest) {
  try {
    await ensureBuiltins();
    const allowed=inArray(products.source,["ingr","manual","ocr"]);
    const list=req.nextUrl.searchParams.get("list");
    if(list) {
      const rows=list==="favorites"
        ? await db.select({product:products,date:bookmarks.createdAt}).from(bookmarks).innerJoin(products,eq(bookmarks.productId,products.id)).where(allowed).orderBy(desc(bookmarks.createdAt))
        : await db.select({product:products,date:listEntries.createdAt}).from(listEntries).innerJoin(products,eq(listEntries.productId,products.id)).where(and(eq(listEntries.listId,list),allowed)).orderBy(desc(listEntries.createdAt));
      return NextResponse.json({items:rows.map(r=>({...productCard(r.product),createdAt:r.date?.toISOString() || null,isSaved:list==="favorites"}))});
    }
    const [all,favorites,counts]=await Promise.all([
      db.select().from(productLists).orderBy(productLists.createdAt),
      db.select({count:sql<number>`count(*)`}).from(bookmarks).innerJoin(products,eq(bookmarks.productId,products.id)).where(allowed),
      db.select({listId:listEntries.listId,count:sql<number>`count(*)`}).from(listEntries).innerJoin(products,eq(listEntries.productId,products.id)).where(allowed).groupBy(listEntries.listId),
    ]);
    const countMap=new Map(counts.map(r=>[r.listId,Number(r.count)]));
    return NextResponse.json({lists:[{id:"favorites",name:"Favorilerim",icon:"heart",kind:"builtin",count:Number(favorites[0]?.count||0)},...all.map(l=>({...l,count:countMap.get(l.id)||0}))]});
  } catch {return NextResponse.json({error:"Listeler yüklenemedi."},{status:500});}
}
export async function POST(req:NextRequest) {
  try {
    const body=await req.json();
    await ensureBuiltins();
    if(body.action==="create") {
      const name=String(body.name || "").trim();
      if(name.length<2 || name.length>40) return NextResponse.json({error:"Liste adı 2–40 karakter olmalı."},{status:400});
      const [list]=await db.insert(productLists).values({id:randomUUID(),name,icon:"bookmark",kind:"custom"}).returning();
      return NextResponse.json({list:{...list,count:0}});
    }
    const listId=String(body.listId || "");
    const barcode=String(body.barcode || "").trim();
    if(!barcode || !listId) return NextResponse.json({error:"Liste ve ürün seçin."},{status:400});
    if(listId!=="favorites") {
      const [exists]=await db.select().from(productLists).where(eq(productLists.id,listId)).limit(1);
      if(!exists) return NextResponse.json({error:"Liste bulunamadı."},{status:404});
    }
    const result=await resolveProduct(barcode);
    if(!result) return NextResponse.json({error:"Ürün ingr veritabanında bulunamadı."},{status:404});
    if(listId==="favorites") await db.insert(bookmarks).values({productId:result.product.id,barcode}).onConflictDoNothing();
    else await db.insert(listEntries).values({listId,productId:result.product.id}).onConflictDoNothing();
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:"Ürün listeye eklenemedi."},{status:502});}
}
export async function DELETE(req:NextRequest) {
  try {
    const listId=req.nextUrl.searchParams.get("listId") || "";
    const barcode=req.nextUrl.searchParams.get("barcode");
    if(!listId) return NextResponse.json({error:"Liste gerekli."},{status:400});
    if(barcode) {
      if(listId==="favorites") await db.delete(bookmarks).where(eq(bookmarks.barcode,barcode));
      else {
        const [p]=await db.select({id:products.id}).from(products).where(eq(products.barcode,barcode)).limit(1);
        if(p) await db.delete(listEntries).where(and(eq(listEntries.listId,listId),eq(listEntries.productId,p.id)));
      }
    } else {
      const [deleted]=await db.delete(productLists).where(and(eq(productLists.id,listId),eq(productLists.kind,"custom"))).returning();
      if(!deleted) return NextResponse.json({error:"Varsayılan listeler silinemez."},{status:400});
    }
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:"İşlem tamamlanamadı."},{status:500});}
}
