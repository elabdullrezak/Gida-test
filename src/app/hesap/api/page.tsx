"use client";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Wifi } from "lucide-react";
import { TopBar, BottomNav } from "@/components/ui";

interface Status {
  clientId: string;
  hasToken: boolean;
  tokenPreview: string;
  tokenExpiry: string | null;
  version: string;
  build: string;
  lat: string;
  lng: string;
  country: string;
  customized: boolean;
}

const EMPTY = { clientId: "", token: "", version: "", build: "", lat: "", lng: "", country: "" };

export default function ApiSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/ingr", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error("Ayarlar yüklenemedi.");
      setStatus(d);
      setForm({ clientId: d.clientId || "", token: "", version: d.version || "", build: d.build || "", lat: d.lat || "", lng: d.lng || "", country: d.country || "" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Yüklenemedi." });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/settings/ingr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Kaydedilemedi.");
      setMsg({ ok: true, text: "API bilgileri güncellendi." });
      setForm((f) => ({ ...f, token: "" }));
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setMsg(null);
    try {
      const r = await fetch("/api/settings/ingr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "Bağlantı kurulamadı.");
      setMsg({ ok: true, text: d.message });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Test başarısız." });
    } finally {
      setTesting(false);
    }
  }

  async function reset() {
    if (!window.confirm("API bilgileri varsayılanlara dönsün mü? Kaydettiğin token silinir.")) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/settings/ingr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!r.ok) throw new Error("Sıfırlanamadı.");
      setMsg({ ok: true, text: "Varsayılanlara dönüldü." });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Sıfırlanamadı." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-page">
      <TopBar showBack />
      <section className="page-heading">
        <h1>API Bağlantısı</h1>
        <p>x-user-token süresi dolduğunda yenisini buradan gir. Bilgiler bu cihazın veritabanında saklanır, kimseyle paylaşılmaz.</p>
      </section>

      {loading ? (
        <div className="loader-row"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          <section className="mx-7 rounded-[22px] bg-[var(--card)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${status?.hasToken ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />
              {status?.hasToken ? "Token kayıtlı" : "Token girilmedi"}
              {status?.customized && <span className="ml-auto rounded-full bg-[var(--card2)] px-2.5 py-1 text-[11px] text-[var(--muted)]">özel ayar</span>}
            </div>
            {status?.tokenPreview && (
              <p className="mt-2 font-mono text-xs text-[var(--muted)]">{status.tokenPreview}</p>
            )}
            {status?.tokenExpiry && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Token bitişi: {new Date(status.tokenExpiry).toLocaleString("tr-TR")}
                {new Date(status.tokenExpiry).getTime() < Date.now() && (
                  <span className="ml-2 font-bold text-[var(--red)]">süresi dolmuş</span>
                )}
              </p>
            )}
            <button onClick={test} disabled={testing} className="outline-btn mt-4 w-full">
              {testing ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
              Bağlantıyı Test Et
            </button>
          </section>

          <section className="mx-7 mt-4 rounded-[22px] bg-[var(--card)] p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><KeyRound size={18} /> Yeni Bilgiler</h2>
            <p className="mb-4 text-xs leading-5 text-[var(--muted)]">Değiştirmek istemediğin alanı boş bırak. Token alanına yeni x-user-token değerini yapıştır.</p>
            <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-token">x-user-token (yeni)</label>
            <input id="f-token" type="text" autoComplete="off" spellCheck={false} value={form.token} onChange={set("token")} placeholder="eyJhbGciOi..." className="mb-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 font-mono text-xs" />
            <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-client">x-client-id</label>
            <input id="f-client" type="text" autoComplete="off" spellCheck={false} value={form.clientId} onChange={set("clientId")} placeholder="ebe4a23e-..." className="mb-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 font-mono text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-ver">x-client-version</label>
              <input id="f-ver" value={form.version} onChange={set("version")} placeholder="1.0.2.33" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 font-mono text-xs" /></div>
              <div><label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-build">x-client-build</label>
              <input id="f-build" value={form.build} onChange={set("build")} placeholder="33" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5 font-mono text-xs" /></div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div><label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-lat">Enlem</label>
              <input id="f-lat" value={form.lat} onChange={set("lat")} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 font-mono text-xs" /></div>
              <div><label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-lng">Boylam</label>
              <input id="f-lng" value={form.lng} onChange={set("lng")} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 font-mono text-xs" /></div>
              <div><label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="f-country">Ülke</label>
              <input id="f-country" value={form.country} onChange={set("country")} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 font-mono text-xs" /></div>
            </div>
            <button onClick={save} disabled={saving} className="primary-btn mt-4">
              {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} Kaydet
            </button>
            <button onClick={reset} disabled={saving} className="outline-btn mt-2 w-full">
              <RotateCcw size={17} /> Varsayılanlara Dön
            </button>
          </section>

          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`mx-7 mt-4 flex items-start gap-2 rounded-2xl p-4 text-sm ${msg.ok ? "bg-[var(--card)] text-[var(--green)]" : "bg-[#391610] text-[var(--red)]"}`}>
              {msg.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
              {msg.text}
            </p>
          )}
          <p className="mx-7 mt-4 text-center text-xs leading-6 text-[var(--subtle)]">Token’in süresi dolarsa ingr Android uygulamasından yeni bir x-user-token alıp buraya yapıştırman yeterli.</p>
        </>
      )}
      <BottomNav active="profile" />
    </main>
  );
}
