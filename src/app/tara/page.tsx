"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2, Search, History, PlusCircle } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";
import BarcodeScanner from "@/components/barcode-scanner";

export default function ScanPage() {
  const router=useRouter();
  const [barcode,setBarcode]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string | null>(null);
  const [missing,setMissing]=useState<string | null>(null);
  const inFlight=useRef(false);
  async function find(raw=barcode) {
    const code=raw.trim();
    if(!/^\d{4,14}$/.test(code)) {setError("4–14 haneli bir barkod numarası girin.");return;}
    if(inFlight.current) return;
    inFlight.current=true;setBarcode(code);setLoading(true);setError(null);setMissing(null);
    try {
      const r=await fetch("/api/product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({barcode:code})});
      const d=await r.json();
      if(r.status===404) {setMissing(code);return;}
      if(!r.ok) throw new Error(d.error || "Ürün alınamadı.");
      router.push(`/urun/${encodeURIComponent(d.product.barcode)}`);
    } catch(e) {setError(e instanceof Error?e.message:"Bağlantı hatası.");}
    finally {inFlight.current=false;setLoading(false);}
  }
  function search() {
    const q=name.trim();
    if(q.length<2) {setError("En az 2 karakter yazın.");return;}
    router.push(`/arama?q=${encodeURIComponent(q)}`);
  }
  return <main className="app-page">
    <TopBar showBack/>
    <section className="page-heading"><h1>Barkod Tara</h1><p>Kamerayla barkodu okut veya numarasını yaz.<br/>Ürün bilgileri yalnızca ingr’den alınır.</p></section>
    <BarcodeScanner onDetected={code=>find(code)} disabled={loading}/>
    <form onSubmit={e=>{e.preventDefault();find();}} className="mx-7 mt-4 rounded-[24px] bg-[var(--card)] p-5">
      <label htmlFor="barcode" className="text-xs font-medium tracking-wider text-[var(--muted)]">BARKOD NUMARASI</label>
      <input id="barcode" inputMode="numeric" enterKeyHint="search" value={barcode} onChange={e=>{setBarcode(e.target.value.replace(/\D/g,""));setMissing(null);setError(null);}} maxLength={14} placeholder="Örn. 80052760" className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 font-mono text-lg tracking-wide"/>
      <button disabled={loading} className="primary-btn mt-3">{loading?<Loader2 className="animate-spin" size={21}/>:<ScanLine size={21}/>} {loading?"ingr’de aranıyor…":"Ürünü Bul"}</button>
      {missing && <div className="mt-4 rounded-2xl bg-[#30270b] p-4 text-sm leading-relaxed text-[var(--yellow)]"><p>Bu barkod ingr veritabanında bulunamadı.</p><Link href={`/urun/${missing}/icerik?new=1`} className="mt-3 flex items-center gap-2 font-semibold"><PlusCircle size={18}/>Etiket fotoğrafı veya manuel içerik ekle</Link></div>}
      {error && <p role="alert" className="mt-3 text-sm text-[var(--red)]">{error}</p>}
    </form>
    <form onSubmit={e=>{e.preventDefault();search();}} className="mx-7 mt-4 rounded-[24px] bg-[var(--card)] p-5">
      <label htmlFor="name-search" className="text-xs font-medium tracking-wider text-[var(--muted)]">ÜRÜN VEYA MARKA İLE ARA</label>
      <div className="mt-2 flex items-center gap-2"><input id="name-search" value={name} onChange={e=>setName(e.target.value)} placeholder="Örn. Kinder Bueno" className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 text-base"/><button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card2)] text-[var(--green)]" aria-label="ingr’de ara"><Search size={22}/></button></div>
    </form>
    <Link href="/gecmis" className="mx-7 mt-5 flex items-center justify-center gap-2 text-sm text-[var(--muted)]"><History size={18}/>Son taramalarını gör</Link>
    <BottomNav active="scan"/>
  </main>;
}
