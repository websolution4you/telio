import type { Metadata } from "next";
import ClinicVoiceAssistantContent from "@/components/ClinicVoiceAssistantContent";

const pageUrl = "https://telio.sk/ai-hlasovy-asistent-pre-kliniky";

export const metadata: Metadata = {
  title: "AI hlasový asistent pre kliniky",
  description: "Telio vybavuje administratívne hovory a objednávanie pacientov na klinike 24/7. AI hlasový asistent overí termín a odbremení personál.",
  keywords: ["AI hlasový asistent pre kliniky", "AI recepčná pre kliniku", "virtuálna recepčná pre kliniku", "objednávanie pacientov", "automatizácia hovorov klinika"],
  alternates: { canonical: "/ai-hlasovy-asistent-pre-kliniky" },
  openGraph: {
    title: "AI hlasový asistent pre kliniky | Telio",
    description: "Automatizujte administratívne hovory, objednávanie pacientov a organizačné otázky na klinike.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AI hlasový asistent Telio pre kliniky" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI hlasový asistent pre kliniky | Telio",
    description: "Administratívne hovory a objednávanie pacientov bez zbytočného čakania.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  ["Aké hovory môže Telio na klinike vybavovať?", "Telio môže riešiť administratívne požiadavky, napríklad objednanie na dostupný termín, organizačné informácie, otváracie hodiny alebo zaznamenanie požiadavky pre personál."],
  ["Poskytuje AI asistent zdravotné rady alebo diagnózu?", "Nie. Telio nenahrádza zdravotníckeho pracovníka, neurčuje diagnózu ani neposkytuje zdravotné odporúčania. Je určené na administratívnu komunikáciu podľa pravidiel kliniky."],
  ["Vie sa prepojiť s kalendárom kliniky?", "Telio podporuje Google Calendar. Pri inom systéme najprv overíme možnosti integrácie cez dostupné API a procesy konkrétnej kliniky."],
  ["Čo urobí pri zdravotnej alebo neštandardnej otázke?", "Postup určí klinika. Asistent môže oznámiť, že zdravotné otázky nevie posúdiť, zaznamenať kontakt alebo požiadavku odovzdať personálu podľa nastavených pravidiel."],
  ["Môže fungovať aj mimo ordinačných hodín?", "Áno. Telio môže prijímať administratívne hovory 24/7, vrátane večerov a víkendov, a tak znižovať počet zmeškaných telefonátov."],
  ["Ako chránite údaje volajúcich?", "Pri návrhu riešenia nastavujeme rozsah zbieraných údajov podľa účelu a procesu kliniky. Konkrétne spracovanie a integrácie je potrebné posúdiť individuálne vrátane príslušných povinností ochrany údajov."],
];

export default function ClinicVoiceAssistantPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "AI hlasový asistent Telio pre kliniky",
      serviceType: "Automatizácia administratívnych telefonátov a objednávania pacientov",
      provider: { "@type": "Organization", name: "Telio", url: "https://telio.sk" },
      areaServed: { "@type": "Country", name: "Slovensko" },
      audience: { "@type": "Audience", audienceType: "Kliniky a ambulancie" },
      url: pageUrl,
      description: "AI hlasový asistent pre administratívne hovory, organizačné informácie a objednávanie pacientov na klinikách.",
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
      <ClinicVoiceAssistantContent faqs={faqs} />
    </>
  );
}
