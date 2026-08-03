import type { Metadata } from "next";
import DentalReceptionistContent from "@/components/DentalReceptionistContent";

const pageUrl = "https://telio.sk/virtualna-recepcna-pre-zubara";

export const metadata: Metadata = {
  title: "Virtuálna recepčná pre zubára",
  description: "Virtuálna AI recepčná pre zubné ambulancie vybavuje administratívne hovory a rezervácie 24/7, aj keď sa personál venuje pacientovi.",
  keywords: ["virtuálna recepčná pre zubára", "AI recepčná pre zubnú ambulanciu", "hlasový asistent pre zubára", "objednávanie pacientov zubár", "telefonické rezervácie zubár"],
  alternates: { canonical: "/virtualna-recepcna-pre-zubara" },
  openGraph: {
    title: "Virtuálna recepčná pre zubára | Telio",
    description: "Menej zmeškaných hovorov a jednoduchšie objednávanie pacientov v zubnej ambulancii.",
    url: pageUrl,
    type: "website",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Virtuálna recepčná Telio pre zubné ambulancie" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Virtuálna recepčná pre zubára | Telio",
    description: "Administratívne hovory a objednávanie pacientov pre zubné ambulancie 24/7.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  ["Čo môže virtuálna recepčná v zubnej ambulancii vybaviť?", "Môže riešiť administratívne hovory, objednávanie na služby povolené ambulanciou, zmeny termínov, otváracie hodiny, adresu a ďalšie schválené organizačné informácie."],
  ["Vie objednávať na kontrolu alebo dentálnu hygienu?", "Áno, ak ambulancia tieto služby a ich dostupnosť sprístupní v prepojenom kalendári. Pravidlá, dĺžku termínu a potrebné údaje nastavíme podľa konkrétnej prevádzky."],
  ["Posúdi bolesť zuba alebo naliehavosť stavu?", "Nie. Telio neurčuje diagnózu, neposkytuje zdravotné rady ani neposudzuje naliehavosť zdravotného stavu. Pri zdravotnej otázke postupuje podľa bezpečných pravidiel zubnej ambulancie."],
  ["Dokáže pacient zmeniť alebo zrušiť termín?", "Takýto scenár vieme nastaviť podľa spôsobu identifikácie pacienta, pravidiel ambulancie a možností prepojeného kalendára alebo rezervačného systému."],
  ["Čo sa stane, ak je požadovaný termín obsadený?", "Recepčná môže ponúknuť dostupnú alternatívu alebo požiadavku zaznamenať a odovzdať personálu podľa nastaveného procesu."],
  ["Funguje aj vtedy, keď ambulancia neordinuje?", "Áno. Administratívne hovory môže prijímať 24/7. Rozsah informácií a úloh mimo ordinačných hodín určuje ambulancia."],
];

export default function DentalReceptionistPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Virtuálna recepčná Telio pre zubné ambulancie",
      serviceType: "AI recepčná pre administratívne hovory a objednávanie pacientov",
      provider: { "@type": "Organization", name: "Telio", url: "https://telio.sk" },
      areaServed: { "@type": "Country", name: "Slovensko" },
      audience: { "@type": "Audience", audienceType: "Zubné ambulancie" },
      url: pageUrl,
      description: "Virtuálna AI recepčná pre administratívne hovory, rezervácie a organizačné informácie zubných ambulancií.",
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
      <DentalReceptionistContent faqs={faqs} />
    </>
  );
}
