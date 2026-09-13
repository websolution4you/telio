import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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
  metadataBase: new URL("https://telio.sk"),
  title: {
    default: "Telio — AI hlasový asistent, telefonický asistent a AI rezervácie",
    template: "%s | Telio",
  },
  description:
    "Telio je slovenský AI hlasový asistent a telefonický asistent 24/7. Vybavuje hovory v prirodzenej slovenčine, zabezpečuje AI rezervácie termínov a prijíma AI objednávky pre firmy.",
  applicationName: "Telio",
  authors: [{ name: "Telio", url: "https://telio.sk" }],
  creator: "Telio",
  publisher: "Telio",
  keywords: [
    "hlasový asistent",
    "telefonický asistent",
    "AI hlasový asistent",
    "AI rezervácie",
    "AI objednávky",
    "telefonické rezervácie",
    "virtuálna recepčná",
    "automatizácia hovorov",
    "automatizácia telefonátov",
    "AI operátor",
    "rezervačný systém",
    "rezervačný systém pre kliniky",
    "rezervačný systém pre športoviská",
    "Telio",
    "Slovensko"
  ],
  alternates: {
    canonical: "/",
    languages: { "sk-SK": "/" },
  },
  openGraph: {
    title: "Telio — Slovenský AI hlasový asistent, telefonický asistent a AI rezervácie",
    description: "24/7 slovenský AI hlasový operátor pre firmy, kliniky a športoviská. Zabezpečuje AI rezervácie, vybavuje AI objednávky a dvíha každý hovor.",
    type: "website",
    url: "https://telio.sk",
    siteName: "Telio",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Telio — AI hlasový asistent pre firmy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Telio — AI hlasový asistent a telefonické rezervácie",
    description: "Slovenský AI hlasový asistent pre firmy. Už nikdy nezmeškajte telefonát ani rezerváciu od zákazníka.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        <GoogleAnalytics />
        <LangProvider>
          {children}
          {/* <ChatWidget /> */}
          <CookieConsent />
        </LangProvider>
      </body>
    </html>
  );
}
