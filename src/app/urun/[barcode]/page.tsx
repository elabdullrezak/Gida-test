"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Info, ChevronRight, Loader2, PencilLine, Camera, X, Check } from "lucide-react";
import { TopBar, BottomNav, ProductImage, ScoreBar, ScoreSheet, NoteIcon, noteStyle, AdditiveDetailSheet } from "@/components/ui";
import { ProductTile, badgeColors, scoreColor } from "@/components/product-cards";
import { riskColor } from "@/lib/additives";
import type { ProductCardData } from "@/lib/models";

interface Additive {code:string;name:string;risk:string;func:string;description:string}
interface Note {title:string;description:string;severity:string;icon:string;source?:string|null}
interface NutTab {title:string;values:{title:string;value:number;unit:string}[]}
interface Product {
  id:string;barcode:string;name:string;brand:string|null;imageUrl:string|null;quantity:string|null;
  score:number;scoreLabel:string;source:string;manufacturer:string|null;nutriscore:string|null;
  ingredients:{name:string;risk:string}[];ingredientsText:string|null;
  additivesDetailed:Additive[];notes:Note[];nutritionTabs:NutTab[];
  nutriments:Record<string,number|null>;allergens:string[];
}
interface Recommendation {title:string;description:string|null;emptyMessage:string|null;items:ProductCardData[]}

export default function ProductPage({params}:{params:Promise<{barcode:string}>}) {
  const {barcode}=use(params);
  const [product,setProduct]=useState<Product|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveMessage,setSaveMessage]=useState<string|null>(null);
  const [scoreOpen,setScoreOpen]=useState(false);
  const [selected,setSelected]=useState<Additive|null>(null);
  const [noteOpen,setNoteOpen]=useState<number|null>(null);
  const [allNotes,setAllNotes]=useState(false);
  const [nutritionIndex,setNutritionIndex]=useState(0);
  const [recommendations,setRecommendations]=useState<Recommendation[]>([]);
  const [recLoading,setRecLoading]=useState(false);
  const [recError,setRecError]=useState<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError(null);setProduct(null);setNoteOpen(null);setAllNotes(false);setNutritionIndex(0);
    const code=decodeURIComponent(barcode);
    const isId=/^[a-f0-9-]{36}$/i.test(code);
    fetch(`/api/product?${isId?"id":"barcode"}=${encodeURIComponent(code)}`,{signal:controller.signal,cache:"no-store"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d.product as Product;})
      .then(p=>{
        setProduct(p);
        fetch("/api/bookmarks",{signal:controller.signal}).then(r=>r.json()).then(d=>setSaved((d.bookmarks||[]).some((b:{barcode:string})=>b.barcode===p.barcode))).catch(()=>{});
        if(/^\d{4,14}$/.test(p.barcode)) {
          setRecLoading(true);setRecError(null);
          fetch(`/api/recommendations?barcode=${encodeURIComponent(p.barcode)}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setRecommendations(d.sections||[]);}).catch(e=>{if(!controller.signal.aborted)setRecError(e.message);}).finally(()=>{if(!controller.signal.aborted)setRecLoading(false);});
        } else setRecommendations([]);
      }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[barcode]);
  async function toggleSave() {
    if(!product || saving)return;
    setSaving(true);setSaveMessage(null);
    try {
      const r=await fetch(saved?`/api/bookmarks?barcode=${encodeURIComponent(product.barcode)}`:"/api/bookmarks",{method:saved?"DELETE":"POST",headers:{"Content-Type":"application/json"},...(saved?{}:{body:JSON.stringify({barcode:product.barcode})})});
      const d=await r.json();if(!r.ok)throw new Error(d.error);
      setSaved(!saved);setSaveMessage(saved?"Favorilerden kaldırıldı.":"Favorilerime eklendi.");
    } catch(e){setSaveMessage(e instanceof Error?e.message:"Ürün kaydedilemedi.");}
    finally{setSaving(false);}
  }
  if(loading)return <main className="app-page"><TopBar showBack/><div className="loader-row flex-col gap-4"><Loader2 className="animate-spin" size={36}/><p className="text-sm text-[var(--muted)]">Ürün ingr veritabanından alınıyor…</p></div><div className="shimmer mx-7 h-40 rounded-[22px]"/><BottomNav active="home"/></main>;
  if(!product)return <main className="app-page"><TopBar showBack/><section className="page-heading"><h1>Ürün alınamadı</h1><p>{error}</p></section><div className="mx-7"><Link className="primary-btn" href={`/urun/${encodeURIComponent(barcode)}/icerik?new=1`}><Camera size={20}/>İçerik Ekle</Link><Link className="outline-btn mt-3" href="/tara">Farklı Barkod Tara</Link></div><BottomNav active="home"/></main>;
  const contentUrl=`/urun/${encodeURIComponent(product.barcode)}/icerik`;
  const notes=product.notes || [];
  const ingredients=product.ingredients || [];
  const additives=product.additivesDetailed || [];
  const format=(n:number)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(n);
  const tabs: NutTab[]=(product.nutritionTabs || []).length?product.nutritionTabs:[{title:"100 g için",values:[
    {title:"Enerji",key:"energyKcal",unit:"kcal"},{title:"Yağ",key:"fat",unit:"g"},{title:"Doymuş Yağ",key:"saturatedFat",unit:"g"},{title:"Karbonhidrat",key:"carbs",unit:"g"},{title:"Şeker",key:"sugars",unit:"g"},{title:"Lif",key:"fiber",unit:"g"},{title:"Protein",key:"protein",unit:"g"},{title:"Tuz",key:"salt",unit:"g"},
  ].filter(v=>product.nutriments?.[v.key]!=null).map(v=>({title:v.title,value:product.nutriments[v.key] as number,unit:v.unit}))}];
  const nutrition=tabs[Math.min(nutritionIndex,tabs.length-1)];
  return <main className="app-page">
    <TopBar showBack showBookmark bookmarked={saved} onBookmark={toggleSave}/>
    <section className="mx-7 mt-2 flex items-center gap-4">
      <ProductImage imageUrl={product.imageUrl} name={product.name} className="h-36 w-[125px] rounded-[19px] p-1.5"/>
      <div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><span className="product-brand">{product.brand || "Marka belirtilmemiş"}</span><Info size={16} color="var(--muted)"/></div><h1 className="text-xl font-semibold leading-snug tracking-[-.4px]">{product.name}</h1><div className="mt-5"><ScoreBar score={product.score} onInfo={()=>setScoreOpen(true)}/><p className="mt-2 text-[11px] font-medium" style={{color:scoreColor(product.score)}}>{product.scoreLabel}</p></div></div>
    </section>
    {saveMessage && <div className="mx-7 mt-4 flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-3 text-sm text-[var(--green)]"><Check size={17}/>{saveMessage}<button className="ml-auto" onClick={()=>setSaveMessage(null)} aria-label="Mesajı kapat"><X size={17}/></button></div>}
    {product.source!=="ingr" && <p className="mx-7 mt-3 text-xs leading-5 text-[var(--muted)]">Kullanıcı içeriği · Bu ürünün puanı yerel, tahmini analizden hesaplanmıştır.</p>}
    {ingredients.length===0 && <div className="mx-7 mt-4 rounded-[22px] border border-dashed border-[var(--green)] bg-[var(--card)] p-5"><h2 className="mb-2 font-semibold">İçerik listesi eksik</h2><p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">Etiketin İçindekiler bölümünü çekerek veya yazarak tamamlayabilirsin.</p><div className="grid grid-cols-2 gap-2"><Link href={contentUrl+"?tab=photo"} className="outline-btn text-[var(--green)]"><Camera size={17}/>Fotoğraf Çek</Link><Link href={contentUrl+"?tab=manual"} className="outline-btn"><PencilLine size={17}/>Manuel Gir</Link></div></div>}

    <div className="section-heading"><h2>Üründen Notlar</h2></div>
    <div className="mx-7 space-y-2.5">{(allNotes?notes:notes.slice(0,3)).map((n,i)=>{
      const st=noteStyle(n.severity);return <div key={i} className={`overflow-hidden rounded-[22px] ${st.bg}`}><button onClick={()=>setNoteOpen(noteOpen===i?null:i)} className={`flex w-full items-center gap-3 px-4 py-4 text-left ${st.text}`}><NoteIcon icon={n.icon} className="h-6 w-6 shrink-0"/><span className="flex-1 text-base font-semibold leading-snug">{n.title}</span><ChevronRight size={23} className={`shrink-0 transition-transform ${noteOpen===i?"rotate-90":""}`}/></button>{noteOpen===i && <div className="px-5 pb-5"><p className="text-sm leading-7 text-[var(--white)]">{n.description}</p>{n.source && <details className="mt-3"><summary className="cursor-pointer text-xs text-[var(--muted)]">Bilimsel kaynaklar</summary><div className="mt-2 space-y-2">{n.source.split("\n").filter(Boolean).map((line,k)=>{const url=line.match(/https?:\/\/\S+/)?.[0];return <p key={k} className="break-words text-xs leading-5 text-[var(--muted)]">{line.replace(/https?:\/\/\S+/,"")} {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--green)] underline">Kaynağı aç ↗</a>}</p>;})}</div></details>}</div>}</div>;
    })}
    {notes.length===0 && <p className="rounded-[22px] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">{ingredients.length?"ingr bu ürün için ek bir not paylaşmamış.":"İçerik eksik olduğu için not analizi tamamlanamadı."}</p>}
    {notes.length>3 && <button onClick={()=>setAllNotes(!allNotes)} className="w-full rounded-[22px] bg-[var(--card)] py-4 text-base font-semibold text-[var(--green)]">{allNotes?"Daha Az Göster":`+${notes.length-3} Üründen Not Daha`}</button>}</div>

    <div className="section-heading"><h2>Katkı Maddeleri ({additives.length})</h2></div>
    {additives.length?<div className="no-scrollbar flex gap-3 overflow-x-auto px-7">{additives.map((a,i)=>{const c=riskColor(a.risk);return <button key={i} onClick={()=>setSelected(a)} className={`flex h-[96px] w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[21px] ${c.bg} ${c.text}`}><strong className="text-xl font-semibold">{a.code}</strong><span className="flex items-center gap-1.5 text-xs"><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`}/>{a.risk}</span></button>;})}</div>:<p className="mx-7 rounded-[22px] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">{ingredients.length?"ingr verilerine göre katkı maddesi bulunmuyor.":"İçerik eksik — katkı analizi yapılamadı."}</p>}

    <div className="section-heading"><h2>Bileşenler ({ingredients.length})</h2><Link href={contentUrl+"?tab=manual"} className="flex items-center gap-1.5"><PencilLine size={14}/>Düzenle</Link></div>
    <div className="mx-7 flex flex-wrap gap-2">{ingredients.map((i,k)=><span key={k} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold" style={badgeColors(i.risk)}><span className="h-2 w-2 rounded-full bg-current"/>{i.name}</span>)}</div>
    {product.source!=="ingr" && product.ingredientsText && <details className="mx-7 mt-3 rounded-2xl bg-[var(--card)] p-4 text-xs text-[var(--muted)]"><summary>Girilen içerik metni</summary><p className="mt-2 leading-6">{product.ingredientsText}</p></details>}
    {(product.allergens || []).length>0 && <><div className="section-heading"><h2>Alerjenler</h2></div><div className="mx-7 flex flex-wrap gap-2">{product.allergens.map(a=><span key={a} className="rounded-full bg-[#391610] px-4 py-2 text-sm text-[var(--red)]">{a}</span>)}</div></>}

    <div className="section-heading"><h2>Besin Değerleri</h2></div>
    {nutrition?.values.length?<><div className="no-scrollbar mx-7 flex overflow-x-auto rounded-[22px] bg-[var(--card2)] p-1.5">{tabs.map((t,i)=><button key={i} onClick={()=>setNutritionIndex(i)} className={`shrink-0 rounded-[17px] px-4 py-3 text-[15px] ${nutritionIndex===i?"bg-[var(--green)] font-semibold text-[var(--bg)]":"text-[var(--muted)]"}`}>{t.title}</button>)}</div><div className="mx-7 mt-3 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)]">{nutrition.values.map((v,i)=><div key={i} className="flex justify-between gap-3 border-b border-[var(--border)] px-5 py-4 last:border-0"><span className={/doymuş|şeker|lif/i.test(v.title)?"pl-5 text-[var(--muted)]":""}>{v.title}</span><span className="font-medium">{format(v.value)} {v.unit}</span></div>)}</div></>:<Link href={contentUrl+"?tab=manual"} className="mx-7 block rounded-2xl bg-[var(--card)] p-5 text-sm text-[var(--muted)]">Besin değerleri bulunmuyor. Eklemek için dokun.</Link>}

    {product.source==="ingr" && <><div className="section-heading"><h2>Benzer Ürünler</h2></div>{recLoading?<div className="shimmer mx-7 h-56 rounded-[22px]"/>:recError?<p className="page-notice">{recError}</p>:recommendations.length===0?<p className="mx-7 text-sm text-[var(--muted)]">Bu ürün için henüz benzer ürün önerisi yok.</p>:recommendations.map((s,k)=><section key={k}>{s.title!=="Benzer Ürünler" && <h3 className="mx-7 mb-3 text-lg font-semibold">{s.title}</h3>}{s.description && <p className="mx-7 mb-4 text-xs leading-5 text-[var(--muted)]">{s.description}</p>}{s.items.length?<div className="product-carousel no-scrollbar">{s.items.map(p=><ProductTile key={p.barcode} product={p} showScore/>)}</div>:<p className="mx-7 text-sm text-[var(--muted)]">{s.emptyMessage || "Benzer ürün bulunamadı."}</p>}</section>)}</>}
    <div className="mx-7 mt-6 space-y-2 text-xs leading-5 text-[var(--subtle)]"><p>Barkod: {product.barcode} · {product.source==="ingr"?"ingr veritabanı":product.source==="ocr"?"Etiket fotoğrafı":"Manuel içerik"}</p>{product.manufacturer && <p>Üretici: {product.manufacturer}</p>}{product.nutriscore && <p>Nutri-Score: {product.nutriscore.toUpperCase()}</p>}</div>
    <BottomNav active="home"/>
    {scoreOpen && <ScoreSheet score={product.score} onClose={()=>setScoreOpen(false)}/>}
    {selected && <AdditiveDetailSheet {...selected} onClose={()=>setSelected(null)}/>}
  </main>;
}
