import type { Metadata } from "next";
import PhoneBookingSystemContent from "@/components/PhoneBookingSystemContent";

const pageUrl = "https://telio.sk/telefonicky-rezervacny-system";

export const metadata: Metadata = {
  title: "Telefonický rezervačný systém s AI",
  description: "Telio prijíma rezervácie cez telefón 24/7, overí dostupnosť v kalendári a vytvorí termín počas hovoru. AI rezervačný systém pre firmy.",
  keywords: ["telefonický rezervačný systém", "AI rezervačný systém", "automatické telefonické rezervácie", "rezervácie cez telefón", "hlasové rezervácie"],
  alternates: { canonical: "/telefonicky-rezervacny-system" },
  openGraph: {
    title: "Telefonický rezervačný systém s AI | Telio",
    description: "Automatizujte prijímanie telefonických rezervácií, kontrolu dostupnosti a zápis termínov do kalendára.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Telefonický rezervačný systém Telio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Telefonický rezervačný systém s AI | Telio",
    description: "Telio prijíma telefonické rezervácie a zapisuje termíny do kalendára 24/7.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  ["Ako funguje telefonický rezervačný systém?", "Zákazník zavolá na firemné číslo, Telio zistí požadovanú službu a termín, overí dostupnosť a podľa nastavených pravidiel vytvorí rezerváciu."],
  ["Vie sa Telio prepojiť s naším kalendárom?", "Áno. Telio podporuje prácu s Google Calendar a podľa konkrétneho systému vieme posúdiť aj ďalšie integrácie cez dostupné API."],
  ["Môže zákazník rezervovať aj mimo pracovného času?", "Áno. Hlasový asistent môže prijímať hovory a rezervácie 24 hodín denne vrátane večerov, víkendov a sviatkov."],
  ["Dokáže zákazník termín zmeniť alebo zrušiť?", "Zmenu a zrušenie rezervácie vieme nastaviť podľa identifikácie zákazníka, pravidiel prevádzky a možností používaného kalendára alebo rezervačného systému."],
  ["Čo ak požadovaný termín nie je voľný?", "Telio môže ponúknuť iný dostupný termín alebo požiadavku zaznamenať a odovzdať personálu podľa dohodnutého scenára."],
  ["Kde firma uvidí vytvorené rezervácie?", "Rezervácie môžu byť zapísané v prepojenom kalendári a podľa nasadenia aj v internom prehľade alebo dashboarde."],
];

export default function PhoneBookingSystemPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Telefonický rezervačný systém Telio",
      serviceType: "AI telefonické rezervácie",
      provider: { "@type": "Organization", name: "Telio", url: "https://telio.sk" },
      areaServed: { "@type": "Country", name: "Slovensko" },
      url: pageUrl,
      description: "AI rezervačný systém, ktorý telefonicky overuje dostupnosť a vytvára rezervácie v kalendári 24/7.",
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
      <PhoneBookingSystemContent faqs={faqs} />
    </>
  );
}
