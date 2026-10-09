import "dotenv/config";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { db, pool } from "@/db";
import { scans, products } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

async function main() {
  const barcode="80052760";
  const cutoff=new Date();
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto("http://127.0.0.1:3000/tara");
    const data=await page.evaluate(()=>{
      const code="80052760";
      const left=["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
      const invert=(s:string)=>s.split("").map(c=>c==="0"?"1":"0").join("");
      const bits="101"+code.slice(0,4).split("").map(d=>left[Number(d)]).join("")+"01010"+code.slice(4).split("").map(d=>invert(left[Number(d)])).join("")+"101";
      const canvas=document.createElement("canvas");canvas.width=(bits.length+30)*4;canvas.height=220;
      const ctx=canvas.getContext("2d")!;ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,220);ctx.fillStyle="black";
      bits.split("").forEach((b,i)=>{if(b==="1")ctx.fillRect((i+15)*4,12,4,170);});
      ctx.font="20px monospace";ctx.textAlign="center";ctx.fillText(code,canvas.width/2,208);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const scanResponse=page.waitForResponse(r=>r.url().endsWith("/api/product")&&r.request().method()==="POST");
    await page.locator('input[type="file"]').setInputFiles({name:"bueno-barcode.png",mimeType:"image/png",buffer:Buffer.from(data,"base64")});
    const res=await scanResponse;assert.equal(res.status(),200);
    const result=await res.json();assert.equal(result.product.barcode,barcode);assert.equal(result.product.source,"ingr");assert.equal(result.product.score,20);
    await page.waitForURL("**/urun/80052760");
    await page.getByRole("heading",{name:/Bueno/}).waitFor();
    console.log("EAN-8 fotoğrafı başarıyla okundu → ingr Bueno (20 puan).");
    const testRows=await db.select().from(scans).where(and(eq(scans.barcode,barcode),gte(scans.createdAt,cutoff)));
    assert.equal(testRows.length,1);
    console.log("Barkod okutma tek kayıt oluşturdu; ürün açılışı ek tarama oluşturmadı.");
  } finally {
    // Yalnızca bu testin oluşturduğu tarama kayıtlarını kaldır; kullanıcı verilerine dokunma.
    const removed=await db.delete(scans).where(and(eq(scans.barcode,barcode),gte(scans.createdAt,cutoff))).returning();
    if(removed.length) await db.update(products).set({scanCount:sql`greatest(0, coalesce(${products.scanCount},0)-${removed.length})`}).where(eq(products.barcode,barcode));
    await browser.close();
    await pool.end();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
