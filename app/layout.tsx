import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import ChatWidget from "@/components/ChatWidget";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({
  // Deployment trigger: 2026-04-18 (v3, git reconnected)
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Telio — AI hlasový asistent a telefonické rezervácie pre firmy",
  description:
    "Telio je váš AI hlasový asistent 24/7. Zdvihne každý hovor, hovorí prirodzene po slovensky, rezervuje termíny v reálnom čase a nikdy si neberie voľno.",
  keywords: ["AI hlasový asistent", "virtuálna recepčná", "automatizácia hovorov", "telefonické rezervácie", "Telio", "Slovensko", "AI operátor"],
  openGraph: {
    title: "Telio — AI hlasový asistent a telefonické rezervácie pre firmy",
    description: "24/7 AI hlasový operátor pre slovenské prevádzky a kliniky. Zabezpečuje rezervácie a dvíha každý hovor.",
    type: "website",
    url: "https://telio.sk",
    siteName: "Telio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telio — AI hlasový asistent",
    description: "Už nikdy nezmeškajte telefonát od vášho zákazníka.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk" className="dark">
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        <LangProvider>
          {children}
          {/* <ChatWidget /> */}
          <CookieConsent />
        </LangProvider>
      </body>
    </html>
  );
}
