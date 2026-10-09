"use client";

import { use, useEffect, useRef, useState } from "react";
import { Camera, PencilLine, Loader2, RotateCcw, RotateCw, ScanText, CheckCircle2, AlertTriangle, ImagePlus, Sparkles } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";
import { preprocessImage, recognizeDetailed, processOCRText, ocrStatusTr, type OCRCorrection } from "@/lib/ocr";

interface Product {
  id: string;
  barcode: string | null; name: string; brand: string | null; quantity: string | null;
  ingredientsText: string | null; nutriments: Record<string, number | null>;
}

interface Preview {
  score: number; label: string; range: string; color: string;
  additives: { code: string; name: string; risk: string }[];
  ingredients: { name: string; risk: string }[];
  notes: { title: string; severity: string }[];
  breakdown: { label: string; points: number }[];
}

const NUT_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: "energyKcal", label: "Enerji", unit: "kcal" },
  { key: "fat", label: "Yağ", unit: "g" },
  { key: "saturatedFat", label: "Doymuş Yağ", unit: "g" },
  { key: "carbs", label: "Karbonhidrat", unit: "g" },
  { key: "sugars", label: "Şeker", unit: "g" },
  { key: "fiber", label: "Lif", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "salt", label: "Tuz", unit: "g" },
];

const EMPTY_NUT: Record<string, string> = { energyKcal: "", fat: "", saturatedFat: "", carbs: "", sugars: "", fiber: "", protein: "", salt: "" };

export default function IcerikPage({ params, searchParams }: { params: Promise<{ barcode: string }>; searchParams: Promise<{ tab?: string; new?: string }> }) {
  const { barcode } = use(params);
  const sp = use(searchParams);
  const code = decodeURIComponent(barcode);
  const isNew = sp.new === "1";

  const [tab, setTab] = useState<"photo" | "manual">(sp.tab === "manual" ? "manual" : "photo");
  const [loading, setLoading] = useState(!isNew);
  const [isNewProduct, setIsNewProduct] = useState(isNew);

  const [productId, setProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [nut, setNut] = useState<Record<string, string>>({ ...EMPTY_NUT });

  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<"pick" | "reading" | "review">("pick");
  const [progress, setProgress] = useState({ status: "", progress: 0 });
  const [ocrText, setOcrText] = useState("");
  const [corrections, setCorrections] = useState<OCRCorrection[]>([]);
  const [suspicious, setSuspicious] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewSeq = useRef(0);

  const activeText = tab === "photo" ? ocrText : ingredientsText;

  useEffect(() => {
    if (isNew) return;
    const isId = code.includes("-") && code.length > 20;
    const url = isId ? `/api/product?id=${encodeURIComponent(code)}` : `/api/product?barcode=${encodeURIComponent(code)}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error("");
        fillFrom(d.product as Product);
      })
      .catch(() => setIsNewProduct(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // canlı önizleme (debounce)
  useEffect(() => {
    setPreview(null);
    if (!activeText || activeText.trim().length < 8) return;
    setPreviewLoading(true);
    const seq = ++previewSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/product/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingredientsText: activeText.trim(), nutriments: nutToNumbers(nut) }),
        });
        const d = await res.json();
        if (seq === previewSeq.current && res.ok) setPreview(d as Preview);
      } catch {
        /* sessiz geç */
      } finally {
        if (seq === previewSeq.current) setPreviewLoading(false);
      }
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeText, tab, JSON.stringify(nut)]);

  const v = (x: number | null | undefined) => (x === null || x === undefined ? "" : String(x));
  const fillFrom = (p: Product) => {
    setProductId(p.id || null);
    setName(p.name || "");
    setBrand(p.brand || "");
    setQuantity(p.quantity || "");
    setIngredientsText(p.ingredientsText || "");
    const n = p.nutriments || {};
    setNut({
      energyKcal: v(n.energyKcal), fat: v(n.fat), saturatedFat: v(n.saturatedFat), carbs: v(n.carbs),
      sugars: v(n.sugars), fiber: v(n.fiber), protein: v(n.protein), salt: v(n.salt),
    });
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(f);
    setPhotoUrl(URL.createObjectURL(f));
    setPhase("pick");
    setOcrText("");
    setCorrections([]);
    setSuspicious([]);
    setRotation(0);
  };

  const startOCR = async () => {
    if (!photoFile || phase === "reading") return;
    setPhase("reading");
    setError(null);
    setProgress({ status: "preparing", progress: 0 });
    try {
      const processed = await preprocessImage(photoFile, { rotate: rotation });
      const { text: raw, suspicious: susp } = await recognizeDetailed(processed, (p) => setProgress(p));
      const { text: cleaned, corrections: fixes } = processOCRText(raw);
      if (!cleaned || cleaned.length < 10) {
        setError("Metin okunamadı — daha net, yakın plan ve düz bir fotoğraf deneyin. Etiket parlama yapmasın; gerekirse döndürme düğmesiyle çevirip tekrar okutun.");
        setPhase("pick");
        return;
      }
      setOcrText(cleaned);
      setCorrections(fixes);
      setSuspicious(susp);
      setPhase("review");
    } catch (e) {
      console.error(e);
      setError("OCR sırasında hata oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin veya manuel giriş yapın.");
      setPhase("pick");
    }
  };

  const save = async () => {
    if (saving) return;
    const text = tab === "photo" ? ocrText : ingredientsText;
    if (!name.trim()) { setError("Ürün adı gerekli — yukarıdaki Ürün Adı alanını doldurun."); return; }
    if (!text.trim() || text.trim().length < 5) { setError("İçerik metni çok kısa — en az birkaç bileşen yazın veya fotoğraf okutun."); return; }
    setSaving(true);
    setSavedOk(false);
    setError(null);
    try {
      const res = await fetch("/api/product/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          id: productId,
          barcode: code,
          name: name.trim(),
          brand: brand.trim(),
          quantity: quantity.trim(),
          ingredientsText: text.trim(),
          nutriments: nutToNumbers(nut),
          source: tab === "photo" ? "ocr" : "manual",
        }),
      });
      const raw = await res.text();
      let d: { product?: { barcode?: string | null }; error?: string };
      try {
        d = JSON.parse(raw);
      } catch {
        throw new Error(`Sunucu yanıtı okunamadı (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(d.error || `Kaydedilemedi (HTTP ${res.status})`);
      if (!d.product?.barcode) throw new Error("Kayıt oluştu ama barkod dönmedi — ürün sayfasından kontrol edin.");
      setSavedOk(true);
      setTimeout(() => { window.location.href = `/urun/${encodeURIComponent(d.product!.barcode as string)}`; }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi, tekrar deneyin.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-32">
        <TopBar showBack />
        <div className="flex flex-col items-center gap-3 px-8 pt-16">
          <Loader2 className="h-10 w-10 animate-spin text-[#7de8a2]" />
          <p className="font-bold">Ürün yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <TopBar showBack />
      <h1 className="px-5 pt-2 text-2xl font-extrabold">{isNewProduct ? "Ürün Oluştur" : "İçeriği Tamamla"}</h1>
      <p className="px-5 pt-1 font-mono text-xs text-gray-500">Barkod: {code}</p>

      {/* tabs */}
      <div className="mx-4 mt-4 flex rounded-[26px] bg-[#1d1d1f] p-1.5">
        <button onClick={() => { setTab("photo"); setError(null); }} className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] py-3.5 text-[15px] font-extrabold transition ${tab === "photo" ? "bg-[#7de8a2] text-black" : "text-gray-400"}`}>
          <Camera className="h-5 w-5" /> Fotoğraf ile Tara
        </button>
        <button onClick={() => { setTab("manual"); setError(null); }} className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] py-3.5 text-[15px] font-extrabold transition ${tab === "manual" ? "bg-[#7de8a2] text-black" : "text-gray-400"}`}>
          <PencilLine className="h-5 w-5" /> Manuel Gir
        </button>
      </div>

      {/* product identity */}
      <div className="mx-4 mt-3 space-y-2 rounded-[26px] bg-[#141415] p-4">
        <Field label="ÜRÜN ADI *" value={name} onChange={setName} placeholder="örn. Çikolatalı Gofret 36 g" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="MARKA" value={brand} onChange={setBrand} placeholder="örn. Ülker" />
          <Field label="MİKTAR" value={quantity} onChange={setQuantity} placeholder="örn. 36 g" />
        </div>
      </div>

      {tab === "photo" ? (
        <div className="mx-4 mt-3 rounded-[26px] bg-[#141415] p-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          {!photoUrl ? (
            <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[#333] bg-[#0b0b0c] px-6 py-10 active:border-[#7de8a2]">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1d1d1f]"><ImagePlus className="h-10 w-10 text-[#7de8a2]" /></span>
              <span className="font-extrabold">Etiket Fotoğrafı Çek</span>
              <span className="text-center text-xs leading-relaxed text-gray-400">Ürünün arkasındaki <b className="text-white">İçindekiler</b> bölümünü yakın plan, net ve düz çekin. Yazılar gölgesiz ve parlama yapmadan görünmeli.</span>
            </button>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-3xl bg-black">
                <img src={photoUrl} alt="Etiket" className="max-h-72 w-full object-contain transition-transform" style={{ transform: `rotate(${rotation}deg)` }} />
                {phase !== "reading" && (
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title="Fotoğrafı döndür"
                    className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#7de8a2] text-black shadow-lg active:scale-95"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                )}
              </div>
              {rotation !== 0 && phase === "pick" && (
                <p className="mt-1 text-center text-xs text-gray-500">Döndürme okumaya da uygulanır ({rotation}°)</p>
              )}
              {phase === "reading" ? (
                <div className="mt-4 rounded-2xl bg-[#0b0b0c] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#7de8a2]">
                    <Loader2 className="h-4 w-4 animate-spin" /> {ocrStatusTr(progress.status, progress.progress)}
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#222]">
                    <div className="h-full rounded-full bg-[#7de8a2] transition-all" style={{ width: `${Math.max(4, Math.round(progress.progress * 100))}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">İlk kullanımda Türkçe dil modeli indirilir (birkaç MB), sonraki taramalar daha hızlıdır.</p>
                </div>
              ) : phase === "review" ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#7de8a2]">
                    <CheckCircle2 className="h-5 w-5" /> Metin okundu — kontrol edip düzenleyin
                  </div>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    rows={6}
                    className="mt-2 w-full rounded-2xl border border-[#2a2a2c] bg-[#0b0b0c] p-4 text-[15px] leading-relaxed text-white"
                  />
                  {corrections.length > 0 && (
                    <div className="mt-2 rounded-2xl bg-[#0b0b0c] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#7de8a2]"><Sparkles className="h-3.5 w-3.5" /> Otomatik düzeltmeler ({corrections.length})</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {corrections.slice(0, 10).map((c, i) => (
                          <span key={i} className="rounded-full bg-[#1d1d1f] px-2.5 py-1 text-[11px] text-gray-300">{c.from} → <b className="text-white">{c.to}</b></span>
                        ))}
                        {corrections.length > 10 && <span className="px-2 py-1 text-[11px] text-gray-500">+{corrections.length - 10} daha</span>}
                      </div>
                    </div>
                  )}
                  {suspicious.length > 0 && (
                    <p className="mt-2 rounded-2xl bg-[#2e2c18] p-3 text-xs leading-relaxed text-[#e8d27d]">
                      ⚠️ Emin olunamayan kelimeler, yazılışını kontrol edin: <b>{suspicious.join(", ")}</b>
                    </p>
                  )}
                  <button onClick={() => { setPhotoUrl(null); setPhotoFile(null); setOcrText(""); setCorrections([]); setSuspicious([]); setPhase("pick"); setRotation(0); }} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-400">
                    <RotateCcw className="h-3.5 w-3.5" /> Farklı fotoğraf çek
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => fileRef.current?.click()} className="rounded-2xl border border-[#2a2a2c] py-3.5 text-sm font-bold text-gray-300">Değiştir</button>
                  <button onClick={startOCR} className="flex items-center justify-center gap-2 rounded-2xl bg-[#7de8a2] py-3.5 text-sm font-extrabold text-black">
                    <ScanText className="h-5 w-5" /> Metni Oku
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 rounded-2xl bg-[#0b0b0c] p-3 text-xs leading-relaxed text-gray-500">
            💡 <b className="text-gray-300">İpucu:</b> Fotoğraftan yalnızca İçindekiler metni okunur. Besin değerlerini aşağıdaki alanlara etiketteki tabloya bakarak ekleyin — puan daha isabetli olur.
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-[26px] bg-[#141415] p-4">
          <label className="text-xs font-extrabold tracking-wide text-gray-400">İÇİNDEKİLER METNİ *</label>
          <textarea
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            rows={6}
            placeholder="örn. Şeker, palm yağı, buğday unu, kakao yağı, kakao kitlesi, yağsız süt tozu, emülgatör (soya lesitini E322), aroma verici, kabartıcı (karbonat E500)..."
            className="mt-2 w-full rounded-2xl border border-[#2a2a2c] bg-[#0b0b0c] p-4 text-[15px] leading-relaxed text-white placeholder:text-gray-600"
          />
          <p className="mt-1 text-xs text-gray-500">Etiketteki İçindekiler bölümünü virgüllerle aynen yazın. E kodlarını da eklemeyi unutmayın.</p>
        </div>
      )}

      {/* nutrition */}
      <div className="mx-4 mt-3 rounded-[26px] bg-[#141415] p-4">
        <h3 className="text-sm font-extrabold tracking-wide text-gray-400">BESİN DEĞERLERİ <span className="font-normal text-gray-500">(100 g için, etiketteki tablodan)</span></h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {NUT_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-2 rounded-2xl border border-[#2a2a2c] bg-[#0b0b0c] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold text-gray-500">{f.label}</div>
                <input
                  value={nut[f.key]}
                  onChange={(e) => setNut({ ...nut, [f.key]: e.target.value.replace(/[^0-9.,]/g, "") })}
                  placeholder="—"
                  inputMode="decimal"
                  className="w-full bg-transparent text-[16px] font-bold text-white placeholder:text-gray-600"
                />
              </div>
              <span className="text-xs text-gray-500">{f.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* canlı önizleme */}
      {(previewLoading || preview) && (
        <div className="mx-4 mt-3 rounded-[26px] border border-[#2a2a2c] bg-[#111112] p-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-gray-400">
            <Sparkles className="h-4 w-4 text-[#7de8a2]" /> CANLI ANALİZ ÖNİZLEMESİ
          </h3>
          {previewLoading && !preview ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Hesaplanıyor...</div>
          ) : preview ? (
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl px-4 py-2 text-2xl font-extrabold text-white" style={{ background: preview.color }}>{preview.score}</span>
                <div>
                  <div className="font-extrabold" style={{ color: preview.color }}>{preview.label}</div>
                  <div className="text-xs text-gray-400">{preview.additives.length} katkı • {preview.ingredients.length} bileşen</div>
                </div>
              </div>
              {preview.additives.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.additives.map((a) => (
                    <span key={a.code} className="rounded-full bg-[#1d1d1f] px-2.5 py-1 text-[11px] font-bold text-gray-200">{a.code} <span className="text-gray-500">• {a.risk}</span></span>
                  ))}
                </div>
              )}
              <div className="mt-2 space-y-1">
                {preview.notes.slice(0, 4).map((x, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${sevDot(x.severity)}`} />
                    <span className="text-gray-300">{x.title}</span>
                  </div>
                ))}
              </div>
              {preview.breakdown.length > 0 && (
                <div className="mt-2 border-t border-[#222] pt-2 text-[11px] text-gray-500">
                  {preview.breakdown.map((b) => `${b.label}: ${b.points}`).join("  •  ")}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-[#331b1b] p-4 text-sm font-bold text-[#f0716f]">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}
      {savedOk && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-[#7de8a2] p-4 text-sm font-extrabold text-black">
          <CheckCircle2 className="h-5 w-5" /> Kaydedildi! Ürün sayfasına yönlendiriliyorsunuz...
        </div>
      )}

      <div className="mx-4 mt-4">
        <button
          onClick={save}
          disabled={saving || savedOk || (tab === "photo" && phase !== "review")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7de8a2] py-4 font-extrabold text-black disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          {saving ? (savedOk ? "Kaydedildi!" : "Analiz ediliyor...") : "Analiz Et ve Kaydet"}
        </button>
        {tab === "photo" && phase !== "review" && (
          <p className="mt-2 text-center text-xs text-gray-500">Önce fotoğraf çekip metni okutun, sonra kaydedin.</p>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function nutToNumbers(nut: Record<string, string>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [k, val] of Object.entries(nut)) {
    if (!val || val.trim() === "") { out[k] = null; continue; }
    const n = parseFloat(val.replace(/,/g, "."));
    out[k] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return out;
}

function sevDot(sev: string): string {
  switch (sev) {
    case "kirmizi": return "bg-[#f0716f]";
    case "turuncu": return "bg-[#eda45f]";
    case "sari": return "bg-[#e8d27d]";
    case "mavi": return "bg-[#7db8e8]";
    default: return "bg-[#7ddb94]";
  }
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-extrabold tracking-wide text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-[#2a2a2c] bg-[#0b0b0c] px-4 py-3 text-[15px] font-bold text-white placeholder:font-normal placeholder:text-gray-600"
      />
    </div>
  );
}
