"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { BottomNav, TopBar, AdditiveDetailSheet } from "@/components/ui";
import { riskColor } from "@/lib/additives";

interface A { code: string; name: string; risk: string; func: string; description: string }

export default function AdditivesPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<A[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("TÜMÜ");
  const [sel, setSel] = useState<A | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/additives?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => { setList(d.additives || []); setTotal(d.total || 0); }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const shown = filter === "TÜMÜ" ? list : list.filter((a) => a.risk === filter);

  return (
    <div className="pb-32">
      <TopBar showBack />
      <h1 className="px-5 pt-2 text-2xl font-extrabold">Katkı Maddesi Sözlüğü</h1>
      <p className="px-5 pt-1 text-sm text-gray-400">{total} katkı maddesi kayıtlı</p>

      <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[#2a2a2c] bg-[#141415] px-4 py-3.5">
        <Search className="h-5 w-5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="E kodu veya isim ara... (örn. E211)" className="w-full bg-transparent text-white placeholder:text-gray-500" />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {["TÜMÜ", "RISK YOK", "DÜŞÜK", "ORTA", "YÜKSEK", "ÇOK YÜKSEK"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${filter === f ? "bg-[#7de8a2] text-black" : "bg-[#1d1d1f] text-gray-400"}`}>{f}</button>
        ))}
      </div>

      <div className="mt-3 space-y-2 px-4">
        {shown.map((a) => {
          const rc = riskColor(a.risk);
          return (
            <button key={a.code} onClick={() => setSel(a)} className="flex w-full items-center gap-3 rounded-3xl bg-[#141415] p-3 text-left active:bg-[#1d1d1f]">
              <span className={`flex w-[76px] shrink-0 flex-col items-center rounded-2xl py-2.5 ${rc.bg}`}>
                <span className={`text-lg font-extrabold ${rc.text}`}>{a.code}</span>
                <span className={`flex items-center gap-1 text-[9px] font-extrabold ${rc.text}`}><span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`} />{a.risk}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{a.name}</span>
                <span className="block text-xs text-[#7de8a2]">{a.func}</span>
                <span className="block truncate text-xs text-gray-400">{a.description}</span>
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Sonuç bulunamadı.</p>}
      </div>

      <BottomNav active="home" />
      {sel && <AdditiveDetailSheet code={sel.code} name={sel.name} risk={sel.risk} func={sel.func} description={sel.description} onClose={() => setSel(null)} />}
    </div>
  );
}
