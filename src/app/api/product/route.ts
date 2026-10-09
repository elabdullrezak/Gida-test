import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IngrError } from "@/lib/ingr";
import { resolveProduct, recordLocalScan } from "@/lib/product-store";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function respond(barcode:string, refresh:boolean, record:boolean) {
  if(!/^\d{4,14}$/.test(barcode) && !/^MAN-[A-Z0-9]+$/i.test(barcode))
    return NextResponse.json({error:"Geçerli bir barkod numarası girin."},{status:400});
  try {
    const result=await resolveProduct(barcode,refresh);
    if(!result) return NextResponse.json({error:"Bu ürün ingr veritabanında bulunamadı. Etiket fotoğrafı veya manuel girişle içerik ekleyebilirsiniz.",barcode},{status:404});
    if(record) await recordLocalScan(result.product);
    return NextResponse.json({...result,isNewOnline:!result.fromCache,source:result.product.source});
  } catch(e) {
    const status=e instanceof IngrError ? (e.status===401 || e.status===403 ? 503 : e.status===404 ? 404 : 502) : 500;
    return NextResponse.json({error:e instanceof IngrError ? e.message : "Ürün alınırken bir hata oluştu.",barcode},{status});
  }
}

export async function GET(req:NextRequest) {
  let barcode=req.nextUrl.searchParams.get("barcode")?.trim() || "";
  const id=req.nextUrl.searchParams.get("id")?.trim();
  if(!barcode && id && UUID.test(id)) {
    const [p]=await db.select({barcode:products.barcode}).from(products).where(eq(products.id,id)).limit(1);
    barcode=p?.barcode || "";
  }
  if(!barcode && id?.startsWith("ingr-")) barcode=id.slice(5);
  return respond(barcode,req.nextUrl.searchParams.get("refresh")==="1",false);
}

// Barkod tarama: yalnızca ingr ürün detayını sorgular; tarama kaydını yerelde saklar.
export async function POST(req:NextRequest) {
  try {
    const body=await req.json();
    return await respond(String(body.barcode || "").trim(),false,true);
  } catch { return NextResponse.json({error:"Geçersiz istek."},{status:400}); }
}
