"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, ImagePlus, Loader2, X } from "lucide-react";

export default function BarcodeScanner({onDetected,disabled=false}:{onDetected:(barcode:string)=>void;disabled?:boolean}) {
  const video=useRef<HTMLVideoElement>(null);
  const file=useRef<HTMLInputElement>(null);
  const controls=useRef<{stop:()=>void} | null>(null);
  const mounted=useRef(true);
  const detected=useRef(false);
  const [active,setActive]=useState(false);
  const [starting,setStarting]=useState(false);
  const [reading,setReading]=useState(false);
  const [error,setError]=useState<string | null>(null);
  function stop() {
    controls.current?.stop();controls.current=null;
    const stream=video.current?.srcObject;
    if(stream instanceof MediaStream) stream.getTracks().forEach(t=>t.stop());
    if(video.current) video.current.srcObject=null;
    if(mounted.current) setActive(false);
  }
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop();};},[]);
  async function start() {
    if(starting || disabled) return;
    setStarting(true);setError(null);detected.current=false;
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("Kamera bu tarayıcıda kullanılamıyor. HTTPS üzerinden açın veya barkod fotoğrafını yükleyin.");
      const {BrowserMultiFormatReader}=await import("@zxing/browser");
      if(!video.current || !mounted.current) return;
      const reader=new BrowserMultiFormatReader();
      const control=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}},video.current,(result,_error,ctl)=>{
        if(!result || detected.current || !mounted.current) return;
        const code=result.getText().trim();
        if(!/^\d{4,14}$/.test(code)) return;
        detected.current=true;ctl.stop();stop();onDetected(code);
      });
      if(!mounted.current || detected.current) control.stop();
      else {controls.current=control;setActive(true);}
    } catch(e) {
      const name=e instanceof Error?e.name:"";
      const message=name==="NotAllowedError"?"Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilir veya barkodu elle yazabilirsin.":name==="NotFoundError"?"Kamera bulunamadı. Barkodu elle yaz veya fotoğraf yükle.":e instanceof Error?e.message:"Kamera açılamadı.";
      if(mounted.current) setError(message);
      stop();
    } finally {if(mounted.current)setStarting(false);}
  }
  async function fromFile(image:File | undefined) {
    if(!image) return;
    stop();setReading(true);setError(null);
    const url=URL.createObjectURL(image);
    try {
      const {BrowserMultiFormatReader}=await import("@zxing/browser");
      const result=await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      const code=result.getText().trim();
      if(!/^\d{4,14}$/.test(code)) throw new Error("Geçerli bir ürün barkodu okunamadı.");
      if(mounted.current)onDetected(code);
    } catch {if(mounted.current)setError("Barkod okunamadı. Barkod çizgilerinin tamamını net ve düz çekip yeniden dene.");}
    finally {URL.revokeObjectURL(url);if(mounted.current)setReading(false);}
  }
  return <section className="mx-7 mt-3 rounded-[24px] bg-[var(--card)] p-4">
    <div className="relative h-56 overflow-hidden rounded-[18px] bg-black">
      <video ref={video} autoPlay playsInline muted className={`h-full w-full object-cover ${active || starting?"":"opacity-0"}`}/>
      {!active && !starting && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[var(--muted)]"><ScanLine size={54} strokeWidth={1.2}/><span className="text-sm">Barkodu kameraya göster</span></div>}
      {active && <><div className="pointer-events-none absolute inset-x-7 inset-y-12 rounded-xl border-2 border-[var(--green)]"/><div className="scan-line pointer-events-none absolute left-7 right-7 h-0.5 bg-[var(--green)]"/><button onClick={stop} aria-label="Kamerayı kapat" className="absolute right-3 top-3 rounded-full bg-black/65 p-2 text-white"><X size={20}/></button></>}
      {starting && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="animate-spin text-[var(--green)]" size={32}/></div>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button onClick={active?stop:start} disabled={starting || disabled} className="outline-btn border-[var(--green)] text-[var(--green)]"><Camera size={18}/>{active?"Kapat":"Kamerayı Aç"}</button>
      <button onClick={()=>file.current?.click()} disabled={reading || disabled} className="outline-btn">{reading?<Loader2 className="animate-spin" size={18}/>:<ImagePlus size={18}/>}Fotoğraf Yükle</button>
    </div>
    <input ref={file} type="file" accept="image/*" className="hidden" onChange={e=>{fromFile(e.target.files?.[0]);e.target.value="";}}/>
    {error && <p role="alert" className="mt-3 text-xs leading-5 text-[var(--orange)]">{error}</p>}
  </section>;
}
