"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Home, Bookmark, UserRound, ScanLine, ArrowLeft, Info, X, FlaskConical, Leaf, AlertTriangle, Check, Droplets, Droplet, Wheat, Milk, ShieldAlert, Sparkles, Factory, CircleHelp, Package, Boxes, LeafyGreen } from "lucide-react";
import { riskColor } from "@/lib/additives";

export function Logo({size}:{size?:string}) {
  return <Link href="/" className={`logo-text ${size || ""}`} aria-label="ingr ana sayfa">ingr</Link>;
}
export function TopBar({showBack=false,showBookmark=false,bookmarked=false,onBookmark,title=false,right}:{showBack?:boolean;showBookmark?:boolean;bookmarked?:boolean;onBookmark?:()=>void;title?:boolean;right?:ReactNode}) {
  const router=useRouter();
  return <header className="app-header">
    <div>{showBack && <button className="header-action" onClick={()=>window.history.length>1?router.back():router.push("/")} aria-label="Geri dön"><ArrowLeft size={26} strokeWidth={1.7}/></button>}</div>
    <Logo/>
    <div className="flex justify-end">{right || (showBookmark
      ? <button className="header-action" onClick={onBookmark} aria-label={bookmarked?"Favorilerden kaldır":"Favorilerime kaydet"}><Bookmark size={25} strokeWidth={1.7} color={bookmarked?"var(--green)":"var(--muted)"} fill={bookmarked?"var(--green)":"none"}/></button>
      : !showBack && !title ? <Link href="/katkilar" className="header-action" aria-label="Katkı maddesi sözlüğü"><Bell size={26} strokeWidth={1.6}/></Link> : null)}</div>
  </header>;
}
export function SearchBar({value,onChange,onSubmit,autoFocus=false}:{value:string;onChange:(v:string)=>void;onSubmit?:()=>void;autoFocus?:boolean}) {
  return <form className="search-bar" onSubmit={e=>{e.preventDefault();onSubmit?.();}}>
    <Search size={23} strokeWidth={1.5}/>
    <input autoFocus={autoFocus} aria-label="Ürün veya marka ara" value={value} onChange={e=>onChange(e.target.value)} placeholder="Ürün veya marka ara…" enterKeyHint="search"/>
    {value ? <button type="button" onClick={()=>onChange("")} aria-label="Aramayı temizle"><X size={20}/></button> : <Link href="/tara" className="search-scan" aria-label="Barkod tara"><ScanLine size={23}/></Link>}
  </form>;
}
function HistoryGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" strokeDasharray="4 3" strokeLinecap="round"/><path d="M12 6v6l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function BottomNav({active}:{active:"home"|"history"|"scan"|"saved"|"profile"}) {
  const item=(key:string,href:string,label:string,icon:ReactNode)=><Link href={href} aria-label={label} aria-current={active===key?"page":undefined} className={`nav-item ${active===key?"active":""}`}>{icon}{active===key && <span className="nav-dot"/>}</Link>;
  return <nav className="bottom-nav" aria-label="Ana menü"><div className="bottom-nav-inner">
    {item("home","/","Ana sayfa",<Home/>)}
    {item("history","/gecmis","Son Taramalar",<HistoryGlyph/>)}
    <Link href="/tara" className="nav-scan" aria-label="Barkod tara"><ScanLine/></Link>
    {item("saved","/kaydedilenler","Listelerim",<Bookmark/>)}
    {item("profile","/profil","Profilim",<UserRound/>)}
  </div></nav>;
}
export function ScoreBar({score,onInfo}:{score:number;onInfo?:()=>void}) {
  const color=score>=85?"#17763e":score>=70?"#62b13d":score>=50?"#d9b613":score>=30?"#ed7608":"#d92917";
  return <div className="flex items-center gap-3"><div className="score-gradient relative h-[18px] flex-1 rounded-full">
    <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[9px] px-3 py-1 text-xl font-bold text-white" style={{left:`${Math.min(90,Math.max(10,score))}%`,background:color}}>{score}</span>
  </div>{onInfo && <button onClick={onInfo} aria-label="INGR Score açıklaması"><Info size={22} color="var(--muted)"/></button>}</div>;
}
function useEscape(close:()=>void) {
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape") close();};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[close]);
}
export function ScoreSheet({score,onClose}:{score:number;onClose:()=>void}) {
  useEscape(onClose);
  const items=[
    {title:"Temiz İçerik",low:85,high:100,color:"#17763e",desc:"İçerik ve besin değerleri değerlendirmesinde en yüksek puan aralığı."},
    {title:"Dengeli İçerik",low:70,high:84,color:"#7cce4f",desc:"İçerik ve besin değerleri açısından daha dengeli ürünlerin bulunduğu aralık."},
    {title:"Ortalama İçerik",low:50,high:69,color:"#ffe064",desc:"Bileşenleri, katkıları ve porsiyon miktarını dikkate alarak değerlendirin."},
    {title:"Düşük İçerik",low:30,high:49,color:"#ff9b46",desc:"İçerik ve besin değerleri değerlendirmesinde düşük puan alan ürünler."},
    {title:"Çok Düşük İçerik",low:0,high:29,color:"#ff504b",desc:"İçerik ve besin değerleri değerlendirmesinde en düşük puan aralığı."},
  ];
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="INGR Score" className="bottom-sheet no-scrollbar max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-[var(--bg)] p-6 pb-9" onClick={e=>e.stopPropagation()}>
      <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[var(--border)]"/>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">INGR Score</h2><button onClick={onClose} aria-label="Kapat"><X size={23}/></button></div>
      <p className="mb-5 text-sm leading-relaxed text-[var(--muted)]">ingr ürünlerinin puanı API’den değiştirilmeden gösterilir. Fotoğraf veya manuel girişle oluşturulan ürünlerde yerel, tahmini analiz kullanılır. Bu puan tıbbi tavsiye değildir.</p>
      <div className="space-y-3">{items.map(i=><div key={i.low} className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2"><span className="mr-1 h-7 w-7 rounded-lg" style={{background:i.color}}/><h3 className="text-lg font-bold">{i.title}</h3><span className="rounded-full px-2 py-0.5 text-sm font-semibold" style={{color:i.color,background:i.color+"15"}}>{i.low}–{i.high}</span>{score>=i.low&&score<=i.high&&<span className="ml-auto rounded-full px-3 py-1 text-[10px] font-bold text-black" style={{background:i.color}}>BU ÜRÜN</span>}</div>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{i.desc}</p>
      </div>)}</div>
    </section>
  </div>;
}
export function AdditiveDetailSheet({code,name,risk,func,description,onClose}:{code:string;name:string;risk:string;func:string;description:string;onClose:()=>void}) {
  useEscape(onClose);
  const rc=riskColor(risk);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={name} className="bottom-sheet no-scrollbar max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-[var(--bg)] p-6 pb-9" onClick={e=>e.stopPropagation()}>
      <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[var(--border)]"/>
      <div className={`mb-5 rounded-[22px] p-5 text-center ${rc.bg}`}><div className={`text-3xl font-bold ${rc.text}`}>{code}</div><div className={`mt-2 text-sm ${rc.text}`}>● {risk}</div></div>
      <h2 className="text-2xl font-semibold">{name}</h2><p className="mt-1 text-sm font-medium text-[var(--green)]">{func}</p>
      <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">{description}</p>
      <button onClick={onClose} className="primary-btn mt-6">Kapat</button>
    </section>
  </div>;
}
export function NoteIcon({icon,className="h-6 w-6"}:{icon:string;className?:string}) {
  switch(icon) {
    case "help":return <CircleHelp className={className}/>;
    case "sweet":return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m8 3 9 3-3 9-9-3Z"/><circle cx="6" cy="18" r="1.4" fill="currentColor"/><circle cx="10" cy="20" r="1.4" fill="currentColor"/><circle cx="14" cy="18" r="1.4" fill="currentColor"/></svg>;
    case "sugar":case "candy":return <Boxes className={className}/>;
    case "flask":return <FlaskConical className={className}/>;
    case "flask-filled":return <FlaskConical className={className} fill="currentColor" fillOpacity={.25}/>;
    case "leaf":return <Leaf className={className}/>;
    case "noadditives":return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M9 5v5l-3 7a1 1 0 0 0 1 2h10a1 1 0 0 0 1-2l-3-7V5M8 5h8M5 5l14 14"/></svg>;
    case "warn":return <AlertTriangle className={className}/>;
    case "check":return <Check className={className}/>;
    case "droplet":case "palm":return <Droplet className={className}/>;
    case "salt":case "fat":return <Droplets className={className}/>;
    case "box":return <Package className={className}/>;
    case "wheat":return <Wheat className={className}/>;
    case "factory":return <Factory className={className}/>;
    case "shield":return <ShieldAlert className={className}/>;
    case "color":case "aroma":case "flavor":return <Sparkles className={className}/>;
    case "milk":return <Milk className={className}/>;
    default:return <Info className={className}/>;
  }
}
export function noteStyle(sev:string):{bg:string;text:string} {
  switch(sev) {
    case "yesil":return {bg:"bg-[#1a2b0e]",text:"text-[#7cce4f]"};
    case "sari":return {bg:"bg-[#30270b]",text:"text-[#ffe064]"};
    case "turuncu":return {bg:"bg-[#38220e]",text:"text-[#ff9b46]"};
    case "kirmizi":return {bg:"bg-[#391610]",text:"text-[#ff504b]"};
    case "mavi":return {bg:"bg-[#182936]",text:"text-[#7db8e8]"};
    default:return {bg:"bg-[var(--card)]",text:"text-[var(--muted)]"};
  }
}
export function ProductImage({imageUrl,name,size="md",className}:{imageUrl?:string|null;name:string;size?:"sm"|"md"|"lg";className?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[imageUrl]);
  const dimensions=className || (size==="lg"?"h-44 w-44":size==="sm"?"h-36 w-full":"h-36 w-36");
  return <div className={`product-image ${dimensions}`}>
    {imageUrl && !failed ? <img src={imageUrl} alt={name} loading="lazy" onError={()=>setFailed(true)}/> : <Package size={38} strokeWidth={1.2} color="var(--subtle)" aria-label="Ürün görseli bulunmuyor"/>}
  </div>;
}
export function LoadingCard(){return <div className="shimmer h-40 rounded-[22px]"/>;}
