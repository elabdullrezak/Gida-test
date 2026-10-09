"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, History, Loader2 } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";
import { ProductHistoryRow } from "@/components/product-cards";
import type { ProductCardData } from "@/lib/models";

export default function HistoryPage() {
  const [items,setItems]=useState<ProductCardData[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  const [warning,setWarning]=useState<string | null>(null);
  const [page,setPage]=useState(0);
  const [more,setMore]=useState(false);
  const [saving,setSaving]=useState<string | null>(null);
  async function load(index:number) {
    setLoading(true);setError(null);
    try {
      const r=await fetch(`/api/product-scans?page=${index}&count=10`);const d=await r.json();
      if(!r.ok) throw new Error(d.error || "Son taramalar alınamadı.");
      const rows:ProductCardData[]=d.history || [];
      setItems(prev=>{
        if(index===0) return rows;
        const seen=new Set(prev.map(p=>p.barcode));
        return [...prev,...rows.filter(p=>!seen.has(p.barcode))];
      });
      setPage(index);setMore(!!d.pagination?.hasMore);setWarning(d.warning || null);
    } catch(e) {setError(e instanceof Error?e.message:"Bağlantı hatası.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{load(0);},[]);
  async function toggle(p:ProductCardData) {
    if(saving) return;
    setSaving(p.barcode);setError(null);
    try {
      const r=await fetch(p.isSaved?`/api/bookmarks?barcode=${encodeURIComponent(p.barcode)}`:"/api/bookmarks",{
        method:p.isSaved?"DELETE":"POST",headers:{"Content-Type":"application/json"},
        ...(p.isSaved?{}:{body:JSON.stringify({barcode:p.barcode})}),
      });
      const d=await r.json();if(!r.ok) throw new Error(d.error);
      setItems(prev=>prev.map(i=>i.barcode===p.barcode?{...i,isSaved:!p.isSaved}:i));
    } catch(e) {setError(e instanceof Error?e.message:"Kaydedilemedi.");}
    finally {setSaving(null);}
  }
  return <main className="app-page">
    <TopBar showBack/>
    <section className="page-heading"><h1>Son Taramalar</h1><p>Taradığın ürünler tarih sırasıyla listeleniyor.</p></section>
    {warning && <div className="page-notice">{warning} Bu uygulamada yapılan taramalar gösteriliyor.</div>}
    {error && <div className="page-notice">{error}<button onClick={()=>load(page)} className="ml-2 underline">Tekrar dene</button></div>}
    <div className="product-history-list">
      {items.map(p=><ProductHistoryRow key={p.barcode} product={p} saved={p.isSaved} saving={saving===p.barcode} onSave={()=>toggle(p)}/>)}
      {loading && items.length===0 && [0,1,2,3].map(i=><div key={i} className="shimmer h-[172px] rounded-[22px]"/>)}
    </div>
    {!loading && items.length===0 && !error && <section className="empty-list"><div className="empty-icon"><History size={34}/></div><h2>Henüz tarama yok</h2><p>Bir ürünün barkodunu tara.<br/>İçeriğini birlikte keşfedelim.</p><Link href="/tara" className="primary-btn"><ScanLine size={22}/>Yeni Ürün Tara</Link></section>}
    {loading && items.length>0 && <div className="loader-row"><Loader2 className="animate-spin"/></div>}
    {more && !loading && <div className="mx-7 mt-5"><button onClick={()=>load(page+10)} className="outline-btn w-full">Daha Fazla Yükle</button></div>}
    <BottomNav active="history"/>
  </main>;
}
