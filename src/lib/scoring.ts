import { ADDITIVES_DB, lookupAdditive, normalizeAdditiveCode, RISK_DEDUCTION, type AdditiveRisk } from "./additives";

export interface Nutriments {
  energyKcal?: number | null;
  fat?: number | null;
  saturatedFat?: number | null;
  carbs?: number | null;
  sugars?: number | null;
  fiber?: number | null;
  protein?: number | null;
  salt?: number | null;
  sodium?: number | null;
}

export interface ScoreNote {
  title: string;
  description: string;
  severity: "yesil" | "sari" | "turuncu" | "kirmizi" | "mavi";
  icon: string;
}

export interface AdditiveResult {
  code: string;
  name: string;
  risk: AdditiveRisk;
  func: string;
  description: string;
}

export type IngredientRisk = "yesil" | "sari" | "turuncu" | "kirmizi";

export interface IngredientResult {
  name: string;
  risk: IngredientRisk;
}

export interface ScoreResult {
  score: number;
  label: string;
  range: string;
  color: string;
  additives: AdditiveResult[];
  ingredients: IngredientResult[];
  notes: ScoreNote[];
  breakdown: { label: string; points: number }[];
}

export function scoreLabelFor(score: number): { label: string; range: string; color: string; desc: string } {
  if (score >= 85) return { label: "Temiz İçerik", range: "85-100", color: "#2e7d4f", desc: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içermemektedir. Besin değeri yüksek ve tüketilebilir durumdadır." };
  if (score >= 70) return { label: "Dengeli İçerik", range: "70-84", color: "#7ddb94", desc: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içerme olasılığı düşük ürünlerdir. Besin değeri yönünden kontrollü ve dengeli tüketilebilir durumdadır." };
  if (score >= 50) return { label: "Ortalama İçerik", range: "50-69", color: "#e8d27d", desc: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içerebilen ürünlerdir. Besin değeri yönünden kontrollü ve dengeli tüketilebilir durumdadır." };
  if (score >= 30) return { label: "Düşük İçerik", range: "30-49", color: "#eda45f", desc: "Çoğunlukla olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içeren ürünlerdir. Besin değeri düşük olabileceğinden dengeli tüketilmesi önem taşımaktadır." };
  return { label: "Çok Düşük İçerik", range: "0-29", color: "#d33f3f", desc: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içeren ürünlerdir. Çoğunlukla ultra işlenmiş ürünler olup, besin değeri ve içerik kalitesi düşüktür." };
}

const TURKISH_NAME_MAP: Record<string, string> = {
  "tam yagli suttozu": "Tam Yağlı Süttozu",
  "yagsiz sut tozu": "Yağsız Süt Tozu",
  "kakao yagi": "Kakao Yağı",
  "kakao kitlesi": "Kakao Kitlesi",
  "sut yagi": "Süt Yağı",
  "seker": "Şeker",
  "bugday unu": "Buğday Unu",
  "palm yagi": "Palm Yağı",
  "aycicek yagi": "Ayçiçek Yağı",
  "misir nisastasi": "Mısır Nişastası",
  "glikoz surubu": "Glikoz Şurubu",
  "fruktoz": "Fruktoz",
  "dekstroz": "Dekstroz",
  "maltoz": "Maltoz",
  "laktoz": "Laktoz",
  "peynir alti suyu": "Peynir Altı Suyu",
  "aroma": "Aroma",
  "aroma verici": "Aroma Verici",
  "dogal aroma": "Doğal Aroma",
  "vanilin": "Vanilin",
  "kakao": "Kakao",
  "sut": "Süt",
  "yag": "Yağ",
  "tuz": "Tuz",
  "su": "Su",
  "maya": "Maya",
  "yumurta": "Yumurta",
  "yumurta aki": "Yumurta Akı",
  "yumurta aki tozu": "Yumurta Akı Tozu",
  "findik": "Fındık",
  "findik puresi": "Fındık Püresi",
  "fistik": "Fıstık",
  "ceviz": "Ceviz",
  "badem": "Badem",
  "soya": "Soya",
  "misir": "Mısır",
  "pirinc": "Pirinç",
  "yulaf": "Yulaf",
  "kepek": "Kepek",
  "bal": "Bal",
  "pekmez": "Pekmez",
  "limon": "Limon",
  "portakal": "Portakal",
  "elma": "Elma",
  "cilek": "Çilek",
  "muz": "Muz",
  "domates": "Domates",
  "patates": "Patates",
  "sogan": "Soğan",
  "sarimsak": "Sarımsak",
  "zeytinyagi": "Zeytinyağı",
  "tereyagi": "Tereyağı",
  "margarin": "Margarin",
  "krem": "Kremsi",
  "nisasta": "Nişasta",
  "tam hidrojenize palm yagi": "Tam Hidrojenize Palm Yağı",
  "palm cekirdegi yagi": "Palm Çekirdeği Yağı",
  "yagi azaltilmis kakao tozu": "Yağı Azaltılmış Kakao Tozu",
  "kakao tozu": "Kakao Tozu",
  "peyniralti suyu tozu": "Peyniraltı Suyu Tozu",
  "konsantre tereyagi": "Konsantre Tereyağı",
  "sutlu cikolata": "Sütlü Çikolata",
  "bitter cikolata": "Bitter Çikolata",
  "beyaz cikolata": "Beyaz Çikolata",
  "ogutulmus findik": "Öğütülmüş Fındık",
  "sodyum hidrojen karbonat": "Sodyum Hidrojen Karbonat",
  "amonyum hidrojen karbonat": "Amonyum Hidrojen Karbonat",
  "amonyum bikarbonat": "Amonyum Bikarbonat",
  "sut tozu": "Süt Tozu",
  "karanfil": "Karanfil",
};

// Türkçe güvenli küçük harf: "İ" → "i̇" (2 karakter) sorununu giderir,
// böylece "İnvert"/"İNVERT" gibi kelimeler de eşleşir.
function normTR(s: string): string {
  return s.toLocaleLowerCase("tr-TR").replace(/i̇/g, "i");
}

function titleTr(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length === 0 ? w : w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR")))
    .join(" ");
}

export function prettifyIngredient(raw: string): string {
  const cleaned = raw.replace(/^en:|^tr:|^fr:/i, "").replace(/[_-]+/g, " ").trim();
  const key = normTR(cleaned)
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c");
  if (TURKISH_NAME_MAP[key]) return TURKISH_NAME_MAP[key];
  const EN_MAP: Record<string, string> = {
    "sugar": "Şeker", "wheat flour": "Buğday Unu", "palm oil": "Palm Yağı", "sunflower oil": "Ayçiçek Yağı",
    "cocoa butter": "Kakao Yağı", "cocoa mass": "Kakao Kitlesi", "whole milk powder": "Tam Yağlı Süttozu",
    "skimmed milk powder": "Yağsız Süt Tozu", "milk fat": "Süt Yağı", "whey powder": "Peynir Altı Suyu Tozu",
    "glucose syrup": "Glikoz Şurubu", "fructose": "Fruktoz", "dextrose": "Dekstroz", "maltodextrin": "Maltodekstrin",
    "flavouring": "Aroma", "flavoring": "Aroma", "flavourings": "Aroma Verici", "flavorings": "Aroma Verici",
    "natural flavouring": "Doğal Aroma", "salt": "Tuz", "water": "Su",
    "yeast": "Maya", "egg": "Yumurta", "hazelnut": "Fındık", "peanut": "Yer Fıstığı", "almond": "Badem",
    "soya lecithin": "Soya Lesitini", "soy lecithin": "Soya Lesitini", "lecithin": "Lesitin", "lecithins": "Lesitin",
    "starch": "Nişasta", "corn starch": "Mısır Nişastası", "wheat starch": "Buğday Nişastası", "potato starch": "Patates Nişastası",
    "modified starch": "Modifiye Nişasta", "citric acid": "Sitrik Asit", "milk": "Süt", "cream": "Krema",
    "butter": "Tereyağı", "concentrated butter": "Konsantre Tereyağı", "butter oil": "Tereyağı", "anhydrous milk fat": "Susuz Süt Yağı",
    "milk powder": "Süt Tozu", "skimmed milk": "Yağsız Süt", "whole milk": "Tam Yağlı Süt",
    "cheese": "Peynir", "yoghurt": "Yoğurt", "yogurt": "Yoğurt", "honey": "Bal",
    "cocoa": "Kakao", "coffee": "Kahve", "tea": "Çay", "rice": "Pirinç", "oat": "Yulaf", "barley": "Arpa",
    "malt": "Malt", "vanilla": "Vanilya", "vanillin": "Vanilin", "coconut": "Hindistan Cevizi",
    "coconut oil": "Hindistan Cevizi Yağı", "shea butter": "Shea Yağı", "rapeseed oil": "Kanola Yağı",
    "emulsifier": "Emülgatör", "emulsifiers": "Emülgatörler", "raising agent": "Kabartıcı", "raising agents": "Kabartıcılar",
    "hydrogenated palm oil": "Hidrojenize Palm Yağı", "fully hydrogenated palm oil": "Tam Hidrojenize Palm Yağı",
    "palm kernel oil": "Palm Çekirdeği Yağı", "margarine": "Margarin", "whey": "Peynir Altı Suyu",
    "lactose": "Laktoz", "egg white": "Yumurta Akı", "egg yolk": "Yumurta Sarısı", "whole egg": "Tam Yumurta",
    "hazelnut paste": "Fındık Ezmesi", "ground hazelnuts": "Öğütülmüş Fındık", "ground almonds": "Öğütülmüş Badem",
    "cocoa powder": "Kakao Tozu", "fat reduced cocoa powder": "Yağı Azaltılmış Kakao Tozu",
    "fat-reduced cocoa powder": "Yağı Azaltılmış Kakao Tozu", "sodium bicarbonate": "Karbonat",
    "ammonium bicarbonate": "Amonyum Bikarbonat", "sodium hydrogen carbonate": "Sodyum Hidrojen Karbonat",
    "ammonium hydrogen carbonate": "Amonyum Hidrojen Karbonat",
    "milk chocolate": "Sütlü Çikolata", "dark chocolate": "Bitter Çikolata", "white chocolate": "Beyaz Çikolata",
    "cocoa butter substitute": "Kakao Yağı İkamesi", "glucose-fructose syrup": "Glikoz-Fruktoz Şurubu",
    "fructose-glucose syrup": "Fruktoz-Glikoz Şurubu", "invert sugar": "İnvert Şeker",
    "caramel": "Karamel", "caffeine": "Kafein", "curcumin": "Kurkumin", "paprika extract": "Paprika Ekstraktı",
    "whey protein": "Peynir Altı Suyu Proteini", "sodium acid carbonate": "Sodyum Hidrojen Karbonat",
    "ammonium acid carbonate": "Amonyum Hidrojen Karbonat", "lean cocoa": "Yağı Azaltılmış Kakao",
  };
  const lower = cleaned.toLocaleLowerCase("en-US");
  if (EN_MAP[lower]) return EN_MAP[lower];
  return titleTr(cleaned);
}

// 4 kademeli bileşen riski (orijinal ingr ile aynı renkler)
function classifyIngredient(name: string): IngredientRisk {
  const n = normTR(name);
  const nSugarSafe = n.replace(/şekersiz/g, "");

  // --- KIRMIZI: palm türevleri, hidrojenize yağ, margarin, trans, yüksek riskliler
  // NOT: "hidrojen karbonat" (karbonat) hidrojenize yağ DEĞİLDİR — ayrı tutulur
  if (/palm|hidrojenize|hidrojene|hydrogenated|margarin/.test(n)) return "kirmizi";
  if (/kakao yağı ikamesi|cocoa butter substitute/.test(n)) return "kirmizi";
  if (/(^|[\s(,;-])trans([\s),;.-]|$)/.test(n)) return "kirmizi";
  const red = ["nitrit", "nitrite", "nitrat", "nitrate", "aspartam", "aspartame", "tartrazin", "tartrazine",
    "allura", "ponso", "azorubin", "azoru", "karmoisin", "karmozin", "sunset", "eritrosin", "erythrosine",
    "titanyum", "titanium", "tbhq", "paraben", "monosodyum glutamat", "bromat", "bromate",
    "benzoat", "benzoik", "benzoic"];
  if (red.some((k) => n.includes(k))) return "kirmizi";
  if (/(^|[\s(-])bha([\s),.-]|$)/.test(n) || /(^|[\s(-])bht([\s),.-]|$)/.test(n)) return "kirmizi";
  if (/(^|[\s(,;-])msg([\s),;.-]|$)/.test(n)) return "kirmizi";

  // --- TURUNCU: şekerler, şuruplar, sentetik tatlandırıcılar, renklendiriciler, belirsiz aroma
  const orange = ["şeker", "seker", "sugar", "sakkaroz", "sucrose", "sakkarit", "glikoz", "glukoz", "glucose",
    "fruktoz", "fructose", "dekstroz", "dextrose", "maltoz", "maltose", "maltodekstrin", "maltodextrin",
    "şurup", "surup", "syrup", "invert", "dekstrin", "dextrin", "sukraloz", "sucralose", "sakkarin", "saccharin",
    "asesülfam", "acesulfame", "siklamat", "cyclamate", "neotam", "advantam", "renklendirici", "renk verici",
    "colour", "color", "boya", "karamel", "caramel", "brillant", "kinolin", "vanilin", "vanillin"];
  if (orange.some((k) => nSugarSafe.includes(k))) return "turuncu";
  // çikolata: sütlü/beyaz/sade (şekerli) → turuncu, bitter → sarı
  if (/çikolata|cikolata|chocolate|chocolat/.test(n)) {
    if (/bitter|dark/.test(n)) return "sari";
    return "turuncu";
  }
  if (n.includes("tatlandırıcı") || n.includes("tatlandirici") || n.includes("sweetener")) {
    if (n.includes("doğal") || n.includes("natural") || n.includes("stevia") || n.includes("eritritol")) return "sari";
    return "turuncu";
  }
  if (n.includes("aroma") || n.includes("flavour") || n.includes("flavor") || n.includes("lezzet")) {
    if (n.includes("doğal") || n.includes("natural")) return "sari";
    return "turuncu";
  }

  // --- YEŞİL istisnalar (sarı listeden önce): tam tahıllar
  if (/tam tahıl|whole grain|tam buğday|whole wheat|yulaf ezmesi|çavdar/.test(n)) return "yesil";

  // --- SARI: rafine unlar, süt tozları, nişasta, tuz, bitkisel yağlar, asitler, kıvam vericiler
  const yellow = ["nişasta", "nisasta", "starch", " unu", "flour", "irmik", "semolina", "süttozu",
    "süt tozu", "sut tozu", "milk powder", "peynir altı", "peyniraltı", "peyniralti", "whey", "laktoz", "lactose",
    "tuz", "salt", "sodyum", "sodium", "bitkisel yağ", "bitkisel yag", "vegetable oil", "vegetable fat",
    "ayçiçek", "aycicek", "sunflower", "kanola", "canola", "kolza", "rapeseed", "mısır yağı", "corn oil",
    "soya yağı", "soybean oil", "pamuk", "cottonseed", "lesitin", "lecithin", "emülgatör", "emulgator",
    "emulsifier", "kıvam", "kivam", "stabiliz", "asit", "acid", "fosfat", "phosphate", "sitrat", "citrate",
    "laktat", "lactate", "sorbat", "sorbate", "sülfit", "sulphite", "sulfit", "karragenan", "carrageenan",
    "ksantan", "xanthan", "guar", "selüloz", "selluloz", "cellulose", "poliyol", "polyol", "maltitol",
    "sorbitol", "izomalt", "isomalt", "ksilitol", "xylitol", "laktitol", "lactitol", "eritritol", "erythritol",
    "stevia", "steviol", "modifiye", "modified", "mono ", "digliserit", "diglyceride", "monogliser",
    "polirisinoleat", "pgpr", "datem", "laktilat", " ester", "agar", "jelatin", "gelatin", "maya özütü", "yeast extract",
    "kakao tozu", "cocoa powder", "pirinç", "rice", "mısır", "corn", "kabartıcı", "leavening",
    "karbonat", "bikarbonat", "koruyucu", "preservative", "antioksidan", "antioxidant", "topaklanma",
    "nem verici", "humectant", "jelleştirici", "gelling", "yumurta akı", "yumurta tozu", "egg white", "egg powder",
    "tereyağ", "butter", "krema", "cream", "kaymak", "süt yağı", "milk fat", "süt kreması",
    "kafein", "caffeine", "kola cevizi", "guarana", "azaltılmış", "azaltilmis"];
  if (yellow.some((k) => n.includes(k))) return "sari";
  if (/\be\s?\d{3,4}\b/i.test(n)) return "sari";
  return "yesil";
}

export function extractAdditiveCodes(ingredientsText: string, additivesTags: string[] = []): string[] {
  // normalized -> display (örn. E500 -> E500ii, orijinaldeki gibi göster)
  const found = new Map<string, string>();
  const add = (display: string) => {
    const norm = normalizeAdditiveCode(display);
    if (!/^E\d/.test(norm)) return;
    const prev = found.get(norm);
    if (!prev || display.length > prev.length) found.set(norm, display);
  };
  for (const t of additivesTags) {
    const clean = t.replace(/^(en|tr|fr|de|es|it|nl):/i, "").trim();
    const m = clean.match(/^E?(\d{3,4})([a-zA-Z]{0,3})$/i);
    if (m) add("E" + m[1] + m[2]);
  }
  const regex = /\bE\s?(\d{3,4})(ii|iii|i|a|b|c|d|e|f)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(ingredientsText)) !== null) {
    add("E" + m[1] + (m[2] || ""));
  }
  const lower = normTR(ingredientsText);
  const nameMap: [string, string][] = [
    ["sodyum benzoat", "E211"], ["benzoik asit", "E210"], ["potasyum sorbat", "E202"], ["sorbik asit", "E200"],
    ["sodyum nitrit", "E250"], ["sodyum nitrat", "E251"], ["askorbik asit", "E300"], ["sitrik asit", "E330"],
    ["lesitin", "E322"], ["lecithin", "E322"], ["monosodyum glutamat", "E621"], ["çin tuzu", "E621"],
    ["aspartam", "E951"], ["asesülfam", "E950"], ["acesulfame", "E950"], ["sukraloz", "E955"], ["sakkarin", "E954"],
    ["stevia", "E960"], ["steviol", "E960"], ["maltitol", "E965"], ["sorbitol", "E420"], ["ksilitol", "E967"], ["xylitol", "E967"],
    ["eritritol", "E968"], ["izomalt", "E953"], ["karragenan", "E407"], ["ksantan", "E415"], ["pektin", "E440"],
    ["titanyum dioksit", "E171"], ["tartrazin", "E102"], ["karmin", "E120"], ["beta karoten", "E160a"],
    ["fosforik asit", "E338"], ["sodyum fosfat", "E339"], ["malik asit", "E296"], ["laktik asit", "E270"],
    ["tbhq", "E319"], ["sodyum sorbat", "E201"], ["kalsiyum propiyonat", "E282"],
    ["sodyum propiyonat", "E281"], ["nisin", "E234"], ["natamisin", "E235"], ["sülfit", "E223"], ["sulfit", "E223"],
    ["karamel", "E150d"], ["antosiyanin", "E163"], ["pancar", "E162"], ["kurkumin", "E100"],
    ["tokoferol", "E306"], ["polisorbat", "E433"], ["guar", "E412"], ["agar", "E406"], ["selüloz", "E460"],
    ["karboksimetil", "E466"], ["mono ve digliserit", "E471"], ["monogliserit", "E471"],
    ["pgpr", "E476"], ["polirisinoleat", "E476"], ["sodyum aljinat", "E401"],
    ["potasyum nitrit", "E249"], ["potasyum nitrat", "E252"], ["amonyum fosfatit", "E442"], ["fosfatit", "E442"],
    ["sodyum alüminyum fosfat", "E541"], ["disodyum", "E631"],
  ];
  for (const [kw, code] of nameMap) {
    if (lower.includes(kw)) add(code);
  }
  if (/(^|[\s(,;-])bha([\s),;.-]|$)/.test(lower)) add("E320");
  if (/(^|[\s(,;-])bht([\s),;.-]|$)/.test(lower)) add("E321");
  if (/(^|[\s(,;-])msg([\s),;.-]|$)/.test(lower)) add("E621");
  // karbonatlar: amonyum olan E503, potasyum E501, kalsiyum E170, diğerleri E500 (TR + EN)
  if (/amonyum[^,;()]{0,30}karbonat|ammonium[^,;()]{0,30}carbonate/.test(lower)) add("E503");
  else if (/potasyum[^,;()]{0,25}karbonat|potassium[^,;()]{0,25}carbonate/.test(lower)) add("E501");
  else if (/kalsiyum[^,;()]{0,25}karbonat|calcium[^,;()]{0,25}carbonate/.test(lower)) add("E170");
  else if (/karbonat|hidrojen karbonat|bikarbonat|baking soda|kabartma tozu|carbonate/.test(lower)) add("E500");
  return Array.from(found.values());
}

export function parseIngredients(ingredientsText: string, ingredientsArray?: { text?: string; id?: string }[]): IngredientResult[] {
  let raws: string[] = [];
  if (ingredientsArray && ingredientsArray.length > 0) {
    raws = ingredientsArray.map((i) => (i.text || i.id || "").toString()).filter(Boolean);
  } else if (ingredientsText) {
    raws = ingredientsText.split(/[,;()]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 80 && !/^e\d/i.test(s) && !/^[\d%.,\s]+$/.test(s) && !/^%\d/.test(s));
  }
  const seen = new Set<string>();
  const out: IngredientResult[] = [];
  for (const r of raws.slice(0, 40)) {
    // yüzde bilgisini düşür ("sütlü çikolata %31,5" → "sütlü çikolata")
    const noPct = r.replace(/\s*\d+[.,]?\d*\s*%/g, "").trim();
    // bileşen hapında E kodu gösterme (katkılar ayrı kartlarda zaten var)
    const noCode = noPct.replace(/\s*\bE\s?\d{3,4}[a-z]{0,3}\b/gi, "").trim();
    if (!noCode || noCode.length < 2) continue;
    const pretty = prettifyIngredient(noCode);
    const key = normTR(pretty);
    if (seen.has(key) || key.length < 2) continue;
    seen.add(key);
    out.push({ name: pretty, risk: classifyIngredient(pretty) });
  }
  // risk şiddetine göre sırala: kırmızı, turuncu, sarı, yeşil (orijinaldeki gibi)
  const order: Record<string, number> = { kirmizi: 0, turuncu: 1, sari: 2, yesil: 3 };
  out.sort((a, b) => (order[a.risk] ?? 3) - (order[b.risk] ?? 3));
  return out;
}

const SEV_ORDER: Record<string, number> = { kirmizi: 0, turuncu: 1, sari: 2, mavi: 3, yesil: 4 };

export function buildNotes(params: {
  ingredientsText: string;
  additives: AdditiveResult[];
  nutriments: Nutriments;
  nova?: number | null;
}): ScoreNote[] {
  const { ingredientsText, additives, nutriments, nova } = params;
  const t = normTR(ingredientsText);
  const notes: ScoreNote[] = [];

  // --- orijinal ingr tarzı kritik notlar
  if (/margarin/.test(t)) notes.push({ title: "Margarin ve Türevlerini İçerir", description: "Margarin genellikle rafine bitkisel yağlardan üretilir ve yüksek oranda işlenmiştir. Doymuş yağ içeriği yüksek olabilir, trans yağ içerme riski taşır.", severity: "kirmizi", icon: "box" });

  if (/palm/.test(t)) notes.push({ title: "Palm Yağı ve Türevlerini İçerir", description: "Palm yağı ve türevleri (palm çekirdeği yağı, fraksiyonları) yüksek doymuş yağ içerir. Kalp sağlığı ve çevresel sürdürülebilirlik açısından tartışmalıdır.", severity: "kirmizi", icon: "droplet" });

  if (/hidrojenize|hidrojene|hydrogenated/.test(t)) notes.push({ title: "Hidrojenize Yağ İçerir", description: "Hidrojenize yağlar trans yağ içerebilir veya yüksek doymuş yağ içerir. Trans yağlar kalp-damar hastalıkları riskini artırır, mümkünse tüketiminden kaçının.", severity: "kirmizi", icon: "warn" });
  else if (/(^|[\s(,])trans([\s),.]|$)/.test(t)) notes.push({ title: "Trans Yağ Riski", description: "Trans yağ içerir veya içerebilir. Trans yağlar kalp-damar hastalıkları riskini artırır. Mümkünse tüketiminden kaçının.", severity: "kirmizi", icon: "warn" });

  if (/aroma|flavour|flavor|vanilin|vanillin/.test(t)) {
    if (/doğal aroma|dogal aroma|natural flavour|natural flavor/.test(t)) notes.push({ title: "Doğal Aroma İçerir", description: "Doğal kaynaklı aroma verici içerir. Yapay aromalara göre daha güvenli kabul edilir ancak yine de işlenmişlik göstergesidir.", severity: "sari", icon: "aroma" });
    else notes.push({ title: "Kaynağı Belirsiz Aroma Verici İçerir", description: "Aroma vericinin doğal mı yoksa yapay mı olduğu belirtilmemiş. Kaynağı belirsiz aromalar ultra işlenmişlik göstergesidir ve hassas kişilerde reaksiyon yapabilir.", severity: "turuncu", icon: "flask" });
  }

  if (/kafein|caffeine|kola cevizi|guarana/.test(t)) notes.push({ title: "Kafein İçerir", description: "Kafein içerir. Çocuklar, hamileler ve kafeine hassas kişilerin tüketimine dikkat etmesi önerilir.", severity: "sari", icon: "info" });

  const hasPolyol = /maltitol|sorbitol|ksilitol|xylitol|eritritol|erythritol|izomalt|laktitol|poliyol|polyol|e965|e967|e968|e953|e966|e420|e421/.test(t);
  if (hasPolyol) notes.push({ title: "Poliyol İçerir", description: "Şekersiz tatlandırıcılar (maltitol, sorbitol vb.) içerir. Aşırı tüketimde gaz, şişkinlik ve laksatif etki yapabilir. Günde 20-30 gram üzeri sindirim sorunlarına yol açabilir.", severity: "turuncu", icon: "help" });

  const hasSweetener = /aspartam|asesülfam|acesulfame|sukraloz|sucralose|sakkarin|saccharin|stevia|steviol|tatlandırıcı|sweetener|e950|e951|e954|e955|e960|e961|e962|neotam|siklamat/.test(t);
  if (hasSweetener) notes.push({ title: "Tatlandırıcı İçerir", description: "Yoğun tatlandırıcı içerir. Kalorisiz olsa da bağırsak mikrobiyotasını etkileyebilir ve tatlı isteğini artırabilir. DSÖ, uzun süreli kullanımını önermiyor.", severity: "sari", icon: "sweet" });

  if (/glikoz şurubu|glucose syrup|mısır şurubu|corn syrup|fruktoz şurubu|invert şurup|invert şeker|nişasta bazlı şeker|nbş|yüksek fruktoz/.test(t)) notes.push({ title: "Nişasta Bazlı Şeker İçerir", description: "Glikoz/fruktoz şurubu içerir. Kan şekerini hızla yükseltir, obezite ve insülin direnci riskini artırır.", severity: "turuncu", icon: "sugar" });

  if (/(^|[\s(,;])msg([\s),;.]|$)|monosodyum glutamat|e621|e622|e635|lezzet artırıcı|lezzet arttırıcı|çin tuzu/.test(t)) notes.push({ title: "Lezzet Arttırıcı İçerir", description: "MSG veya benzeri lezzet arttırıcı içerir. Hassas kişilerde baş ağrısı ve susuzluk yapabilir, aşırı tüketime teşvik eder.", severity: "sari", icon: "flavor" });

  if (/renklendirici|brillant|kinolin|karamel|caramel|e102|e110|e122|e124|e129|tartrazin|allura|ponso|azorubin|karmoisin|sunset/.test(t)) notes.push({ title: "Renklendirici İçerir", description: "Renklendirici içerir. Bazı sentetik boyalar (azo boyalar) çocuklarda hiperaktivite ile ilişkilendirilmiştir.", severity: "turuncu", icon: "color" });

  if (/koruyucu|preservative|benzoat|sorbat|nitrit|nitrat|sülfit|sulfit|e211|e250|e251|e202/.test(t)) notes.push({ title: "Koruyucu İçerir", description: "Raf ömrünü uzatan koruyucu içerir. Bazı koruyucular hassas kişilerde alerji ve hiperaktivite riski taşıyabilir.", severity: "sari", icon: "shield" });

  if (/buğday unu|bugday unu|wheat flour/.test(t) && !/tam buğday|tam bugday|whole wheat/.test(t)) notes.push({ title: "Rafine Un İçerir", description: "Rafine buğday unu içerir. Lif ve besin değeri düşüktür, kan şekerini hızlı yükseltir. Tam tahıllı alternatifler daha sağlıklıdır.", severity: "sari", icon: "wheat" });

  const sugars = nutriments.sugars ?? null;
  if (sugars !== null && sugars !== undefined) {
    if (sugars > 22.5) notes.push({ title: "Çok Yüksek Şeker", description: `100 gramda ${sugars} g şeker içerir. Günlük serbest şeker limitinin (50 g) yarısından fazlasını tek başına karşılayabilir.`, severity: "kirmizi", icon: "sugar" });
    else if (sugars > 12.5) notes.push({ title: "Yüksek Şeker", description: `100 gramda ${sugars} g şeker içerir. Porsiyon kontrolü ile tüketilmesi önerilir.`, severity: "turuncu", icon: "sugar" });
  }
  const salt = nutriments.salt ?? null;
  if (salt !== null && salt !== undefined) {
    if (salt > 1.5) notes.push({ title: "Yüksek Tuz", description: `100 gramda ${salt} g tuz içerir. Aşırı tuz tüketimi tansiyon ve kalp riskini artırır.`, severity: "kirmizi", icon: "salt" });
    else if (salt > 0.75) notes.push({ title: "Orta Seviye Tuz", description: `100 gramda ${salt} g tuz içerir. Günlük tuz limitinizin (5 g) önemli bir kısmını oluşturur.`, severity: "sari", icon: "salt" });
  }
  const sat = nutriments.saturatedFat ?? null;
  if (sat !== null && sat !== undefined && sat > 5) notes.push({ title: "Yüksek Doymuş Yağ", description: `100 gramda ${sat} g doymuş yağ içerir. Kalp sağlığı için doymuş yağın sınırlandırılması önerilir.`, severity: "turuncu", icon: "fat" });

  if (nova === 4) notes.push({ title: "Ultra İşlenmiş Ürün", description: "NOVA 4 grubundadır. Ultra işlenmiş gıdalar obezite, diyabet ve kalp hastalıkları ile ilişkilendirilmiştir.", severity: "kirmizi", icon: "factory" });

  if (/glutensiz|gluten-free/.test(t)) notes.push({ title: "Glutensiz", description: "Glutensiz olarak üretilmiştir. Çölyak hastaları ve gluten hassasiyeti olanlar için uygundur.", severity: "yesil", icon: "check" });

  if (/lif|fiber|tam tahıl|whole grain|kepek/.test(t)) notes.push({ title: "Lif İçerir", description: "Lif veya tam tahıl içerir. Sindirim ve tokluk açısından olumlu bir özelliktir.", severity: "yesil", icon: "leaf" });

  const highRiskCount = additives.filter((a) => a.risk === "YÜKSEK" || a.risk === "ÇOK YÜKSEK").length;
  if (highRiskCount >= 2) notes.push({ title: `${highRiskCount} Yüksek Riskli Katkı`, description: "Bu üründe birden fazla yüksek riskli katkı maddesi tespit edildi. Düzenli tüketimden kaçınılması önerilir.", severity: "kirmizi", icon: "flask" });

  if (notes.length === 0) {
    notes.push({ title: "Öne Çıkan Uyarı Yok", description: "Bu üründe dikkat çeken olumsuz bir bileşen tespit edilmedi. Dengeli tüketim önerilir.", severity: "yesil", icon: "check" });
  }
  notes.sort((a, b) => (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2));
  return notes.slice(0, 10);
}

export function calculateScore(params: {
  ingredientsText: string;
  additivesTags?: string[];
  nutriments: Nutriments;
  nova?: number | null;
  ingredientsArray?: { text?: string; id?: string }[];
}): ScoreResult {
  const { ingredientsText = "", additivesTags = [], nutriments, nova, ingredientsArray } = params;
  const codes = extractAdditiveCodes(ingredientsText, additivesTags);
  const additives: AdditiveResult[] = codes.map((code) => {
    const info = lookupAdditive(code);
    return { code, name: info.name, risk: info.risk, func: info.func, description: info.description };
  });
  additives.sort((a, b) => {
    const order: Record<string, number> = { "RISK YOK": 0, "DÜŞÜK": 1, "ORTA": 2, "YÜKSEK": 3, "ÇOK YÜKSEK": 4 };
    return (order[b.risk] ?? 2) - (order[a.risk] ?? 2);
  });

  const ingredients = parseIngredients(ingredientsText, ingredientsArray);

  // NOVA çıkarımı: internet verisi yoksa ultra işlenmişlik sinyallerinden tahmin et
  let effNova = nova ?? null;
  if (effNova == null) {
    const t = normTR(ingredientsText);
    const syrupy = /glikoz|glucose|şurup|surup|syrup|invert|maltodekstrin|maltodextrin/.test(t);
    if (additives.length >= 3 || (additives.length >= 1 && syrupy)) effNova = 4;
    else if (additives.length >= 1 || ingredients.length > 10) effNova = 3;
  }
  const notes = buildNotes({ ingredientsText, additives, nutriments, nova: effNova });

  let score = 100;
  const breakdown: { label: string; points: number }[] = [];

  let addDed = 0;
  for (const a of additives) {
    addDed += RISK_DEDUCTION[a.risk] ?? 8;
  }
  addDed = Math.min(addDed, 60);
  if (addDed > 0) {
    score -= addDed;
    breakdown.push({ label: `Katkı maddeleri (${additives.length})`, points: -addDed });
  }

  const s = nutriments;
  const sugars = s.sugars ?? 0;
  const satFat = s.saturatedFat ?? 0;
  const fat = s.fat ?? 0;
  const saltVal: number = s.salt ?? (s.sodium != null ? s.sodium * 2.5 : 0);
  const energy = s.energyKcal ?? 0;
  const protein = s.protein ?? 0;
  const fiber = s.fiber ?? 0;

  let nutDed = 0;
  if (sugars > 40) nutDed += 18;
  else if (sugars > 30) nutDed += 16;
  else if (sugars > 22.5) nutDed += 13;
  else if (sugars > 12.5) nutDed += 9;
  else if (sugars > 8) nutDed += 6;
  else if (sugars > 5) nutDed += 3;

  // boş kalorili şekerli içecekler (kola, gazoz, şıra vb.)
  const looksLikeDrink = fat < 1 && protein < 1 && fiber < 1 && sugars > 5;
  if (looksLikeDrink) nutDed += 10;

  if (satFat > 20) nutDed += 14;
  else if (satFat > 15) nutDed += 12;
  else if (satFat > 10) nutDed += 10;
  else if (satFat > 5) nutDed += 6;
  else if (satFat > 2) nutDed += 3;

  if (saltVal > 1.5) nutDed += 9;
  else if (saltVal > 0.75) nutDed += 5;
  else if (saltVal > 0.3) nutDed += 2;

  if (fat > 35) nutDed += 10;
  else if (fat > 30) nutDed += 8;
  else if (fat > 20) nutDed += 5;
  else if (fat > 10) nutDed += 2;

  if (energy > 550) nutDed += 8;
  else if (energy > 500) nutDed += 6;
  else if (energy > 400) nutDed += 4;
  else if (energy > 250) nutDed += 2;

  if (nutDed > 0) {
    nutDed = Math.min(nutDed, 45);
    score -= nutDed;
    breakdown.push({ label: "Besin değerleri", points: -nutDed });
  }

  let procDed = 0;
  if (effNova === 4) procDed += 8;
  else if (effNova === 3) procDed += 3;
  const ingCount = ingredients.length;
  if (ingCount > 18) procDed += 5;
  else if (ingCount > 12) procDed += 3;
  const low = normTR(ingredientsText);
  const hasSweetener = /aspartam|asesülfam|acesulfame|sukraloz|sucralose|sakkarin|saccharin|stevia|steviol|tatlandırıcı|sweetener|neotam|siklamat|cyclamate|e950|e951|e954|e955|e960|e961|e962/.test(low);
  const hasPolyol = /maltitol|sorbitol|ksilitol|xylitol|eritritol|erythritol|izomalt|laktitol|poliyol|polyol|e965|e967|e968|e953|e966|e420|e421/.test(low);
  if (hasSweetener) procDed += 8;
  if (hasPolyol) procDed += 6;
  if (low.includes("palm")) procDed += 5;
  if (/margarin/.test(low)) procDed += 4;
  if (low.includes("glikoz") || low.includes("glucose") || low.includes("mısır şurubu") || low.includes("corn syrup") || low.includes("fruktoz şurubu") || low.includes("invert")) procDed += 4;
  if (/hidrojenize|hidrojene|hydrogenated/.test(low) || /(^|[\s(,])trans([\s),.]|$)/.test(low)) procDed += 8;
  if (low.includes("aroma") || low.includes("flavour") || low.includes("flavor") || low.includes("vanilin") || low.includes("vanillin")) procDed += 2;
  if (/tartrazin|allura|ponso|azorubin|karmoisin|sunset|e102|e110|e122|e124|e129/.test(low)) procDed += 4;
  // NOT: "çikolata/chocolate" içindeki "kola/cola" hecesine takılmaması için kelime sınırlı eşleşme
  if (/(^|[\s(,;])(kola|cola)([\s),;.]|$)|gazoz|gazlı|carbonated/.test(low) && sugars > 5) procDed += 6;
  if (procDed > 0) {
    procDed = Math.min(procDed, 25);
    score -= procDed;
    breakdown.push({ label: "İşlenme düzeyi", points: -procDed });
  }

  // riskli bileşen cezası (kırmızı/turuncu haplar)
  const redCount = ingredients.filter((i) => i.risk === "kirmizi").length;
  const orangeCount = ingredients.filter((i) => i.risk === "turuncu").length;
  const ingDed = Math.min(redCount * 5, 25) + Math.min(orangeCount * 2, 12);
  if (ingDed > 0) {
    score -= ingDed;
    breakdown.push({ label: `Riskli bileşenler (${redCount + orangeCount})`, points: -ingDed });
  }

  // bonuslar
  let bonus = 0;
  if ((s.fiber ?? 0) >= 6) bonus += 3;
  else if ((s.fiber ?? 0) >= 3) bonus += 1;
  if ((s.protein ?? 0) >= 12) bonus += 2;
  if (additives.length === 0 && ingredients.length > 0 && ingredients.length <= 6) bonus += 4;
  if (bonus > 0) {
    score += bonus;
    breakdown.push({ label: "Olumlu özellikler", points: bonus });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Eksik veri kontrolü: puan şişmesin, kullanıcı aksiyona yönlendirilsin
  const hasNutrition = [nutriments.energyKcal, nutriments.fat, nutriments.carbs, nutriments.sugars, nutriments.salt, nutriments.protein].some((v) => v !== null && v !== undefined);
  const hasIngredients = ingredientsText.trim().length > 10;
  if (!hasNutrition) {
    notes.push({
      title: "Besin Değerleri Eksik",
      description: "Bu ürünün besin değerleri bulunamadı. Etiketin besin öğeleri tablosunu manuel ekleyerek puanın netleşmesini sağlayabilirsiniz.",
      severity: "mavi",
      icon: "info",
    });
    score = Math.min(score, 75);
  }
  if (!hasIngredients) {
    notes.push({
      title: "İçerik Listesi Eksik",
      description: "Bu ürünün içerik listesi bulunamadı. Etiketin İçindekiler bölümünün fotoğrafını çekerek veya içeriği yazarak analizi tamamlayabilirsiniz.",
      severity: "mavi",
      icon: "info",
    });
    score = Math.min(score, 70);
  }
  notes.sort((a, b) => (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2));

  const info = scoreLabelFor(score);
  return { score, label: info.label, range: info.range, color: info.color, additives, ingredients, notes, breakdown };
}

export function getAdditiveDetail(code: string) {
  return ADDITIVES_DB[normalizeAdditiveCode(code)] || lookupAdditive(code);
}
