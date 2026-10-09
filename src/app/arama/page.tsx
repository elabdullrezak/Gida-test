"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ScanLine, SlidersHorizontal, X, History, Trash2 } from "lucide-react";
import { TopBar, SearchBar, BottomNav } from "@/components/ui";
import { ProductHistoryRow, scoreColor } from "@/components/product-cards";
import type { ProductCardData } from "@/lib/models";

type SortKey = "relevant" | "score-desc" | "score-asc" | "name";
const HISTORY_KEY = "ingr-search-history";
const HISTORY_MAX = 12;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function sortItems(items: ProductCardData[], sort: SortKey): ProductCardData[] {
  if (sort === "score-desc") return [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  if (sort === "score-asc") return [...items].sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
  if (sort === "name") return [...items].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return items;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") || "";
  const [query, setQuery] = useState(initial);
  const [local, setLocal] = useState<ProductCardData[]>([]);
  const [online, setOnline] = useState<ProductCardData[]>([]);
  const [total, setTotal] = useState(50);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("relevant");
  const [brand, setBrand] = useState<string>("all");
  const [history, setHistory] = useState<string[]>([]);
  const request = useRef(0);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function remember(q: string) {
    setHistory((h) => {
      const next = [q, ...h.filter((x) => x.toLocaleLowerCase("tr-TR") !== q.toLocaleLowerCase("tr-TR"))].slice(0, HISTORY_MAX);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function removeHistory(q: string) {
    setHistory((h) => {
      const next = h.filter((x) => x !== q);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  }

  async function search(value = query) {
    const q = value.trim();
    if (/^\d{4,14}$/.test(q)) {
      router.push(`/urun/${q}`);
      return;
    }
    if (q.length < 2) return;
    const seq = ++request.current;
    setLoading(true);
    setSearched(true);
    setError(null);
    setBrand("all");
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&count=50`);
      const d = await r.json();
      if (seq !== request.current) return;
      if (!r.ok) throw new Error(d.error || "Arama başarısız.");
      setLocal(d.local || []);
      setOnline(d.online || []);
      setTotal(typeof d.count === "number" ? d.count : 50);
      setError(d.onlineError || null);
      remember(q);
    } catch (e) {
      if (seq === request.current) setError(e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      if (seq === request.current) setLoading(false);
    }
  }

  useEffect(() => {
    setQuery(initial);
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const brands = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of [...local, ...online]) {
      const b = (p.brand || "Markasız").trim() || "Markasız";
      map.set(b, (map.get(b) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
  }, [local, online]);

  useEffect(() => {
    if (brand !== "all" && !brands.some(([b]) => b === brand)) setBrand("all");
  }, [brands, brand]);

  const filteredLocal = useMemo(() => {
    const list = brand === "all" ? local : local.filter((p) => ((p.brand || "Markasız").trim() || "Markasız") === brand);
    return sortItems(list, sort);
  }, [local, brand, sort]);

  const filteredOnline = useMemo(() => {
    const list = brand === "all" ? online : online.filter((p) => ((p.brand || "Markasız").trim() || "Markasız") === brand);
    return sortItems(list, sort);
  }, [online, brand, sort]);

  const filtersActive = sort !== "relevant" || brand !== "all";
  const shownCount = filteredLocal.length + filteredOnline.length;

  const row = (p: ProductCardData) => (
    <ProductHistoryRow
      key={p.barcode}
      product={p}
      action={<span className="product-save text-base font-semibold" style={{ color: scoreColor(p.score) }}>{p.score ?? "—"}</span>}
    />
  );

  return (
    <main className="app-page">
      <TopBar showBack />
      <section className="page-heading">
        <h1>Ürün Ara</h1>
        <p>Ürün adı, marka veya barkodla ingr’de ara. Her aramada ilk 50 sonuç listelenir.</p>
      </section>
      <SearchBar value={query} onChange={setQuery} onSubmit={() => search()} autoFocus={!initial} />

      {loading ? (
        <div className="loader-row gap-3">
          <Loader2 size={27} className="animate-spin" />
          <span className="text-sm text-[var(--muted)]">ingr’de ilk 50 sonuç aranıyor…</span>
        </div>
      ) : searched ? (
        <>
          {error && (
            <p className="page-notice mt-5">
              {error}
              <button onClick={() => search()} className="ml-2 underline">Tekrar dene</button>
            </p>
          )}

          {(local.length > 0 || online.length > 0) && (
            <section className="mx-7 mt-5 rounded-[22px] bg-[var(--card)] p-4" aria-label="Arama filtreleri">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal size={17} className="text-[var(--green)]" />
                Filtrele
                {filtersActive && (
                  <button
                    onClick={() => { setSort("relevant"); setBrand("all"); }}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-[var(--muted)]"
                  >
                    <X size={14} /> Temizle
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <label className="text-xs text-[var(--muted)]" htmlFor="sort-select">
                  Puan sıralaması
                  <select
                    id="sort-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="mt-1.5 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--white)]"
                  >
                    <option value="relevant">Önerilen sıralama</option>
                    <option value="score-desc">Puana göre: yüksekten düşüğe</option>
                    <option value="score-asc">Puana göre: düşükten yükseğe</option>
                    <option value="name">İsme göre (A–Z)</option>
                  </select>
                </label>
              </div>
              {brands.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs text-[var(--muted)]">Marka ({brands.length})</p>
                  <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setBrand("all")}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${brand === "all" ? "bg-[var(--green)] text-[var(--bg)]" : "bg-[var(--card2)] text-[var(--muted)]"}`}
                    >
                      Tümü
                    </button>
                    {brands.map(([b, c]) => (
                      <button
                        key={b}
                        onClick={() => setBrand(brand === b ? "all" : b)}
                        aria-pressed={brand === b}
                        className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${brand === b ? "bg-[var(--green)] text-[var(--bg)]" : "bg-[var(--card2)] text-[var(--muted)]"}`}
                      >
                        {b} · {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--muted)]">
                {shownCount} sonuç gösteriliyor
                {filtersActive && ` (toplam ${local.length + online.length} sonuç içinden)`}
              </p>
            </section>
          )}

          {filteredLocal.length > 0 && (
            <>
              <div className="section-heading"><h2>Kendi Eklediklerim</h2><span className="text-sm text-[var(--muted)]">{filteredLocal.length}</span></div>
              <div className="product-history-list">{filteredLocal.map(row)}</div>
            </>
          )}
          {filteredOnline.length > 0 && (
            <>
              <div className="section-heading"><h2>ingr Sonuçları</h2><span className="text-sm text-[var(--muted)]">ilk {total} sonuç</span></div>
              <div className="product-history-list">{filteredOnline.map(row)}</div>
            </>
          )}
          {shownCount === 0 && !error && (
            <section className="empty-list mt-6">
              <h2>{filtersActive ? "Filtreye uyan sonuç yok" : "Sonuç bulunamadı"}</h2>
              <p>{filtersActive ? "Farklı bir marka seç veya filtreleri temizle." : "Farklı bir ürün adı dene veya ürünün barkodunu tara."}</p>
              {filtersActive ? (
                <button onClick={() => { setSort("relevant"); setBrand("all"); }} className="primary-btn">Filtreleri Temizle</button>
              ) : (
                <Link href="/tara" className="primary-btn"><ScanLine size={21} />Barkod Tara</Link>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="mx-7 mt-7">
          {history.length > 0 && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <History size={17} className="text-[var(--muted)]" />
                <h2 className="text-lg font-semibold">Arama Geçmişi</h2>
                <button onClick={clearHistory} className="ml-auto flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                  <Trash2 size={14} /> Temizle
                </button>
              </div>
              <div className="mb-6 flex flex-wrap gap-2">
                {history.map((h) => (
                  <span key={h} className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pl-4 pr-1.5 text-sm text-[var(--muted)]">
                    <button onClick={() => { setQuery(h); search(h); }}>{h}</button>
                    <button onClick={() => removeHistory(h)} aria-label={`${h} aramasını geçmişten sil`} className="rounded-full p-1.5 hover:bg-[var(--card2)]">
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
          <h2 className="mb-4 text-lg font-semibold">Popüler Aramalar</h2>
          <div className="flex flex-wrap gap-2">
            {["bueno", "çikolata", "gofret", "bisküvi", "süt", "makarna", "meyve suyu"].map((q) => (
              <button key={q} onClick={() => { setQuery(q); search(q); }} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--muted)]">{q}</button>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-[var(--muted)]">Ürün içeriği, notlar ve puanlar doğrudan ingr veritabanından alınır. Ürün bulunamazsa etiket fotoğrafı veya manuel içerik ekleyebilirsin.</p>
        </section>
      )}
      <BottomNav active="home" />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="loader-row"><Loader2 className="animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
