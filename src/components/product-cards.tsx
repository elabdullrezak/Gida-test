"use client";
import Link from "next/link";
import { Bookmark, Clock3, Loader2 } from "lucide-react";
import { NoteIcon, ProductImage } from "./ui";
import type { ProductBadge, ProductCardData } from "@/lib/models";

export function relativeTime(date?:string | null):string {
  if(!date) return "";
  const timestamp=new Date(date).getTime();
  if(!Number.isFinite(timestamp)) return "";
  const minutes=Math.max(0,Math.floor((Date.now()-timestamp)/60000));
  if(minutes<1) return "Az önce";
  if(minutes<60) return `${minutes} dakika önce`;
  const hours=Math.floor(minutes/60);
  if(hours<24) return `${hours} saat önce`;
  const days=Math.floor(hours/24);
  if(days<7) return `${days} gün önce`;
  return new Date(date).toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
}
export function badgeColors(sev:string):{background:string;color:string} {
  if(sev==="kirmizi") return {background:"#391610",color:"#ff504b"};
  if(sev==="turuncu") return {background:"#38220e",color:"#ff9b46"};
  if(sev==="sari") return {background:"#30270b",color:"#ffe064"};
  if(sev==="mavi") return {background:"#182936",color:"#7db8e8"};
  return {background:"#1a2b0e",color:"#7cce4f"};
}
export function ProductBadges({badges,total,limit=2}:{badges:ProductBadge[];total?:number;limit?:number}) {
  const shown=badges.slice(0,limit);
  const remaining=Math.max(0,(total ?? badges.length)-shown.length);
  return <div className="product-badges">
    {shown.map((b,i)=><span key={i} title={b.title} aria-label={b.title} className="product-badge" style={badgeColors(b.severity)}><NoteIcon icon={b.icon || "info"}/></span>)}
    {remaining>0 && <span className="product-badge more" title={`${remaining} not daha`}>+{remaining}</span>}
  </div>;
}
export function ProductTile({product,showScore=false}:{product:ProductCardData;showScore?:boolean}) {
  const time=relativeTime(product.editedDate || product.scanDate || product.createdAt);
  return <Link href={`/urun/${encodeURIComponent(product.barcode)}`} className="product-tile">
    <ProductImage imageUrl={product.imageUrl} name={product.name} className="tile-image"/>
    <div className="product-tile-content">
      <div className="product-brand">{product.brand || "Marka belirtilmemiş"}</div>
      <h3>{product.name}</h3>
      <ProductBadges badges={product.badges || []} total={product.badgeCount} limit={2}/>
      {showScore && <span className="mt-2 inline-block rounded-lg px-2.5 py-1 text-sm font-bold" style={{background:scoreColor(product.score)+"25",color:scoreColor(product.score)}}>{product.score ?? "—"} <span className="text-xs opacity-60">/ 100</span></span>}
      {time && <div className="time-label"><Clock3/>{time}</div>}
    </div>
  </Link>;
}
export function ProductHistoryRow({product,onSave,saving=false,saved,action}:{product:ProductCardData;onSave?:()=>void;saving?:boolean;saved?:boolean;action?:React.ReactNode}) {
  const time=relativeTime(product.scanDate || product.createdAt || product.editedDate);
  return <div className="product-row">
    <Link href={`/urun/${encodeURIComponent(product.barcode)}`} className="product-row-main">
      <ProductImage imageUrl={product.imageUrl} name={product.name} className="history-image"/>
      <div className="product-row-copy">
        <div className="product-brand">{product.brand || "Marka belirtilmemiş"}</div>
        <h3>{product.name}</h3>
        <ProductBadges badges={product.badges || []} total={product.badgeCount} limit={4}/>
        {time && <div className="time-label"><Clock3/>{time}</div>}
      </div>
    </Link>
    {action || (onSave && <button disabled={saving} onClick={onSave} className={`product-save ${saved?"saved":""}`} aria-label={saved?"Favorilerden kaldır":"Favorilerime kaydet"}>
      {saving?<Loader2 className="animate-spin"/>:<Bookmark fill={saved?"currentColor":"none"}/>}
    </button>)}
  </div>;
}
export function scoreColor(s:number | null) {
  return s==null?"#969d92":s>=85?"#32d48a":s>=70?"#7cce4f":s>=50?"#ffe064":s>=30?"#ff9b46":"#ff504b";
}
