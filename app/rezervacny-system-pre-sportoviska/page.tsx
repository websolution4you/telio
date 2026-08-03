import type { Metadata } from "next";
import SportsBookingSystemContent from "@/components/SportsBookingSystemContent";

const pageUrl = "https://telio.sk/rezervacny-system-pre-sportoviska";

export const metadata: Metadata = {
  title: "Rezervačný systém pre športoviská a kurty",
  description: "Online a AI rezervačný systém pre tenisové, squashové a badmintonové kurty. Rezervácie cez web aj telefonát, kalendár a správa športoviska.",
  keywords: ["rezervačný systém pre športoviská", "rezervačný systém pre tenisové kurty", "online rezervácia kurtu", "rezervácia tenisového kurtu", "rezervácia squash kurtu", "rezervácia badmintonového kurtu", "AI rezervácia", "telefonická rezervácia kurtu", "správa kurtov"],
  alternates: { canonical: "/rezervacny-system-pre-sportoviska" },
  openGraph: {
    title: "Rezervačný systém pre športoviská a kurty | Telio",
    description: "Spojte online kalendár a automatické telefonické rezervácie pre tenis, squash a badminton.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Rezervačný systém Telio pre športoviská" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rezervačný systém pre športoviská | Telio",
    description: "Online a AI rezervácie kurtov cez web aj telefonát.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  ["Pre aké športoviská je rezervačný systém vhodný?", "Systém je vhodný najmä pre tenisové, squashové a badmintonové alebo bedmintonové kurty. Nastavenie vieme prispôsobiť aj ďalším športom, priestorom a prevádzkovým pravidlám."],
  ["Môže si hráč rezervovať kurt online?", "Áno. Hráč si v kalendári vyberie šport, dátum, voľný kurt a čas. Po prihlásení vytvorí rezerváciu a neskôr ju môže spravovať vo svojom prehľade."],
  ["Ako funguje rezervácia kurtu cez telefón?", "AI hlasový asistent zistí šport, deň a preferovaný čas, overí dostupnosť a podľa nastaveného scenára vytvorí rezerváciu bez zásahu recepcie."],
  ["Zabráni systém dvojitej rezervácii?", "Pri vytváraní rezervácie kontroluje obsadenosť vybraného kurtu a času. Webový kalendár zároveň priebežne zobrazuje aktuálne rezervácie."],
  ["Dá sa kurt zablokovať pre údržbu?", "Áno. Prevádzka môže evidovať blokované časy alebo údržbu, aby sa v danom období nedal kurt rezervovať."],
  ["Vie zákazník rezerváciu zrušiť?", "Prihlásený používateľ môže spravovať svoje rezervácie. Konkrétne podmienky rušenia a časové obmedzenia nastavíme podľa pravidiel športoviska."],
  ["Má prevádzkovateľ prehľad o rezerváciách?", "Áno. Administratívny prehľad môže zobrazovať rezervácie, zákazníkov, obsadenosť a zdroj rezervácie, napríklad web alebo hlasového asistenta."],
];

export default function SportsBookingSystemPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Telio rezervačný systém pre športoviská",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: pageUrl,
      description: "Online a AI rezervačný systém pre tenisové, squashové a badmintonové kurty s webovým kalendárom a telefonickými rezerváciami.",
      provider: { "@type": "Organization", name: "Telio", url: "https://telio.sk" },
      offers: { "@type": "Offer", availability: "https://schema.org/OnlineOnly", priceCurrency: "EUR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <SportsBookingSystemContent faqs={faqs} />
    </>
  );
}
