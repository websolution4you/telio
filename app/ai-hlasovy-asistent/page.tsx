import type { Metadata } from "next";
import AiVoiceAssistantContent from "@/components/AiVoiceAssistantContent";

const pageUrl = "https://telio.sk/ai-hlasovy-asistent";

export const metadata: Metadata = {
  title: "AI hlasový asistent pre firmy",
  description: "AI hlasový asistent Telio vybavuje telefonáty, rezervácie a otázky zákazníkov 24/7. Prirodzená slovenčina, kalendár a firemné integrácie.",
  keywords: ["AI hlasový asistent", "hlasový AI asistent", "AI telefonický asistent", "AI operátor", "automatizácia telefonátov", "virtuálna recepčná"],
  alternates: { canonical: "/ai-hlasovy-asistent" },
  openGraph: {
    title: "AI hlasový asistent pre firmy | Telio",
    description: "Automatizujte firemné telefonáty a rezervácie pomocou slovenského AI hlasového asistenta dostupného 24/7.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AI hlasový asistent Telio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI hlasový asistent pre firmy | Telio",
    description: "Telio vybavuje telefonáty, rezervácie a otázky zákazníkov 24/7.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  ["Čo je AI hlasový asistent?", "AI hlasový asistent je softvérový operátor, ktorý vedie telefonický rozhovor prirodzeným hlasom. Rozpozná zámer volajúceho a podľa nastaveného scenára vykoná úlohu, napríklad vytvorí rezerváciu."],
  ["Dokáže Telio hovoriť po slovensky?", "Áno. Telio je navrhnuté na prirodzenú komunikáciu v slovenčine a podľa potreby môže obsluhovať zákazníkov aj v ďalších jazykoch."],
  ["Môže sa prepojiť s naším kalendárom alebo systémom?", "Áno. Telio môže pracovať s kalendárom, notifikáciami a ďalšími systémami cez dostupné integrácie alebo API."],
  ["Čo sa stane, keď požiadavku nedokáže vyriešiť?", "Asistent môže požiadavku zaznamenať, odoslať upozornenie personálu alebo hovor presmerovať podľa dohodnutých pravidiel."],
  ["Ako dlho trvá nasadenie?", "Čas závisí od zložitosti scenára a integrácií. Po úvodnej konzultácii pripravíme hlasový scenár, znalosti, testovanie a plán nasadenia."],
];

export default function AiHlasovyAsistentPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "AI hlasový asistent Telio",
      serviceType: "AI hlasový asistent a automatizácia telefonátov",
      provider: { "@type": "Organization", name: "Telio", url: "https://telio.sk" },
      areaServed: { "@type": "Country", name: "Slovensko" },
      url: pageUrl,
      description: "AI hlasový asistent pre firmy, ktorý vybavuje telefonáty, rezervácie a zákaznícke požiadavky 24/7.",
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
      <AiVoiceAssistantContent faqs={faqs} />
    </>
  );
}
