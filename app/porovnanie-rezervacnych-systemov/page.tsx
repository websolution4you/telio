import type { Metadata } from "next";
import ComparisonContent from "@/components/ComparisonContent";

const pageUrl = "https://telio.sk/porovnanie-rezervacnych-systemov";

export const metadata: Metadata = {
  title: "Porovnanie rezervačných systémov na Slovensku: Telio vs. Tradičné systémy vs. Recepčná",
  description:
    "Detailné porovnanie rezervačných systémov. Prečo bežný webový kalendár nestačí? Zistite, ako Telio spája online rezervácie a 24/7 AI telefonického asistenta a šetrí viac ako 1 300 € mesačne.",
  keywords: [
    "porovnanie rezervačných systémov",
    "najlepší rezervačný systém",
    "rezervačný systém alternatívy",
    "rezervačný systém pre firmy",
    "online rezervačný systém Slovensko",
    "Reservio alternatíva",
    "Bookio alternatíva",
    "virtuálna recepčná vs zamestnanec",
    "automatizácia rezervácií",
    "AI rezervácie",
    "telefonický asistent",
    "hlasový asistent",
    "Telio"
  ],
  alternates: { canonical: "/porovnanie-rezervacnych-systemov" },
  openGraph: {
    title: "Porovnanie rezervačných systémov: Telio vs. Tradičné systémy vs. Recepčná",
    description:
      "Prečo nestačí len webový kalendár? Pozrite si porovnanie nákladov, dostupnosti a funkcií moderných rezervačných systémov na Slovensku.",
    url: pageUrl,
    type: "article",
    locale: "sk_SK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Porovnanie rezervačných systémov Telio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Porovnanie rezervačných systémov: Telio vs. Web vs. Recepčná",
    description: "Porovnanie nákladov a funkcií rezervačných systémov na Slovensku.",
    images: ["/opengraph-image"],
  },
};

const faqs = [
  [
    "Prečo nestačí mať iba online rezervačný systém na webe?",
    "Až 40–60 % zákazníkov (najmä v službách, zdravotníctve a športe) stále radšej vezme telefón a zavolá, pretože chcú okamžité potvrdenie alebo majú špecifickú požiadavku. Ak vám v tom momente nikto nezdvihne, zákazník zvyčajne zavolá konkurencii. Telio tento problém rieši tým, že spojí online webový kalendár a automatického telefonistu 24/7 do jedného systému."
  ],
  [
    "V čom je Telio iné ako Reservio, Bookio alebo Reservanto?",
    "Tradičné nástroje poskytujú len webový rezervačný formulár. Ak zákazník zavolá na vaše telefónne číslo, systém nepomôže. Telio má vlastného AI hlasového asistenta v prirodzenej slovenčine, ktorý zdvihne telefón, odpovie na otázky a zapíše rezerváciu priamo do kalendára v reálnom čase."
  ],
  [
    "Môže Telio nahradiť bežnú recepčnú?",
    "Telio dokáže plne prevziať telefonickú agendu – dvíhanie rutinných hovorov, overovanie dostupnosti, zápis rezervácií a odpovede na bežné otázky. Vďaka tomu nemusíte platiť plný úväzok recepčnej (úspora 1 200 € – 1 800 € mesačne), prípadne existujúcej recepčnej odbremeníte ruky, aby sa mohla venovať zákazníkom priamo na prevádzke."
  ],
  [
    "Čo sa stane, keď volajú dvaja zákazníci súčasne?",
    "Kým bežná recepčná alebo pevná linka je pri druhom hovore obsadená a zákazník počuje len obsadzovací tón, Telio obsluhuje neobmedzený počet hovorov paralelne. Žiadny zákazník nečaká a žiadny hovor sa nestratí."
  ],
  [
    "Musím si kvôli Telio meniť telefónne číslo?",
    "Nie. Vaše existujúce telefónne číslo vám zostáva. Na vašom čísle sa iba nastaví jednoduché presmerovanie hovorov (napríklad pri nezdvihnutí alebo okamžité presmerovanie) na linku asistenta Telio."
  ],
  [
    "Ako sa Telio prepája s naším existujúcim kalendárom?",
    "Telio podporuje obojsmernú synchronizáciu s Google Kalendárom a vlastným rezervačným systémom. Všetky termíny vytvorené cez web alebo cez telefón vidíte okamžite na jednom mieste v reálnom čase."
  ]
];

export default function PorovnanieRezervacnychSystemovPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Porovnanie rezervačných systémov na Slovensku: Telio vs. Tradičné systémy vs. Recepčná",
      description:
        "Komplexná analýza a porovnanie rezervačných systémov na Slovensku z hľadiska nákladov, dostupnosti a funkcií.",
      author: {
        "@type": "Organization",
        name: "Telio",
        url: "https://telio.sk",
      },
      publisher: {
        "@type": "Organization",
        name: "Telio",
        logo: {
          "@type": "ImageObject",
          url: "https://telio.sk/opengraph-image",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
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
      <ComparisonContent faqs={faqs} />
    </>
  );
}
