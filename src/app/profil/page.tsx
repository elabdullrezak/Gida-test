"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FlaskConical, History, Bookmark, ScanLine, Award, UserRound, Clock3, KeyRound } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";
import type { ScanStatistics } from "@/lib/models";

export default function ProfilePage() {
  const [stats,setStats]=useState<ScanStatistics|null>(null);
  useEffect(()=>{fetch("/api/stats").then(r=>r.ok?r.json():null).then(d=>d&&setStats(d)).catch(()=>{});},[]);
  const menu=[
    {icon:History,title:"Son Taramalar",desc:"ingr hesabındaki ve bu uygulamadaki taramalar",href:"/gecmis"},
    {icon:Bookmark,title:"Listelerim",desc:"Favoriler, alışveriş sepeti ve kendi listelerin",href:"/kaydedilenler"},
    {icon:Clock3,title:"Yeni Eklenenler",desc:"ingr veritabanına eklenen ilk 50 ürün",href:"/yeni"},
    {icon:KeyRound,title:"API Bağlantısı",desc:"x-user-token süresi dolarsa yenisini gir",href:"/hesap/api"},
    {icon:FlaskConical,title:"Katkı Maddesi Sözlüğü",desc:"E kodları ve açıklamaları",href:"/katkilar"},
    {icon:Award,title:"INGR Score",desc:"Puan aralıkları hakkında",href:"/skor"},
  ];
  return <main className="app-page"><TopBar showBack/>
    <section className="mx-7 mt-3 text-center"><div className="avatar mx-auto h-24 w-24"><UserRound size={55} strokeWidth={1.2}/></div><h1 className="mt-3 text-3xl font-semibold">fatih</h1><p className="mt-1 text-sm text-[var(--muted)]">İçeriğini bil, bilinçli seç.</p></section>
    <div className="stats-grid">{[{v:stats?.totalScans,t:"ÜRÜN TARANDI"},{v:stats?.avgScore,t:"ORTALAMA SCORE"},{v:stats?.additiveTotal,t:"KATKI MADDESİ"}].map(x=><div key={x.t} className="stat-card !min-h-24 !justify-center"><strong className="stat-value !text-2xl">{x.v ?? "—"}</strong><span className="stat-label">{x.t}</span></div>)}</div>
    <div className="mx-7 mt-6 space-y-2">{menu.map(m=><Link key={m.href} href={m.href} className="flex items-center gap-3 rounded-[22px] bg-[var(--card)] p-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--card2)] text-[var(--green)]"><m.icon size={23}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">{m.title}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{m.desc}</span></span><ChevronRight size={18} color="var(--muted)"/></Link>)}</div>
    <div className="mx-7 mt-6"><Link href="/tara" className="primary-btn"><ScanLine size={21}/>Yeni Ürün Tara</Link><p className="mt-4 text-center text-xs leading-6 text-[var(--subtle)]">Ürün verileri: ingr.tech<br/>Oluşturduğun listeler bu uygulamanın veritabanında saklanır.</p></div>
    <BottomNav active="profile"/>
  </main>;
}
