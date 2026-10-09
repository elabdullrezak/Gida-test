import { NextResponse } from "next/server";
import { mergedScanHistory } from "@/lib/history";
import { resolveProduct } from "@/lib/product-store";
import type { ScanStatistics } from "@/lib/models";

export const dynamic="force-dynamic";
export async function GET() {
  try {
    const {history,warning}=await mergedScanHistory(0,50);
    const buckets=[0,0,0,0,0];
    const scores=history.map(p=>p.score).filter((s):s is number=>s!==null);
    for(const v of scores) buckets[v>=85?0:v>=70?1:v>=50?2:v>=30?3:4]++;
    let additiveTotal=0;
    let analyzedProducts=0;
    for(let i=0;i<history.length;i+=4) {
      const batch=await Promise.allSettled(history.slice(i,i+4).map(p=>resolveProduct(p.barcode)));
      for(const result of batch) {
        if(result.status!=="fulfilled" || !result.value) continue;
        additiveTotal+=(result.value.product.additives || []).length;
        analyzedProducts++;
      }
    }
    const stats:ScanStatistics={totalScans:history.length,
      avgScore:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,
      additiveTotal,buckets,analyzedProducts,source:"ingr"};
    return NextResponse.json({...stats,warning});
  } catch {return NextResponse.json({error:"İstatistikler yüklenemedi."},{status:502});}
}
