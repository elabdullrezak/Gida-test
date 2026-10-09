// İstemci-tarafı (browser) OCR yardımcıları.
// tesseract.js worker/core/dil dosyalarını CDN'den otomatik yükler —
// API anahtarı gerekmez, sunucuya yük binmez.

import { stripTR, isKnownWord, fuzzyKnownTR, repairToken, phraseFix, levWithin } from "./ocr-dict";

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Dosya okunamadı"));
    r.readAsDataURL(file);
  });
}

export interface PreprocessOpts {
  rotate?: number; // 0 | 90 | 180 | 270
  targetWidth?: number;
}

// OCR öncesi görüntü iyileştirme: döndür + büyüt + gri ton + otokontrast + keskinleştir
export async function preprocessImage(file: File | Blob, opts?: PreprocessOpts): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    bitmap = await createImageBitmap(file);
  }
  try {
    const rot = (((opts?.rotate ?? 0) % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const w0 = swap ? srcH : srcW;
    const h0 = swap ? srcW : srcH;

    const targetW = opts?.targetWidth ?? 2000;
    let scale = 1;
    if (w0 < targetW) scale = Math.min(2.6, targetW / w0);
    else if (w0 > 2600) scale = 2600 / w0;
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas desteklenmiyor");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(bitmap, (-w0 * scale) / 2, (-h0 * scale) / 2, w0 * scale, h0 * scale);
    ctx.restore();

    // Gri ton + histogram gerdirme (otokontrast) + hafif keskinleştirme
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const gray = new Uint8Array(w * h);
    const hist = new Uint32Array(256);
    for (let i = 0; i < w * h; i++) {
      const g = Math.round(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
      gray[i] = g;
      hist[g]++;
    }
    const total = w * h;
    const loCut = total * 0.02;
    const hiCut = total * 0.98;
    let lo = 0;
    let hi = 255;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= loCut) { lo = i; break; }
    }
    acc = 0;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= total - hiCut) { hi = i; break; }
    }
    if (hi - lo < 24) { lo = 0; hi = 255; }
    const span = Math.max(1, hi - lo);
    const stretched = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      stretched[i] = Math.max(0, Math.min(255, Math.round(((gray[i] - lo) / span) * 255)));
    }
    // 3x3 keskinleştirme (unsharp benzeri, miktar %35)
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c = stretched[i];
        const l = stretched[y * w + Math.max(0, x - 1)];
        const r = stretched[y * w + Math.min(w - 1, x + 1)];
        const u = stretched[Math.max(0, y - 1) * w + x];
        const dn = stretched[Math.min(h - 1, y + 1) * w + x];
        const lap = 4 * c - l - r - u - dn;
        out[i] = Math.max(0, Math.min(255, Math.round(c + lap * 0.35)));
      }
    }
    for (let i = 0; i < w * h; i++) {
      d[i * 4] = out[i];
      d[i * 4 + 1] = out[i];
      d[i * 4 + 2] = out[i];
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.93);
  } finally {
    bitmap.close();
  }
}

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
}

async function getWorker(onProgress?: (p: OCRProgress) => void) {
  const T = await import("tesseract.js");
  const worker = await T.createWorker(["tur", "eng"], T.OEM.DEFAULT, {
    logger: (m) => {
      const mm = m as unknown as { status?: string; progress?: number };
      onProgress?.({
        status: String(mm.status || ""),
        progress: typeof mm.progress === "number" ? mm.progress : 0,
      });
    },
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" } as never);
  } catch {
    /* parametre desteklenmiyorsa yok say */
  }
  return worker;
}

export async function recognizeText(
  image: string | Blob,
  onProgress?: (p: OCRProgress) => void
): Promise<string> {
  const { text } = await recognizeDetailed(image, onProgress);
  return text;
}

export async function recognizeDetailed(
  image: string | Blob,
  onProgress?: (p: OCRProgress) => void
): Promise<{ text: string; words: OCRWord[]; suspicious: string[] }> {
  const worker = await getWorker(onProgress);
  try {
    const ret = await worker.recognize(image);
    const text: string = ret?.data?.text || "";
    const rawWords = (ret?.data?.words || []) as { text?: string; confidence?: number }[];
    const words: OCRWord[] = rawWords
      .map((w) => ({ text: String(w.text || "").trim(), confidence: Number(w.confidence ?? 0) }))
      .filter((w) => w.text.length > 0);
    const seen = new Set<string>();
    const suspicious: string[] = [];
    for (const w of words) {
      const clean = w.text.replace(/^[^A-Za-zÇĞİÖŞÜçğiöşü0-9]+|[^A-Za-zÇĞİÖŞÜçğiöşü0-9]+$/g, "");
      if (clean.length < 3 || w.confidence >= 60) continue;
      const key = clean.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      suspicious.push(clean);
      if (suspicious.length >= 12) break;
    }
    return { text, words, suspicious };
  } finally {
    try {
      await worker.terminate();
    } catch {
      /* yok say */
    }
  }
}

// --- OCR metin işleme ---

function fuzzyIncludes(norm: string, keyword: string, maxDist: number): boolean {
  if (norm.includes(keyword)) return true;
  if (keyword.length < 6) return false;
  const win = keyword.length;
  for (let i = 0; i + win <= norm.length; i++) {
    if (levWithin(norm.slice(i, i + win), keyword, maxDist)) return true;
  }
  return false;
}

const START_KEYS = ["icindekiler", "indekiler", "ingredients", "zutaten", "ingredientes", "composition", "skladniki", "ingredienti"];
const END_KEYS = [
  "besindeger", "besinoger", "nutrition", "nutritive", "enerji", "alerjen", "allergen",
  "saklamakosul", "netmiktar", "mensei", "isletme", "tuketim", "kullanma", "partino", "uretim",
];

export interface OCRCorrection {
  from: string;
  to: string;
}

export function processOCRText(raw: string): { text: string; corrections: OCRCorrection[] } {
  const corrections: OCRCorrection[] = [];
  const pushFix = (from: string, to: string) => {
    if (from && to && from !== to && corrections.length < 40) corrections.push({ from, to });
  };
  if (!raw) return { text: "", corrections };

  // 1) satırlara böl + satır içi artıkları temizle
  let lines = raw
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[|¦〡｜]/g, " ").replace(/[~°©®™_*^`]/g, "").replace(/[«»]/g, "").replace(/\s{2,}/g, " ").trim())
    .filter((l) => l.length > 0);

  // 2) başlangıç: "İçindekiler" başlığını bulanık eşleşmeyle bul
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const n = stripTR(lines[i]).replace(/[^a-z]/g, "");
    if (START_KEYS.some((k) => fuzzyIncludes(n, k, k.length >= 9 ? 3 : 2))) {
      start = i;
      // başlık kelimesini satırdan düşür
      const cut = lines[i].search(/i[çc]indekiler|ingredients?|zutaten|composition|ingredientes|skladniki|ingredienti/i);
      if (cut >= 0) {
        const after = lines[i].slice(cut).replace(/^.*?:\s*/, "");
        lines[i] = after.length > 2 && !/i[çc]indekiler|ingredients?/i.test(after) ? after : "";
      } else {
        // bulanık yakalandı ama desen tutmadıysa satırın ilk kelimesini at
        lines[i] = lines[i].replace(/^\S+\s*:?\s*/, "");
      }
      break;
    }
  }
  lines = lines.slice(start);

  // 3) bitiş: besin tablosu / uyarı bölümünde kes
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const n = stripTR(lines[i]).replace(/[^a-z]/g, "");
    if (END_KEYS.some((k) => fuzzyIncludes(n, k, 2))) { end = i; break; }
    if (/\b(kcal|kj)\b/i.test(lines[i]) && /\d/.test(lines[i]) && !/[,;]/.test(lines[i]) && lines[i].length < 60) { end = i; break; }
    if (/(\b100\s*g\b|\bporsiyon\b|\bserving\b|\breferans\b)/i.test(lines[i]) && lines[i].length < 60) { end = i; break; }
  }
  lines = lines.slice(0, end);

  // 4) tablo/sayı satırlarını ele
  lines = lines.filter((l) => {
    if (l.length <= 1) return false;
    const letters = (l.match(/[A-Za-zÇĞİÖŞÜçğiöşü]/g) || []).length;
    const digits = (l.match(/\d/g) || []).length;
    if (letters < 3 && digits >= 2) return false;
    if (/^[\d\s%.,\-–—|/()gGkKlLmM:°]+$/.test(l)) return false;
    return true;
  });
  if (lines.length === 0) return { text: "", corrections };

  // 5) satır birleştirme: tireli bölünme + sözlük destekli akıllı birleşim
  // (birleşen satır bir sonrakiyle tekrar denenir — art arda bölünmeler için)
  const joined: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let cur = lines[i];
    let merged = true;
    while (merged && i + 1 < lines.length) {
      merged = false;
      const next = lines[i + 1];
      // 5a) satır sonu tiresi: "lesiti-" + "ni" → "lesitini"
      if (/[-‐‑‒–—¬]\s*$/.test(cur) && /^[a-zçğıöşü]/i.test(next)) {
        const a = (cur.match(/([A-Za-zÇĞİÖŞÜçğiöşü]+)[-‐‑‒–—¬]\s*$/) || [])[1] || "";
        const b = (next.match(/^([a-zçğıöşü]+)/i) || [])[1] || "";
        cur = cur.replace(/[-‐‑‒–—¬]\s*$/, "") + next.trimStart();
        if (a && b) pushFix(`${a}- + ${b}`, a + b);
        i++;
        merged = true;
        continue;
      }
      // 5b) tiresiz bölünme: sözlükle karar ver
      const mPrev = cur.match(/([A-Za-zÇĞİÖŞÜçğiöşü]{3,})[^A-Za-zÇĞİÖŞÜçğiöşü]*$/);
      const mNext = next.match(/^([a-zçğıöşü]{2,})/i);
      const endsOpen = !/[,;:()%.!?]$/.test(cur.trim());
      if (mPrev && mNext && endsOpen && /^[a-zçğıöşü]/.test(next)) {
        const a = mPrev[1];
        const b = mNext[1];
        const glued = a + b;
        const gluedKnown = isKnownWord(glued) || fuzzyKnownTR(stripTR(glued), 1) !== null;
        const bothKnown = isKnownWord(a) && isKnownWord(b);
        if (gluedKnown && !bothKnown) {
          cur = cur.slice(0, cur.length - a.length) + glued + next.slice(b.length);
          pushFix(`${a} / ${b}`, glued);
          i++;
          merged = true;
        }
      }
    }
    joined.push(cur);
    i++;
  }

  let t = joined.join(" ");

  // 6) noktalama temizliği
  t = t
    .replace(/\{/g, "(").replace(/\}/g, ")")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?%])/g, "$1")
    .replace(/([,;])\s*/g, "$1 ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  // 7) sayı biçimleri: "% 31 , 5" → "%31,5"
  t = t
    .replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    .replace(/%\s*(\d)/g, "%$1")
    .replace(/(\d)\s*%/g, "$1%");

  // 8) E-kodu onarımı
  t = fixECodes(t, pushFix);

  // 9) Türkçe sözlük onarımı: önce çok kelimeli ifadeler, sonra tek kelimeler
  t = phraseFix(t, pushFix);
  t = t.replace(/[A-Za-zÇĞİÖŞÜçğiöşüâîûIı0-9]{2,}/g, (tok) => {
    if (/^\d+$/.test(tok)) return tok;
    if (/^E\d{3,4}[a-z]{0,3}$/i.test(tok)) return tok; // E kodlarına dokunma
    const fixed = repairToken(tok);
    if (fixed) {
      pushFix(tok, fixed);
      return fixed;
    }
    return tok;
  });

  // 10) parantez dengele
  const open = (t.match(/\(/g) || []).length;
  const close = (t.match(/\)/g) || []).length;
  if (open > close && open - close <= 3) t += ")".repeat(open - close);

  t = t.replace(/\s{2,}/g, " ").trim();
  return { text: t, corrections };
}

// Geriye uyumluluk
export function cleanupOCRText(raw: string): string {
  return processOCRText(raw).text;
}

// E-kodu onarımı: "E 3Z2", "B322", "€322", "Ey322" → "E322"
const E_DIGIT_FIX: Record<string, string> = {
  O: "0", Q: "0", D: "0", o: "0",
  I: "1", L: "1", l: "1", i: "1", T: "7", t: "7",
  Z: "2", z: "2", A: "4", a: "4", S: "5", s: "5",
  G: "6", g: "6", B: "8", b: "8",
};

function fixECodes(t: string, pushFix: (from: string, to: string) => void): string {
  // "Ey322", "€322", "£322" gibi bariz önek hataları
  t = t.replace(/\b[E€£B][yY]\s?(\d{3,4})([a-z]{0,3})\b/gi, (m, d: string, suf: string) => {
    const fixed = "E" + d + (suf || "");
    if (m !== fixed) pushFix(m, fixed);
    return fixed;
  });
  t = t.replace(/\b[€£B]\s?(\d{3,4})([a-z]{0,3})\b/gi, (m, d: string, suf: string) => {
    const fixed = "E" + d + (suf || "");
    if (m !== fixed) pushFix(m, fixed);
    return fixed;
  });
  // genel: E + 3-4 karışık karakter (harf/rakam) + olası sonek
  t = t.replace(/\bE[\s\-‐–—]*([A-Za-z0-9][\s\-‐–—]*){3,7}\b/g, (m) => {
    const compact = m.replace(/[\s\-‐–—]/g, "");
    if (!/^E/i.test(compact)) return m;
    const rest = compact.slice(1);
    // ilk 3-4 karakter rakam olmalı (karışıklık haritasıyla)
    let digits = "";
    let idx = 0;
    while (idx < rest.length && digits.length < 4) {
      const ch = rest[idx];
      if (/\d/.test(ch)) { digits += ch; idx++; }
      else if (E_DIGIT_FIX[ch] !== undefined && digits.length < 3) { digits += E_DIGIT_FIX[ch]; idx++; }
      else break;
    }
    if (digits.length < 3) return m;
    if (digits.length === 4 && !/^1[0-5]/.test(digits)) {
      // 4. hane rakam değil sonek olabilir (örn. E150d'de d harf zaten) — burada 4 rakam geçersizse soneke bırak
      idx--;
      digits = digits.slice(0, 3);
    }
    let suffix = rest.slice(idx).toLowerCase();
    if (suffix && !/^(ii|iii|i|a|b|c|d|e|f)$/.test(suffix)) return m;
    const fixed = "E" + digits + suffix;
    if (fixed !== m) pushFix(m, fixed);
    return fixed;
  });
  // "E 322" arası boşluk
  t = t.replace(/\bE\s+(\d{3,4})/g, "E$1");
  return t;
}

export function ocrStatusTr(status: string, progress: number): string {
  if (status.includes("loading tesseract core")) return "OCR motoru yükleniyor...";
  if (status.includes("initializing")) return "Hazırlanıyor...";
  if (status.includes("loading language")) return "Türkçe dil modeli indiriliyor...";
  if (status.includes("recognizing")) return `Metin okunuyor... %${Math.round(progress * 100)}`;
  if (status) return status;
  return "İşleniyor...";
}
