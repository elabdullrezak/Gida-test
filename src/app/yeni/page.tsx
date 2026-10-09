"use client";
import { useEffect, useState } from "react";
import { TopBar, BottomNav } from "@/components/ui";
import { ProductTile } from "@/components/product-cards";
import type { ProductCardData } from "@/lib/models";

export default function RecentPage() {
  const [items,setItems]=useState<ProductCardData[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  async function load() {
    setLoading(true);setError(null);
    try {
      const r=await fetch("/api/latest?page=0&count=50");const d=await r.json();
      if(!r.ok) throw new Error(d.error || "Yeni eklenenler alınamadı.");
      const unique=new Map<string,ProductCardData>();
      for(const p of d.products || []) unique.set(p.barcode,p);
      setItems([...unique.values()]);
    } catch(e) {setError(e instanceof Error?e.message:"Bağlantı hatası.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  return <main className="app-page">
    <TopBar showBack/>
    <section className="page-heading"><h1>Yeni Eklenenler</h1><p>ingr veritabanına son eklenen ilk 50 ürün.</p></section>
    {error && <div className="page-notice">{error}<button className="ml-2 underline" onClick={load}>Tekrar dene</button></div>}
    <div className="mx-7 grid grid-cols-2 gap-4 [&_.product-tile]:w-full [&_.product-image]:h-[180px]">
      {loading?[0,1,2,3].map(i=><div key={i} className="shimmer h-[315px] rounded-[18px]"/>):items.map(p=><ProductTile key={p.barcode} product={p} showScore/>)}
    </div>
    {!loading && !error && items.length===0 && <p className="mx-7 text-[var(--muted)]">Yeni ürün bulunmuyor.</p>}
    <BottomNav active="home"/>
  </main>;
}
