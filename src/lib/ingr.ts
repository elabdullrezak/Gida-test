import "server-only";
import { lookupAdditive } from "./additives";
import { scoreLabelFor, type IngredientRisk, type ScoreNote } from "./scoring";
import type { ApiPagination, DailyTip, ProductBadge, ProductCardData } from "./models";
import { getIngrConfig } from "./settings";

const BASE = "https://api.ingr.tech/api/v1";

export class IngrError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function headers(location: boolean): Promise<Record<string, string>> {
  const cfg = await getIngrConfig();
  if (!cfg.token || !cfg.clientId) throw new IngrError("ingr bağlantısı yapılandırılmamış. Hesap > API Bağlantısı bölümünden x-user-token ve x-client-id girin.", 503);
  const h: Record<string, string> = {
    "User-Agent": "ktor-client", Accept: "application/json",
    "x-client-id": cfg.clientId, "x-client-type": "Android",
    "x-client-version": cfg.version,
    "x-client-build": cfg.build,
    "x-user-token": cfg.token, "content-type": "application/json",
  };
  if (location) {
    h["x-location-latitude"] = cfg.lat;
    h["x-location-longitude"] = cfg.lng;
    h["x-location-country"] = cfg.country;
  }
  return h;
}

interface Envelope<T> { result: T; success: boolean; statusCode: number }
const cache = new Map<string, { expires: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();

async function get<T>(path: string, opts: { location?: boolean; ttl?: number } = {}): Promise<T> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const running = pending.get(path);
  if (running) return running as Promise<T>;
  const request = (async () => {
    try {
      const res = await fetch(BASE + path, { headers: await headers(opts.location !== false), cache: "no-store", signal: AbortSignal.timeout(18000) });
      if (!res.ok) {
        const message = res.status === 401 || res.status === 403
          ? "ingr erişim token’ı geçersiz veya süresi dolmuş."
          : res.status === 404 ? "ingr veritabanında bulunamadı."
          : res.status === 429 ? "Çok fazla istek gönderildi. Biraz sonra tekrar deneyin."
          : "ingr servisine şu an ulaşılamıyor.";
        throw new IngrError(message, res.status);
      }
      const data = await res.json() as Envelope<T>;
      if (data.success === false || data.result == null) throw new IngrError("ingr servisi geçerli bir sonuç döndürmedi.", data.statusCode || 502);
      if (opts.ttl) {
        if (cache.size > 200) cache.delete(cache.keys().next().value as string);
        cache.set(path, { expires: Date.now() + opts.ttl, data: data.result });
      }
      return data.result;
    } finally { pending.delete(path); }
  })();
  pending.set(path, request);
  return request as Promise<T>;
}

export interface IngrSummary {
  barcode: string; brand: string | null; nutriScore: string | null; ingrScore: number | null;
  manufacturer: string | null; imageUrl: string | null; ingrScoreColor: number;
  name: string; hasDetail: boolean;
}
interface RawBadge { title: string; appIconType: number; color: number }
interface RawProduct {
  productSummaryModel: IngrSummary; isSaved: boolean;
  badges?: { items: RawBadge[]; totalCount: number } | null;
}
interface RawContext {
  pageIndex?: number; pageSize?: number; totalCount?: number; totalPages?: number;
  limit?: number | null; isLimited?: boolean;
}
interface RawScan { result: RawProduct; scanDate?: string | null; scanCount?: number }
interface RawRecent { result: RawProduct; editedDate?: string | null }
interface IngrNote extends RawBadge { id: number; description: string; source: string | null; url: string | null }
interface NutValue { title: string; value: number; unit: number; order: number }
interface NutTab { title: string; order: number; values: NutValue[] }
interface DetailResult {
  productDetailModel: {
    summary: IngrSummary; notes: IngrNote[];
    additives: { id: number; code: string; name: string; color: number }[];
    ingredients: { name: string; color: number }[];
    nutritionalValues: NutTab[];
    information?: { manufacturerName?: string | null } | null;
  };
  allergens: { title?: string; name?: string }[] | null;
  isSaved: boolean;
}

export function colorToRisk(color: number): string {
  if (color <= 50) return "RİSK YOK";
  if (color <= 100) return "DÜŞÜK";
  if (color <= 125) return "ORTA";
  if (color <= 150) return "YÜKSEK";
  return "ÇOK YÜKSEK";
}
export function colorToIngredientRisk(color: number): IngredientRisk {
  return color <= 50 ? "yesil" : color <= 100 ? "sari" : color <= 125 ? "turuncu" : "kirmizi";
}

function iconFor(b: RawBadge): string {
  const t = b.title.toLocaleLowerCase("tr-TR");
  if (t.includes("palm")) return "droplet";
  if (t.includes("margarin")) return "box";
  if (t.includes("poliyol")) return "help";
  if (t.includes("tatlandırıcı")) return "sweet";
  if (t.includes("şeker")) return "sugar";
  if (t.includes("katkı maddesi içerm")) return "noadditives";
  if (t.includes("belirsiz aroma")) return "flask";
  if (t.includes("aroma")) return "flask-filled";
  if (t.includes("fosfat")) return "flask";
  if (t.includes("trans") || t.includes("hidrojen")) return "warn";
  if (t.includes("renk")) return "color";
  if (t.includes("koruyucu")) return "shield";
  if (t.includes("tuz")) return "salt";
  if (t.includes("yağ")) return "fat";
  if (t.includes("lif") || t.includes("tahıl")) return "leaf";
  if (t.includes("gluten") || t.includes("un ")) return "wheat";
  const known: Record<number, string> = { 36: "droplet", 37: "box", 38: "sweet", 39: "sugar", 40: "sugar", 43: "flask-filled", 45: "flask", 47: "noadditives", 82: "help", 83: "flask" };
  return known[b.appIconType] || "info";
}
function badge(b: RawBadge): ProductBadge {
  return { title: b.title, severity: colorToIngredientRisk(b.color), icon: iconFor(b), appIconType: b.appIconType };
}
function quantityFromName(name: string): string | null {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|lt|l|cl)\b/i);
  return m ? `${m[1].replace(",", ".")} ${m[2].toLowerCase()}` : null;
}
function summary(p: RawProduct): ProductCardData {
  const s = p.productSummaryModel;
  const score = typeof s.ingrScore === "number" ? s.ingrScore : null;
  const badges = (p.badges?.items || []).map(badge);
  return {
    id: `ingr-${s.barcode}`, barcode: s.barcode, name: s.name, brand: s.brand || null,
    imageUrl: s.imageUrl || null, score, scoreLabel: score == null ? "Puan bilgisi yok" : scoreLabelFor(score).label,
    quantity: quantityFromName(s.name), nutriscore: s.nutriScore, badges,
    badgeCount: Math.max(p.badges?.totalCount || 0, badges.length), hasDetail: s.hasDetail,
    isSaved: p.isSaved, source: "ingr",
  };
}
function pagination(c: RawContext | undefined, index: number, size: number, length: number): ApiPagination {
  const pageIndex = c?.pageIndex ?? index;
  const totalPages = c?.totalPages ?? (length < size ? index + 1 : index + 2);
  return {
    pageIndex, pageSize: c?.pageSize ?? size, totalCount: c?.totalCount ?? length,
    totalPages, isLimited: c?.isLimited ?? false,
    // Bu API’de pageIndex kayıt ofsetidir (1 → ilk kaydı atla).
    hasMore: c?.totalCount !== undefined ? pageIndex + length < c.totalCount : length === size,
  };
}

export interface NormalizedProduct {
  barcode: string; name: string; brand: string | null; imageUrl: string | null;
  quantity: string | null; categories: string | null; ingredientsText: string;
  ingredients: { name: string; risk: string }[];
  additives: { code: string; name: string; risk: string }[];
  additivesDetailed: { code: string; name: string; risk: string; func: string; description: string }[];
  nutriments: Record<string, number | null>;
  nutritionTabs: { title: string; values: { title: string; value: number; unit: string }[] }[];
  allergens: string[]; manufacturer: string | null; nutriscore: string | null; nova: number | null;
  score: number; scoreLabel: string;
  notes: (ScoreNote & { source?: string | null; url?: string | null })[];
  source: string;
}
function unitLabel(unit: number): string {
  return ({ 1: "g", 2: "mg", 3: "µg", 4: "kcal", 5: "kJ", 6: "ml" } as Record<number, string>)[unit] || "";
}
export function normalizeIngrDetail(res: DetailResult): NormalizedProduct {
  const m = res.productDetailModel;
  const s = m.summary;
  const ingredients = (m.ingredients || []).map(i => ({ name: i.name, risk: colorToIngredientRisk(i.color) }));
  const additivesDetailed = (m.additives || []).map(a => {
    const info = lookupAdditive(a.code);
    return { code: a.code, name: info.name === "Bilinmeyen Katkı Maddesi" ? a.name : info.name,
      risk: colorToRisk(a.color), func: a.name || info.func, description: info.description };
  });
  const notes = (m.notes || []).map(n => ({
    title: n.title, description: n.description, severity: colorToIngredientRisk(n.color),
    icon: iconFor(n), source: n.source, url: n.url,
  }));
  const nutritional = (m.nutritionalValues || []).slice().sort((a,b) => a.order-b.order);
  const nutritionTabs = nutritional.map(t => ({ title: t.title,
    values: (t.values || []).slice().sort((a,b) => a.order-b.order).map(v => ({ title:v.title, value:v.value, unit:unitLabel(v.unit) })) }));
  const nutriments: Record<string, number | null> = { energyKcal:null, fat:null, saturatedFat:null, carbs:null, sugars:null, fiber:null, protein:null, salt:null, sodium:null };
  const base = nutritional.find(t => /100\s*(g|ml)/i.test(t.title));
  const keyMap: Record<string,string> = { "enerji":"energyKcal", "yağ":"fat", "doymuş yağ":"saturatedFat", "karbonhidrat":"carbs", "şeker":"sugars", "lif":"fiber", "protein":"protein", "tuz":"salt", "sodyum":"sodium" };
  for (const v of base?.values || []) {
    const key = keyMap[v.title.trim().toLocaleLowerCase("tr-TR")];
    if (!key) continue;
    const value = key === "energyKcal" && v.unit === 5 ? v.value/4.184 : v.value;
    nutriments[key] = Math.round(value*100)/100;
  }
  const score = s.ingrScore;
  if (typeof score !== "number") throw new IngrError("Ürünün INGR Score bilgisi henüz yok.", 422);
  return {
    barcode:s.barcode, name:s.name, brand:s.brand, imageUrl:s.imageUrl, quantity:quantityFromName(s.name), categories:null,
    ingredientsText:ingredients.map(i => i.name).join(", "), ingredients,
    additives:additivesDetailed.map(a => ({code:a.code,name:a.name,risk:a.risk})), additivesDetailed,
    nutriments,nutritionTabs,allergens:(res.allergens || []).map(a => a.title || a.name || "").filter(Boolean),
    manufacturer:s.manufacturer || m.information?.manufacturerName || null, nutriscore:s.nutriScore, nova:null,
    score, scoreLabel:scoreLabelFor(score).label, notes, source:"ingr",
  };
}
export async function getIngrProduct(barcode: string): Promise<NormalizedProduct | null> {
  try {
    const data = await get<DetailResult>(`/products/barcode/${encodeURIComponent(barcode)}/details?countryId=1&type=4&position=1`);
    return data.productDetailModel?.summary ? normalizeIngrDetail(data) : null;
  } catch(e) { if (e instanceof IngrError && e.status === 404) return null; throw e; }
}
export type IngrSearchItem = ProductCardData;
export async function searchIngr(query: string, pageCount=50): Promise<ProductCardData[]> {
  const data = await get<{payload:RawProduct[]}>(`/products/search?name=${encodeURIComponent(query)}&countryId=1&pageIndex=0&pageCount=${pageCount}`);
  return (data.payload || []).filter(p => p?.productSummaryModel?.barcode).map(summary);
}
export async function getIngrRecent(pageIndex=0, pageCount=50): Promise<{items:ProductCardData[]; pagination:ApiPagination}> {
  const data = await get<{payload:RawRecent[]; context?:RawContext}>(`/products/recent?countryId=1&pageIndex=${pageIndex}&pageCount=${pageCount}`, {location:false,ttl:30000});
  const items = (data.payload || []).filter(p => p?.result?.productSummaryModel?.barcode).map(p => ({...summary(p.result),editedDate:p.editedDate || null}));
  return {items,pagination:pagination(data.context,pageIndex,pageCount,items.length)};
}
export async function getIngrScans(pageIndex=0,pageCount=10): Promise<{items:ProductCardData[]; pagination:ApiPagination}> {
  const data = await get<{payload:RawScan[]; context?:RawContext}>(`/product-scans?countryId=1&pageIndex=${pageIndex}&pageCount=${pageCount}`, {location:false,ttl:15000});
  const items = (data.payload || []).filter(p => p?.result?.productSummaryModel?.barcode).map(p => ({...summary(p.result),scanDate:p.scanDate || null,scanCount:p.scanCount || 1}));
  return {items,pagination:pagination(data.context,pageIndex,pageCount,items.length)};
}
export async function getIngrDailyMessage(): Promise<DailyTip> {
  const data = await get<{ingredientId:number; title:string; message:string; eCode:string; color:number}>("/daily-messages/additive/current", {location:false,ttl:60000});
  return {code:data.eCode,name:data.title,description:data.message,risk:colorToRisk(data.color),func:"Günün İpucu",ingredientId:data.ingredientId,source:"ingr"};
}
export interface IngrRecommendation {
  title:string; description:string | null; emptyMessage:string | null; items:ProductCardData[];
}
export async function getIngrRecommendations(barcode:string): Promise<IngrRecommendation[]> {
  const data = await get<{sections:{id?:number; presentation?:{title?:string;description?:string;emptyMessage?:string};products?:RawProduct[]}[]}>(`/product-recommendations/products/${encodeURIComponent(barcode)}`, {location:false,ttl:30000});
  return (data.sections || []).map(sec => ({title:sec.presentation?.title || "Benzer Ürünler",description:sec.presentation?.description || null,emptyMessage:sec.presentation?.emptyMessage || null,
    items:(sec.products || []).filter(p => p?.productSummaryModel?.barcode).map(summary)}));
}
