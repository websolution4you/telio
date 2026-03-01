import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Telio — Your Business, Always on the Line",
  description:
    "Telio je váš AI hlasový agent 24/7. Zdvihne každý hovor, hovorí prirodzene po slovensky, rezervuje termíny, dispečuje taxíky — a nikdy si nezobrať voľno.",
  keywords: ["AI call agent", "virtual receptionist", "voice AI", "taxi dispatch AI", "restaurant booking AI", "Telio", "Slovakia"],
  openGraph: {
    title: "Telio — Your Business, Always on the Line",
    description: "24/7 AI voice agent for Slovak businesses. Books tables, dispatches taxis, handles every call.",
    type: "website",
    url: "https://telio.sk",
    siteName: "Telio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telio — AI Voice Agent",
    description: "Never miss a customer call again.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
