import "server-only";
import { db } from "@/db";
import { products, scans } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getIngrProduct, type NormalizedProduct } from "./ingr";
import { lookupAdditive } from "./additives";
import type { ProductCardData } from "./models";

export function enrichStoredProduct(p: typeof products.$inferSelect) {
  return {...p,additivesDetailed:(p.additives || []).map(a => {
    const detail=lookupAdditive(a.code);
    return {code:a.code,name:a.name,risk:a.risk,func:detail.func,description:detail.description};
  })};
}

export function productCard(p: typeof products.$inferSelect): ProductCardData {
  const badges=(p.notes || []).map(n => ({title:n.title,severity:n.severity,icon:n.icon}));
  return {id:p.id,barcode:p.barcode || "",name:p.name,brand:p.brand,imageUrl:p.imageUrl,
    score:p.score,scoreLabel:p.scoreLabel || "",quantity:p.quantity,nutriscore:p.nutriscore,
    badges,badgeCount:badges.length,createdAt:p.createdAt?.toISOString() || null,
    hasDetail:true,source:p.source || "ingr"};
}

export async function saveIngrProduct(n: NormalizedProduct) {
  const row={barcode:n.barcode,name:n.name,brand:n.brand,imageUrl:n.imageUrl,quantity:n.quantity,
    categories:n.categories,ingredientsText:n.ingredientsText,ingredients:n.ingredients,additives:n.additives,
    nutriments:n.nutriments,nutritionTabs:n.nutritionTabs,allergens:n.allergens,manufacturer:n.manufacturer,
    nutriscore:n.nutriscore,nova:n.nova,score:n.score,scoreLabel:n.scoreLabel,notes:n.notes,
    source:"ingr",updatedAt:new Date()};
  const [saved]=await db.insert(products).values({...row,scanCount:0})
    .onConflictDoUpdate({target:products.barcode,set:row,
      setWhere:sql`coalesce(${products.source}, '') not in ('manual','ocr')`}).returning();
  if(saved) return saved;
  const [existing]=await db.select().from(products).where(eq(products.barcode,n.barcode)).limit(1);
  if(!existing) throw new Error("Ürün kaydedilemedi.");
  return existing;
}

export async function resolveProduct(barcode:string, refresh=false) {
  const [cached]=await db.select().from(products).where(eq(products.barcode,barcode)).limit(1);
  const edited=cached?.source === "manual" || cached?.source === "ocr";
  const fresh=cached?.source === "ingr" && cached.updatedAt && Date.now()-cached.updatedAt.getTime()<6*60*60*1000;
  if(cached && (edited || (!refresh && fresh))) return {product:enrichStoredProduct(cached),fromCache:true};
  const n=await getIngrProduct(barcode);
  if(!n) return null;
  const stored=await saveIngrProduct(n);
  return {product:stored.source === "ingr" ? {...stored,additivesDetailed:n.additivesDetailed} : enrichStoredProduct(stored),fromCache:false};
}

export async function recordLocalScan(p:typeof products.$inferSelect) {
  await db.transaction(async tx => {
    await tx.insert(scans).values({productId:p.id,barcode:p.barcode,productName:p.name,score:p.score});
    await tx.update(products).set({scanCount:sql`coalesce(${products.scanCount},0)+1`}).where(eq(products.id,p.id));
  });
}
