"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, ScanLine, UserRound } from "lucide-react";
import { TopBar, SearchBar, BottomNav, AdditiveDetailSheet } from "@/components/ui";
import { ProductTile } from "@/components/product-cards";
import { riskColor } from "@/lib/additives";
import type { DailyTip, ProductCardData, ScanStatistics } from "@/lib/models";

export default function HomePage() {
  const [query,setQuery]=useState("");
  const [stats,setStats]=useState<ScanStatistics | null>(null);
  const [tip,setTip]=useState<DailyTip | null>(null);
  const [tipLoading,setTipLoading]=useState(true);
  const [tipError,setTipError]=useState<string | null>(null);
  const [products,setProducts]=useState<ProductCardData[]>([]);
  const [loading,setLoading]=useState(true);
  const [recentError,setRecentError]=useState<string | null>(null);
  const [showTip,setShowTip]=useState(false);

  async function loadRecent() {
    setLoading(true);setRecentError(null);
    try {
      const res=await fetch("/api/latest?page=0&count=50");const d=await res.json();
      if(!res.ok) throw new Error(d.error || "Yeni eklenenler alınamadı.");
      setProducts(d.products || []);
    } catch(e) {setRecentError(e instanceof Error ? e.message : "Bağlantı hatası.");}
    finally {setLoading(false);}
  }
  async function loadTip() {
    setTipLoading(true);setTipError(null);
    try {
      const res=await fetch("/api/tip");const d=await res.json();
      if(!res.ok) throw new Error(d.error || "Günün ipucu alınamadı.");
      setTip(d.tip);
    } catch(e) {setTipError(e instanceof Error ? e.message : "Bağlantı hatası.");}
    finally {setTipLoading(false);}
  }
  useEffect(()=>{
    loadRecent();loadTip();
    fetch("/api/stats").then(r=>r.ok?r.json():null).then(d=>d&&setStats(d)).catch(()=>{});
  },[]);
  const buckets=stats?.buckets || [0,0,0,0,0];
  const max=Math.max(...buckets,1);
  const colors=["#17763e","#6ab73b","#f0d125","#eb7905","#d92816"];
  const rc=tip?riskColor(tip.risk):null;
  function search() {
    const q=query.trim();
    if(/^\d{4,14}$/.test(q)) window.location.href=`/urun/${q}`;
    else if(q.length>=2) window.location.href=`/arama?q=${encodeURIComponent(q)}`;
  }

  return <main className="app-page">
    <TopBar/>
    <SearchBar value={query} onChange={setQuery} onSubmit={search}/>
    <section className="home-greeting">
      <div><h1>Merhaba, fatih</h1><p>Taradığın ürünlerin özeti, günün ipucu ve yeni eklenen ürünler burada!</p></div>
      <Link href="/profil" className="avatar" aria-label="Profilimi aç"><UserRound size={44} strokeWidth={1.3}/></Link>
    </section>
    <section className="stats-grid" aria-label="Tarama özeti">
      <Link href="/skor" className="stat-card">
        <div className="score-bars" aria-label="Skor dağılımı">{buckets.map((v,i)=><span key={i} style={{height:`${Math.max(12,Math.round(v/max*54))}px`,background:colors[i]}}/>)}</div>
        <strong className="stat-value">{stats?.avgScore ?? "—"}</strong><span className="stat-label">ORTALAMA INGR<br/>SCORE</span>
      </Link>
      <Link href="/gecmis" className="stat-card">
        <span className="stat-icon" style={{background:"var(--green)"}}><ScanLine/></span>
        <strong className="stat-value">{stats?.totalScans ?? "—"}</strong><span className="stat-label">ÜRÜN TARANDI</span>
      </Link>
      <Link href="/katkilar" className="stat-card">
        <span className="stat-icon" style={{background:"var(--red)"}}><FlaskConical/></span>
        <strong className="stat-value">{stats?stats.additiveTotal:"—"}</strong><span className="stat-label">KATKI MADDESİ<br/>TESPİT EDİLDİ</span>
      </Link>
    </section>

    <div className="section-heading"><h2>Günün İpucu</h2></div>
    {tipLoading?<div className="shimmer mx-7 h-36 rounded-[23px]"/>:tip && rc?<section className="tip-card">
      <button onClick={()=>setShowTip(true)} className={`tip-code ${rc.bg} ${rc.text}`} aria-label={`${tip.code} ${tip.name} detayları`}>
        <strong>{tip.code}</strong><small><span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`}/>{tip.risk}</small>
      </button>
      <div className="min-w-0"><h3>{tip.name}</h3><p>{tip.description} <button className="tip-detail" onClick={()=>setShowTip(true)}>Detayı gör &gt;</button></p></div>
    </section>:<div className="page-notice">{tipError || "Bugün için mesaj bulunmuyor."}<button onClick={loadTip} className="ml-2 font-semibold underline">Tekrar dene</button></div>}

    <div className="section-heading"><h2>Yeni Eklenenler</h2><Link href="/yeni">Tümünü Gör</Link></div>
    {recentError?<div className="page-notice">{recentError}<button onClick={loadRecent} className="ml-2 font-semibold underline">Tekrar dene</button></div>:<div className="product-carousel no-scrollbar" aria-label="ingr veritabanına son eklenen 50 ürün">
      {loading?[0,1,2].map(i=><div key={i} className="shimmer h-[322px] w-[166px] shrink-0 rounded-[18px]"/>):products.map(p=><ProductTile key={p.barcode} product={p}/>)}
      {!loading && products.length===0 && <p className="text-sm text-[var(--muted)]">Yeni ürün bulunmuyor.</p>}
    </div>}
    <BottomNav active="home"/>
    {showTip && tip && <AdditiveDetailSheet code={tip.code} name={tip.name} risk={tip.risk} func={tip.func} description={tip.description} onClose={()=>setShowTip(false)}/>}
  </main>;
}
