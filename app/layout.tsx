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
    default: "Telio — AI hlasový asistent a telefonické rezervácie pre firmy",
    template: "%s | Telio",
    },
  description:
    "Telio je váš AI hlasový asistent 24/7. Zdvihne každý hovor, hovorí prirodzene po slovensky, rezervuje termíny v reálnom čase a nikdy si neberie voľno.",
  applicationName: "Telio",
  authors: [{ name: "Telio", url: "https://telio.sk" }],
  creator: "Telio",
  publisher: "Telio",
  keywords: ["AI hlasový asistent", "virtuálna recepčná", "automatizácia hovorov", "telefonické rezervácie", "Telio", "Slovensko", "AI operátor"],
  alternates: {
    canonical: "/",
    languages: { "sk-SK": "/" },
  },
  openGraph: {
    title: "Telio — AI hlasový asistent a telefonické rezervácie pre firmy",
    description: "24/7 AI hlasový operátor pre slovenské prevádzky a kliniky. Zabezpečuje rezervácie a dvíha každý hovor.",
    type: "website",
    url: "https://telio.sk",
    siteName: "Telio",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Telio — AI hlasový asistent pre firmy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Telio — AI hlasový asistent",
    description: "Už nikdy nezmeškajte telefonát od vášho zákazníka.",
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
