import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";

const base=process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
fs.mkdirSync("artifacts/screens",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
const context=await browser.newContext({viewport:{width:480,height:1060},permissions:["camera"],ignoreHTTPSErrors:true});
const page=await context.newPage();
const errors=[];
const sourceRequests=[];
let testListId=null;
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>sourceRequests.push(r.url()));
page.on("dialog",d=>d.accept());
try {
  await page.goto(base+"/");
  await page.waitForSelector(".product-tile");
  await page.waitForTimeout(1600);
  assert.equal(await page.locator(".product-tile").count(),50);
  await page.screenshot({path:"artifacts/screens/home.png",fullPage:true});
  await page.getByRole("button",{name:"Detayı gör >",exact:true}).click();
  await page.getByRole("dialog",{name:"Sodyum Benzoat"}).waitFor();
  await page.getByRole("button",{name:"Kapat",exact:true}).click();
  console.log("Ana sayfa: 50 kart ve günlük ipucu penceresi çalışıyor.");

  await page.locator("nav").getByRole("link",{name:"Son Taramalar",exact:true}).click();
  await page.waitForSelector(".product-row");await page.waitForTimeout(1000);
  await page.screenshot({path:"artifacts/screens/history.png"});
  console.log("Geçmiş: "+await page.locator(".product-row").count()+" kart görüntülendi.");

  await page.locator("nav").getByRole("link",{name:"Listelerim",exact:true}).click();
  await page.waitForSelector(".list-tab");await page.waitForTimeout(600);
  await page.screenshot({path:"artifacts/screens/lists.png"});
  await page.getByRole("button",{name:"Yeni liste oluştur",exact:true}).click();
  await page.getByLabel("Liste adı").fill("Tarayıcı Kontrolü");
  const createdResponse=page.waitForResponse(r=>r.url().endsWith("/api/lists") && r.request().method()==="POST");
  await page.getByRole("button",{name:"Listeyi Oluştur",exact:true}).click();
  testListId=(await (await createdResponse).json()).list.id;
  await page.getByRole("tab",{name:"Tarayıcı Kontrolü",exact:true}).waitFor();
  await page.getByRole("button",{name:"Ürün Ekle",exact:true}).click();
  await page.getByRole("textbox",{name:"Ürün barkodu"}).fill("8697486773522");
  await page.getByRole("button",{name:"Listeye Ekle",exact:true}).click();
  await page.waitForSelector(".product-row");
  assert.ok((await page.locator(".product-row").innerText()).includes("Ravioli"));
  await page.getByRole("button",{name:"Liste seçenekleri"}).click();
  await page.getByRole("button",{name:"Listeyi sil",exact:true}).click();
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('[role="tab"]')).some(e=>e.textContent?.includes("Tarayıcı Kontrolü")));
  testListId=null;
  console.log("Listeler: oluştur, barkodla ürün ekle ve sil başarılı.");

  await page.locator(".nav-scan").click();
  await page.getByRole("heading",{name:"Barkod Tara",exact:true}).waitFor();
  await page.screenshot({path:"artifacts/screens/scanner.png",fullPage:true});
  await page.getByRole("button",{name:"Kamerayı Aç",exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.querySelector("video")?.srcObject));
  await page.getByRole("button",{name:"Kamerayı kapat",exact:true}).waitFor();
  await page.getByRole("button",{name:"Kamerayı kapat",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector("video")?.srcObject===null);
  console.log("Kamera: başladı, görüntü akışı oluştu ve kapatıldı.");

  await page.goto(base+"/urun/8697486773522");
  await page.getByRole("heading",{name:"Kurutulmuş Domatesli Ravioli 300 g",exact:true}).waitFor();
  await page.waitForSelector(".product-tile");
  assert.equal(await page.locator(".product-tile").count(),10);
  await page.screenshot({path:"artifacts/screens/product.png",fullPage:true});
  console.log("Ürün detayı: 10 benzer ürün görüntülendi.");

  await page.goto(base+"/yeni");await page.waitForSelector(".product-tile");
  assert.equal(await page.locator(".product-tile").count(),50);
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+"/kaydedilenler");await page.waitForSelector(".empty-list, .product-row");
  await page.screenshot({path:"artifacts/screens/lists-mobile.png"});
  await page.goto(base+"/");await page.waitForSelector(".product-tile");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:"artifacts/screens/home-mobile.png",fullPage:true});
  assert.deepEqual(errors,[]);
  assert.ok(!sourceRequests.some(u=>/openfoodfacts/i.test(u)));
  console.log("390px mobil taşma: yok. JavaScript hata sayısı: 0. Eski sağlayıcıya istek: 0.");
} finally {
  if(testListId) await context.request.delete(base+"/api/lists?listId="+encodeURIComponent(testListId));
  await browser.close();
}
