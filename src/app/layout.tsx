import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ingr — İçeriğini bil, bilinçli seç",
  description: "ingr veritabanıyla ürün içeriği, katkı maddeleri ve INGR Score. Barkod tara, son taramalarını gör, ürünlerini listelerde düzenle.",
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#11140e",viewportFit:"cover"};
export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="tr"><body><div className="app-shell">{children}</div></body></html>;
}
