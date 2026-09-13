import type { Metadata } from "next";
import SalonBookingSystemContent from "@/components/SalonBookingSystemContent";

const pageUrl = "https://telio.sk/rezervacny-system-pre-salony";

export const metadata: Metadata = {
  title: "Rezervačný systém pre salóny, kaderníctva a barber shopy | Telio",
  description:
    "Rezervačný systém pre kaderníctva, barber shopy a salóny krásy. Zákazníci rezervujú cez web aj telefonát vďaka AI asistentovi. Automatické SMS pripomienky a prepojenie s Google Kalendárom.",
  keywords: [
    "rezervačný systém pre salóny",
    "rezervačný systém pre kaderníctva",
    "rezervačný systém pre barber shop",
    "rezervačný systém kaderníctvo",
    "online rezervácia kaderník",
    "online rezervácie salón krásy",
    "SMS pripomienky pre salóny",
    "virtuálna recepčná pre kaderníctvo",
    "AI rezervácie",
    "hlasový asistent",
    "telefonický asistent",
    "Telio",
    "Slovensko"
  ],
  alternates: { canonical: "/rezervacny-system-pre-salony" },
  openGraph: {
    title: "Rezervačný systém pre salóny a kaderníctva | Telio",
    description:
      "Rezervujte, kým striháte. Hlasový asistent Telio zdvihne hovory zákazníkov 24/7, zapíše termín do kalendára a pošle SMS pripomienku.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Rezervačný systém pre salóny Telio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rezervačný systém pre salóny a kaderníctva | Telio",
    description: "Rezervujte, kým striháte. AI telefonický asistent pre salóny krásy.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  [
    "Ako funguje rezervačný systém Telio pre kaderníctva a salóny?",
    "Zákazník si môže zarezervovať termín dvoma spôsobmi: cez prehľadný online kalendár na vašom webe alebo Instagrame, alebo zavolaním na vaše telefónne číslo. AI asistent Telio hovor zdvihne za 2 sekundy, zistí typ účesu/služby, preferovaného kaderníka a voľný termín v kalendári potvrdí. Všetky rezervácie máte na jednom mieste."
  ],
  [
    "Dokáže si zákazník vybrať konkrétneho kaderníka alebo barbera?",
    "Áno. Telio pozná váš tím aj rozvrh jednotlivých pracovníkov. Zákazník pri telefonáte alebo online povie meno svojho obľúbeného holiča a asistent overí termíny len pre daného človeka."
  ],
  [
    "Ako Telio znižuje počet zákazníkov, ktorí zabudnú prísť (no-shows)?",
    "Systém automaticky odošle potvrdzujúcu SMS správu po vytvorení termínu a pripomienkovú SMS 24 hodín pred návštevou. Zákazník má možnosť termín včas potvrdiť alebo preložiť, takže vám nevznikajú prázdne okná v rozvrhu."
  ],
  [
    "Musím počas strihania dvíhať telefón?",
    "Vôbec nie. To je hlavná výhoda Telio. Keď máte ruky v práci s nožnicami, strojčekom alebo farbou, Telio hovor vybaví za vás v príjemnej slovenčine bez toho, aby ste museli prerušiť prácu so zákazníkom."
  ],
  [
    "Dá sa systém prepojiť s Google Kalendárom?",
    "Áno. Telio sa priamo integruje s Google Kalendárom. Každý kaderník môže vidieť svoje termíny priamo vo svojom mobilnom telefóne v reálnom čase."
  ],
  [
    "Koľko stojí rezervačný systém pre salón?",
    "Základný balík Starter stojí 50 € mesačne (zahŕňa 100 minút hovorov). Najpopulárnejší balík Business pre vyťažené salóny stojí 99 € mesačne a zahŕňa 300 minút, plný dashboard a WhatsApp + SMS notifikácie. Systém si môžete otestovať na 14 dní zadarmo."
  ]
];

export default function RezervacnySystemPreSalonyPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Rezervačný systém pre salóny a kaderníctva Telio",
      serviceType: "Online a telefonický rezervačný systém pre kaderníctva, barber shopy a salóny krásy",
      provider: {
        "@type": "Organization",
        name: "Telio",
        url: "https://telio.sk",
      },
      areaServed: {
        "@type": "Country",
        name: "Slovensko",
      },
      url: pageUrl,
      description:
        "Moderný rezervačný systém a AI hlasový asistent pre kaderníctva, barber shopy a salóny krásy. Dvíhanie hovorov 24/7, výber stylistu a SMS pripomienky.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <SalonBookingSystemContent faqs={faqs} />
    </>
  );
}
