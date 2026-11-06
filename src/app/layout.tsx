import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Bachea: reporta baches en Ciudad de Guatemala", template: "%s | Bachea" },
  description: "Marca el bache en el mapa, adjunta una foto y sigue su estado hasta que quede tapado.",
};

export const viewport: Viewport = { themeColor: "#121a13", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT" className={`${barlow.variable} ${condensed.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
