// Sözlük tabanlı OCR düzeltme verisi (Türkçe gıda etiketleri için).
// OCR; ş/ğ/ü/ö/ç/ı harflerini sıkça s/g/u/o/c/i olarak okur.
// Bu sözlük, bozuk okunan kelimeleri doğrusuna çevirir.

export function stripTR(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/i̇/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

const TR_WORDS: string[] = [
  "şeker", "şekeri", "şekerler", "şekerli", "şekersiz", "esmer", "pudra", "pancarı", "kamışı",
  "yağ", "yağı", "yağlar", "yağlı", "yağsız", "yarım",
  "palm", "çekirdeği", "çekirdek", "palmiye",
  "hidrojenize", "hidrojene",
  "margarin", "margarini",
  "buğday", "mısır", "pirinç", "yulaf", "çavdar", "arpa", "kepek", "irmik", "un", "unu", "yulaflı", "kepekli",
  "nişasta", "nişastası",
  "glikoz", "glukoz", "fruktoz", "dekstroz", "maltoz", "laktoz", "sakkaroz", "maltodekstrin", "dekstrin",
  "şurubu", "şurup",
  "süt", "sütü", "sütlü", "süttozu", "tozu", "toz",
  "kakao", "kitlesi", "kakaolu",
  "çikolata", "çikolatalı", "bitter", "kaplama", "kaplamalı", "dolgulu", "gofret", "bisküvi", "kraker", "kek", "ganaj",
  "fındık", "fındıklı", "fıstık", "ceviz", "badem", "antep", "püresi", "ezmesi", "pastası", "krokan", "pralin",
  "lesitin", "lesitini", "emülgatör", "emülgatörler",
  "aroma", "aromalar", "verici", "vericiler", "doğal", "vanilin", "vanilya", "vanilyalı",
  "tuz", "tuzu", "tuzlu", "tuzsuz", "iyotlu", "deniz",
  "su", "suyu", "sulu",
  "maya", "mayası",
  "kabartıcı", "kabartıcılar", "kabartma", "karbonat", "bikarbonat",
  "sitrik", "malik", "laktik", "askorbik", "asetik", "tartarik", "fumarik", "asit", "asitliği", "düzenleyici",
  "koruyucu", "koruyucular", "renklendirici", "tatlandırıcı", "kıvam", "artırıcı",
  "sorbitol", "maltitol", "ksilitol", "eritritol", "izomalt", "laktitol", "poliyol", "stevia", "steviol",
  "sakkarin", "sukraloz", "asesülfam", "aspartam",
  "peyniraltı", "peynir", "altı", "lor", "kaşar", "krem",
  "yumurta", "akı", "sarısı",
  "kahve", "çay", "yeşil", "siyah", "bitki", "bitkisel",
  "limon", "portakal", "elma", "çilek", "muz", "vişne", "kayısı", "şeftali", "üzüm", "ahududu", "böğürtlen",
  "yaban", "mersini", "kivi", "mango", "ananas", "nar", "greyfurt", "karpuz", "kavun", "erik",
  "domates", "patates", "soğan", "sarımsak", "biber", "salça", "salçası", "havuç", "bezelye", "turşu",
  "zeytinyağı", "zeytin", "zeytinyağlı", "ayçiçek", "ayçiçeği", "kanola", "kolza", "aspir", "susam", "susamlı",
  "hindistan", "cevizi",
  "tereyağı", "krema", "kreması", "kremalı", "kaymak", "yoğurt", "ayran", "kefir", "dondurma",
  "bal", "pekmez", "reçel", "reçeli", "marmelat", "marmelatı", "helva", "tahin", "pekmezli",
  "baharat", "baharatlar", "karışımı", "özütü", "özü", "ekstresi", "ekstraktı", "konsantresi", "konsantre",
  "lif", "lifi", "lifli", "protein", "proteini", "proteinli",
  "vitamin", "vitamini", "mineraller", "mineral", "kalsiyum", "demir", "çinko", "magnezyum", "potasyum", "sodyum", "fosfor", "iyot",
  "karamel", "karamelli", "kafein", "kafeinli", "kafeinsiz",
  "jelatin", "agar", "pektin", "guar", "gam", "ksantan", "keçiboynuzu", "selüloz", "jelleştirici",
  "alerjen", "içerir", "içerebilir", "eser", "miktarda", "bulunabilir", "uyarısı", "izleri",
  "içecek", "içeceği", "granül", "granülü", "çözünebilir", "hazır",
  "tarçın", "karanfil", "kakule", "zencefil", "zerdeçal", "kimyon", "kekik", "nane", "kırmızı",
  "çilekli", "limonlu", "elmalı", "muzlu", "portakallı", "şeftalili", "vişneli",
  "susuz", "pastörize", "homojenize", "fermente", "kurutulmuş", "dondurulmuş",
  "sığır", "tavuk", "hindi", "et", "kıyma", "sucuk", "salam", "sosis", "pastırma", "jambon", "kavurma",
  "balık", "ton", "hamsi", "sardalya", "somon",
  "mercimek", "nohut", "fasulye", "barbunya", "bulgur",
  "şehriye", "makarna", "erişte", "mantı",
  "içindekiler", "içerik", "bileşen", "bileşenler",
];

// normalize edilmiş (ascii) -> doğru yazım
export const TR_CORRECT = new Map<string, string>();
const TR_SET = new Set<string>();
for (const w of TR_WORDS) {
  TR_SET.add(w);
  const k = stripTR(w);
  if (k !== w && !TR_CORRECT.has(k)) TR_CORRECT.set(k, w);
}

export const EN_WORDS = new Set<string>([
  "sugar", "sugars", "palm", "oil", "fat", "fats", "wheat", "flour", "cocoa", "butter", "mass",
  "milk", "powder", "skimmed", "whole", "whey", "lecithin", "lecithins", "emulsifier", "emulsifiers",
  "flavouring", "flavourings", "flavoring", "flavorings", "natural", "salt", "water", "yeast", "vanillin",
  "vanilla", "starch", "glucose", "syrup", "fructose", "chocolate", "dark", "white", "hazelnut", "hazelnuts",
  "ground", "concentrated", "raising", "agents", "agent", "sodium", "bicarbonate", "ammonium", "hydrogen",
  "carbonate", "paste", "egg", "eggs", "lactose", "malt", "barley", "rice", "corn", "soy", "soya", "coconut",
  "cream", "cheese", "honey", "coffee", "tea", "caramel", "caffeine", "curcumin", "paprika", "extract",
  "fiber", "fibre", "protein", "gluten", "free", "contains", "traces", "may", "contain", "nut", "nuts",
  "peanut", "almond", "orange", "lemon", "apple", "strawberry", "banana", "cherry", "vegetable", "sunflower",
  "rapeseed", "canola", "shea", "mango", "dried", "fresh", "pasteurized", "coating", "filled", "wafer",
  "biscuit", "cookie", "crisp", "crisps", "yolk", "pasteurised", "anhydrous", "invert",
]);

export function isKnownWord(token: string): boolean {
  const lowTR = token.toLocaleLowerCase("tr-TR").replace(/i̇/g, "i");
  if (TR_SET.has(lowTR)) return true;
  if (EN_WORDS.has(token.toLocaleLowerCase("en-US"))) return true;
  return TR_CORRECT.has(stripTR(token));
}

// Erken çıkışlı Levenshtein (max mesafe aşılınca false)
export function levWithin(a: string, b: string, max = 1): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return false;
  let prev: number[] = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[lb] <= max;
}

export function fuzzyKnownTR(stripped: string, max = 1): string | null {
  if (stripped.length < 4) return null;
  for (const key of TR_CORRECT.keys()) {
    if (Math.abs(key.length - stripped.length) > max) continue;
    if (levWithin(stripped, key, max)) return TR_CORRECT.get(key) as string;
  }
  return null;
}

function matchCase(source: string, correct: string): string {
  const first = source.charAt(0);
  if (first && first === first.toLocaleUpperCase("tr-TR") && first !== first.toLocaleLowerCase("tr-TR")) {
    return correct.charAt(0).toLocaleUpperCase("tr-TR") + correct.slice(1);
  }
  return correct;
}

// Tek kelime onarımı: rakam karışması + aksan kaybı + küçük yazım kayması
export function repairToken(token: string): string | null {
  if (!/^[A-Za-zÇĞİÖŞÜçğiöşüâîûIı0-9]{2,}$/.test(token)) return null;
  if (/^\d+$/.test(token)) return null;
  const lowTR = token.toLocaleLowerCase("tr-TR").replace(/i̇/g, "i");
  if (TR_SET.has(lowTR)) return null;
  if (EN_WORDS.has(token.toLocaleLowerCase("en-US"))) return null;

  let cand = token;
  if (/\d/.test(cand)) {
    cand = cand
      .replace(/0/g, "o")
      .replace(/1/g, "ı")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/6/g, "g")
      .replace(/8/g, "b");
  }
  const s = stripTR(cand);
  const hit = TR_CORRECT.get(s);
  if (hit && hit !== lowTR) return matchCase(token, hit);
  if (s.length >= 4) {
    const f = fuzzyKnownTR(s, 1);
    if (f && f !== lowTR) return matchCase(token, f);
  }
  return null;
}

// Çok kelimeli yaygın ifadeler (doğru yazım, küçük harf)
const PHRASES: string[] = [
  "süt tozu", "tam yağlı", "yağsız süt", "kakao yağı", "kakao kitlesi", "kakao tozu",
  "buğday unu", "buğday nişastası", "mısır nişastası", "mısır şurubu",
  "glikoz şurubu", "fruktoz şurubu", "glukoz şurubu",
  "palm yağı", "palm çekirdeği yağı", "tam hidrojenize", "hidrojenize palm",
  "ayçiçek yağı", "hindistan cevizi", "kuru üzüm", "antep fıstığı", "yer fıstığı",
  "fındık püresi", "peynir altı suyu", "peyniraltı suyu", "yumurta akı", "yumurta akı tozu",
  "aroma verici", "aroma vericiler", "doğal aroma",
  "sitrik asit", "malik asit", "laktik asit", "askorbik asit",
  "sodyum benzoat", "potasyum sorbat", "monosodyum glutamat",
  "soya lesitini", "yulaf ezmesi", "tam buğday", "tam buğday unu", "çavdar unu",
  "sütlü çikolata", "bitter çikolata", "beyaz çikolata", "yağı azaltılmış kakao",
  "vanilya özütü", "limon suyu", "elma suyu", "yeşil çay",
  "esmer şeker", "pudra şekeri", "şeker pancarı", "invert şeker",
  "deniz tuzu", "sofra tuzu", "iyonize tuz", "iyotlu tuz",
  "kuru maya", "yaş maya", "ekşi maya",
];

const FLEX: Record<string, string> = {
  a: "[aâAÂ]", c: "[cçCÇ]", g: "[gğGĞ]", i: "[iıIİ]", o: "[oöOÖ]", s: "[sşSŞ]", u: "[uüUÜ]",
};

function flexWord(w: string): string {
  return w
    .split("")
    .map((ch) => {
      const low = ch.toLocaleLowerCase("tr-TR");
      if (FLEX[low]) return FLEX[low];
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
}

export function phraseFix(
  text: string,
  onFix?: (from: string, to: string) => void
): string {
  let out = text;
  for (const phrase of PHRASES) {
    const pattern = phrase.split(" ").map(flexWord).join("\\s+");
    // \b Türkçe harflerde çalışmaz → unicode harf sınırları kullan
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?![\\p{L}\\p{N}])`, "giu");
    out = out.replace(re, (m, pre: string, found: string) => {
      const fixed = matchCase(found, phrase);
      if (found !== fixed) onFix?.(found, fixed);
      return pre + fixed;
    });
  }
  return out;
}
