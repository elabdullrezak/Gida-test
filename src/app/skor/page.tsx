"use client";

import { BottomNav, TopBar } from "@/components/ui";

export default function ScoreInfoPage() {
  const items = [
    { c: "#2e7d4f", t: "Temiz İçerik", r: "85-100", d: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içermemektedir. Besin değeri yüksek ve tüketilebilir durumdadır." },
    { c: "#7ddb94", t: "Dengeli İçerik", r: "70-84", d: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içerme olasılığı düşük ürünlerdir. Besin değeri yönünden kontrollü ve dengeli tüketilebilir durumdadır." },
    { c: "#e8d27d", t: "Ortalama İçerik", r: "50-69", d: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içerebilen ürünlerdir. Besin değeri yönünden kontrollü ve dengeli tüketilebilir durumdadır." },
    { c: "#eda45f", t: "Düşük İçerik", r: "30-49", d: "Çoğunlukla olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içeren ürünlerdir. Besin değeri düşük olabileceğinden dengeli tüketilmesi önem taşımaktadır." },
    { c: "#d33f3f", t: "Çok Düşük İçerik", r: "0-29", d: "Olumsuz sağlık etkisi saptanmış bileşen ve katkı maddesi içeren ürünlerdir. Çoğunlukla ultra işlenmiş ürünler olup, besin değeri ve içerik kalitesi düşüktür." },
  ];
  return (
    <div className="pb-32">
      <TopBar showBack />
      <h1 className="px-5 pt-2 text-2xl font-extrabold">INGR Score Nedir?</h1>
      <p className="px-5 pt-1 text-sm text-gray-400">100 üzerinden hesaplanır. Katkı maddeleri, besin değerleri ve işlenme düzeyi değerlendirilir.</p>
      <div className="mt-4 space-y-3 px-4">
        {items.map((it) => (
          <div key={it.r} className="rounded-3xl border border-[#262628] bg-[#161617] p-5">
            <div className="mb-2 flex items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-2xl" style={{ background: it.c }} />
              <span className="text-lg font-extrabold">{it.t}</span>
              <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: `${it.c}22`, color: it.c }}>{it.r}</span>
            </div>
            <p className="text-[15px] leading-relaxed text-gray-400">{it.d}</p>
          </div>
        ))}
        <div className="rounded-3xl border border-[#262628] bg-[#161617] p-5">
          <h3 className="font-extrabold">Nasıl hesaplanır?</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-400">
            <li>• <b className="text-white">Katkı maddeleri:</b> her katkı risk seviyesine göre 0-24 puan düşürür (maks. -60)</li>
            <li>• <b className="text-white">Besin değerleri:</b> yüksek şeker, tuz, doymuş yağ ve kalori puanı düşürür (maks. -45)</li>
            <li>• <b className="text-white">İşlenme düzeyi:</b> NOVA 4 ultra işlenmiş ürünler ek puan kaybeder (maks. -25)</li>
            <li>• <b className="text-white">Riskli bileşenler:</b> kırmızı bileşenler -5, turuncu bileşenler -2 puan (maks. -37)</li>
            <li>• <b className="text-white">Bonuslar:</b> lif, protein ve sade içerik +puan kazandırır</li>
            <li>• <b className="text-white">Eksik veri:</b> içeriği eksik ürünler en fazla 70, besin değeri eksikler en fazla 75 puan alır</li>
          </ul>
          <h3 className="mt-4 font-extrabold">Katkı risk puanları</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-[#16301f] p-2.5 text-center font-bold text-[#7ddb94]">RİSK YOK: -0</div>
            <div className="rounded-xl bg-[#33301c] p-2.5 text-center font-bold text-[#e8d27d]">DÜŞÜK: -5</div>
            <div className="rounded-xl bg-[#33241a] p-2.5 text-center font-bold text-[#eda45f]">ORTA: -10</div>
            <div className="rounded-xl bg-[#3a1d1d] p-2.5 text-center font-bold text-[#f0716f]">YÜKSEK: -16</div>
          </div>
        </div>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}
