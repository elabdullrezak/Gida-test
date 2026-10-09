"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2, Plus, Bookmark, BookmarkPlus, MoreVertical, ScanLine, X, Loader2 } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";
import { ProductHistoryRow } from "@/components/product-cards";
import type { ProductCardData, ProductListInfo } from "@/lib/models";

export default function ListsPage() {
  const [lists,setLists]=useState<ProductListInfo[]>([{id:"favorites",name:"Favorilerim",icon:"heart",kind:"builtin",count:0},{id:"cart",name:"Sepetim",icon:"cart",kind:"builtin",count:0},{id:"disliked",name:"Beğenmediklerim",icon:"trash",kind:"builtin",count:0}]);
  const [active,setActive]=useState("favorites");
  const [items,setItems]=useState<ProductCardData[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string | null>(null);
  const [modal,setModal]=useState<"create"|"add"|"choose"|null>(null);
  const [name,setName]=useState("");
  const [barcode,setBarcode]=useState("");
  const [busy,setBusy]=useState(false);
  const [menu,setMenu]=useState(false);
  const selected=lists.find(l=>l.id===active) || lists[0];

  async function loadLists() {
    const r=await fetch("/api/lists");const d=await r.json();
    if(!r.ok) throw new Error(d.error);
    setLists(d.lists || []);
  }
  async function loadItems(id:string) {
    setLoading(true);setError(null);
    try {
      const r=await fetch(`/api/lists?list=${encodeURIComponent(id)}`);const d=await r.json();
      if(!r.ok) throw new Error(d.error);setItems(d.items || []);
    } catch(e) {setError(e instanceof Error?e.message:"Liste yüklenemedi.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{loadLists().catch(e=>setError(e.message));},[]);
  useEffect(()=>{loadItems(active);},[active]);
  async function create() {
    if(name.trim().length<2) {setError("Liste adına en az 2 karakter yazın.");return;}
    setBusy(true);setError(null);
    try {
      const r=await fetch("/api/lists",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",name:name.trim()})});
      const d=await r.json();if(!r.ok) throw new Error(d.error);
      await loadLists();setActive(d.list.id);setName("");setModal(null);
    } catch(e) {setError(e instanceof Error?e.message:"Liste oluşturulamadı.");}
    finally {setBusy(false);}
  }
  async function add(target=active) {
    if(!barcode) {setError("Bir barkod yazın.");return;}
    setBusy(true);setError(null);
    try {
      const r=await fetch("/api/lists",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listId:target,barcode})});
      const d=await r.json();if(!r.ok) throw new Error(d.error);
      await loadLists();if(target===active) await loadItems(active);setBarcode("");setModal(null);
    } catch(e) {setError(e instanceof Error?e.message:"Ürün eklenemedi.");}
    finally {setBusy(false);}
  }
  async function remove(code:string) {
    setBusy(true);setError(null);
    try {
      const r=await fetch(`/api/lists?listId=${encodeURIComponent(active)}&barcode=${encodeURIComponent(code)}`,{method:"DELETE"});
      const d=await r.json();if(!r.ok) throw new Error(d.error);
      setItems(p=>p.filter(i=>i.barcode!==code));await loadLists();
    } catch(e) {setError(e instanceof Error?e.message:"Ürün kaldırılamadı.");}
    finally {setBusy(false);}
  }
  async function deleteList() {
    setMenu(false);
    if(selected.kind!=="custom" || !window.confirm(`“${selected.name}” listesini silmek istiyor musun?`)) return;
    try {
      const r=await fetch(`/api/lists?listId=${encodeURIComponent(active)}`,{method:"DELETE"});const d=await r.json();
      if(!r.ok) throw new Error(d.error);setActive("favorites");await loadLists();
    } catch(e) {setError(e instanceof Error?e.message:"Liste silinemedi.");}
  }
  function open(which:"create"|"add"|"choose") {setModal(which);setError(null);setMenu(false);}

  return <main className="app-page">
    <TopBar showBack right={<div className="relative"><button className="header-action" aria-label="Liste seçenekleri" onClick={()=>setMenu(!menu)}><MoreVertical size={25}/></button>{menu && <div className="absolute right-0 top-12 z-40 w-48 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl"><button className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-[var(--card2)]" onClick={()=>open("add")}>Ürün ekle</button><button className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-[var(--card2)]" onClick={()=>open("create")}>Yeni liste oluştur</button>{selected.kind==="custom" && <button className="w-full rounded-xl px-3 py-3 text-left text-sm text-[var(--red)] hover:bg-[var(--card2)]" onClick={deleteList}>Listeyi sil</button>}</div>}</div>}/>
    <section className="page-heading"><h1>Listelerim</h1><p>Ürünlerini listeler halinde düzenleyebilirsin.</p></section>
    <div className="list-tabs-row">
      <div className="list-tabs no-scrollbar" role="tablist" aria-label="Ürün listeleri">{lists.map(l=><button key={l.id} role="tab" aria-selected={active===l.id} onClick={()=>{setActive(l.id);setMenu(false);}} className={`list-tab ${active===l.id?(l.id==="favorites"?"favorite-active":"active"):""}`}><ListIcon icon={l.icon}/>{l.name}</button>)}</div>
      <button className="list-plus" aria-label="Yeni liste oluştur" onClick={()=>open("create")}><Plus/></button>
    </div>
    {error && !modal && <div className="page-notice">{error}<button className="ml-2 underline" onClick={()=>loadItems(active)}>Tekrar dene</button></div>}
    {loading?<div className="shimmer mx-7 h-[354px] rounded-[24px]"/>:items.length===0?<section className="empty-list">
      <div className="empty-icon"><BookmarkPlus size={35} strokeWidth={1.7}/></div>
      <h2>{selected.name} henüz boş</h2>
      <p>{active==="favorites"?"Ürün detayındaki kaydet düğmesine dokunarak bu listeye ekleyebilirsin.":"Barkodla bir ürün ekleyerek bu listeyi oluşturmaya başlayabilirsin."}</p>
      {active==="favorites"?<Link className="primary-btn" href="/tara"><ScanLine size={22}/>Yeni Ürün Tara</Link>:<button className="primary-btn" onClick={()=>open("add")}><Plus size={22}/>Ürün Ekle</button>}
    </section>:<>
      <div className="mx-7 mb-3 flex items-center justify-between text-sm text-[var(--muted)]"><span>{items.length} ürün</span><button onClick={()=>open("add")} className="flex items-center gap-1 text-[var(--green)]"><Plus size={17}/>Ürün Ekle</button></div>
      <div className="product-history-list">{items.map(p=><div key={p.barcode}>
        <ProductHistoryRow product={p} action={<button disabled={busy} className="product-save" aria-label="Listeden kaldır" onClick={()=>remove(p.barcode)}><Trash2 size={22}/></button>}/>
        <button className="ml-4 mt-2 flex items-center gap-1 text-xs text-[var(--muted)]" onClick={()=>{setBarcode(p.barcode);open("choose");}}><Bookmark size={13}/>Başka listeye ekle</button>
      </div>)}</div>
    </>}
    <BottomNav active="saved"/>
    {modal && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65" onClick={()=>!busy&&setModal(null)}>
      <section role="dialog" aria-modal="true" aria-label={modal==="create"?"Yeni liste oluştur":"Listeye ürün ekle"} onClick={e=>e.stopPropagation()} className="bottom-sheet w-full max-w-[480px] rounded-t-[28px] bg-[var(--bg)] p-7 pb-9">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[var(--border)]"/>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">{modal==="create"?"Yeni Liste":modal==="choose"?"Bir Liste Seç":"Ürün Ekle"}</h2><button onClick={()=>setModal(null)} disabled={busy} aria-label="Kapat"><X size={22}/></button></div>
        {modal==="create"?<form onSubmit={e=>{e.preventDefault();create();}}><label className="text-sm text-[var(--muted)]" htmlFor="list-name">Liste adı</label><input autoFocus id="list-name" maxLength={40} value={name} onChange={e=>setName(e.target.value)} placeholder="Örn. Sağlıklı atıştırmalıklar" className="mb-5 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-base"/><button disabled={busy} className="primary-btn">{busy?<Loader2 size={20} className="animate-spin"/>:<Plus size={20}/>}Listeyi Oluştur</button></form>:modal==="add"?<form onSubmit={e=>{e.preventDefault();add();}}><p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">Ürün ingr veritabanından bulunup “{selected.name}” listene eklenecek.</p><input autoFocus aria-label="Ürün barkodu" inputMode="numeric" maxLength={14} value={barcode} onChange={e=>setBarcode(e.target.value.replace(/\D/g,""))} placeholder="Barkod numarası" className="mb-5 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 font-mono text-base"/><button disabled={busy} className="primary-btn">{busy?<Loader2 size={20} className="animate-spin"/>:<Plus size={20}/>}Listeye Ekle</button></form>:<div className="space-y-2">{lists.filter(l=>l.id!==active).map(l=><button key={l.id} disabled={busy} onClick={()=>add(l.id)} className="flex w-full items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-4"><ListIcon icon={l.icon}/>{l.name}{busy&&<Loader2 className="ml-auto animate-spin" size={17}/>}</button>)}</div>}
        {error && <p className="mt-4 text-sm text-[var(--red)]" role="alert">{error}</p>}
      </section>
    </div>}
  </main>;
}
function ListIcon({icon}:{icon:string}) {return icon==="heart"?<Heart size={22}/>:icon==="cart"?<ShoppingCart size={22}/>:icon==="trash"?<Trash2 size={22}/>:<Bookmark size={22}/>;}
