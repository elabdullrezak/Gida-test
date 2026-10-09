import "server-only";
import { db } from "@/db";
import { bookmarks, products, scans } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getIngrScans } from "./ingr";
import { productCard } from "./product-store";
import type { ApiPagination, ProductCardData } from "./models";

export async function mergedScanHistory(page=0,count=10) {
  let remote:{items:ProductCardData[];pagination:ApiPagination} | null=null;
  let warning:string | null=null;
  try {remote=await getIngrScans(page,count);}
  catch(e) {warning=e instanceof Error ? e.message : "ingr tarama geçmişi alınamadı.";}
  const [saved,local]=await Promise.all([
    db.select({barcode:bookmarks.barcode}).from(bookmarks),
    page===0 ? db.select({product:products,scanDate:scans.createdAt}).from(scans)
      .innerJoin(products,eq(scans.productId,products.id))
      .where(inArray(products.source,["ingr","manual","ocr"]))
      .orderBy(desc(scans.createdAt)).limit(100) : Promise.resolve([]),
  ]);
  const savedSet=new Set(saved.map(s=>s.barcode));
  const items=new Map<string,ProductCardData>();
  for(const item of remote?.items || []) items.set(item.barcode,{...item,isSaved:savedSet.has(item.barcode)});
  for(const row of local) {
    const card=productCard(row.product);
    if(!card.barcode) continue;
    const when=row.scanDate?.toISOString() || null;
    const prev=items.get(card.barcode);
    if(!prev || (when && when>(prev.scanDate || ""))) {
      items.set(card.barcode,{...card,scanDate:when,isSaved:savedSet.has(card.barcode),scanCount:row.product.scanCount || 1});
    }
  }
  const history=Array.from(items.values()).sort((a,b)=>(b.scanDate || "").localeCompare(a.scanDate || ""));
  return {history,pagination:remote?.pagination || {pageIndex:page,pageSize:count,totalCount:history.length,totalPages:1,isLimited:false,hasMore:false},warning,source:"ingr"};
}
