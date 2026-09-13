import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import AboutUs from "@/components/AboutUs";
import AboutTelio from "@/components/AboutTelio";
import Waitlist from "@/components/Waitlist";
import Footer from "@/components/Footer";

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Telio",
      alternateName: ["Telio AI", "Telio Slovensko", "Telio Voice AI"],
      url: "https://telio.sk",
      logo: "https://telio.sk/opengraph-image",
      description:
        "Slovenský AI hlasový asistent a telefonický asistent pre firmy. Autonómne vybavuje hovory 24/7, zabezpečuje AI rezervácie termínov a AI objednávky.",
      areaServed: { "@type": "Country", name: "Slovensko" },
      sameAs: [
        "https://www.linkedin.com/in/kamil-bartko-3b4945400",
        "https://www.linkedin.com/in/peter-kalavsky-9ab56186",
      ],
      founder: [
        {
          "@type": "Person",
          name: "Kamil Bartko",
          jobTitle: "Co-founder & AI Architect",
          url: "https://www.linkedin.com/in/kamil-bartko-3b4945400",
        },
        {
          "@type": "Person",
          name: "Peter Kaľavský",
          jobTitle: "Co-founder & Product Lead",
          url: "https://www.linkedin.com/in/peter-kalavsky-9ab56186",
        },
      ],
      knowsAbout: [
        "hlasový asistent",
        "telefonický asistent",
        "AI hlasový asistent",
        "AI rezervácie",
        "AI objednávky",
        "telefonické rezervácie",
        "virtuálna recepčná",
        "automatizácia hovorov",
        "rezervačný systém",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Telio — AI hlasový asistent a rezervačný systém",
      operatingSystem: "All",
      applicationCategory: "BusinessApplication",
      url: "https://telio.sk",
      description:
        "Slovenský AI hlasový asistent a telefonický asistent pre automatizáciu hovorov, AI rezervácií a telefonických objednávok pre firmy.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "50",
          priceCurrency: "EUR",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Business",
          price: "99",
          priceCurrency: "EUR",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "400",
          priceCurrency: "EUR",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
        },
      ],
      featureList: [
        "Slovenský AI hlasový asistent a telefonický asistent 24/7",
        "Automatické AI rezervácie termínov a kurtov",
        "Telefonické AI objednávky jedla a odvozu",
        "Obojsmerná integrácia s Google Kalendárom",
        "Okamžité potvrdenia cez WhatsApp a SMS",
        "Prirodzená komunikácia v slovenčine s nízkou latenciou (< 2s)",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Čo je AI hlasový asistent a telefonický asistent Telio?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Telio je slovenský autonómny AI hlasový asistent a telefonický operátor pre firmy. Zdvihne každý prichádzajúci hovor 24/7 v prirodzenej slovenčine, odpovedá na otázky zákazníkov, vytvára rezervácie a spracováva objednávky bez potreby ľudskej obsluhy.",
          },
        },
        {
          "@type": "Question",
          name: "Ako fungujú AI rezervácie cez telefón?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Zákazník zavolá na telefónne číslo firmy, Telio s ním v reči preberie požadovanú službu a termín, overí voľnú kapacitu v reálnom čase v prepojenom kalendári alebo rezervačnom systéme a termín okamžite zapíše. Zákazníkovi obratom odošle SMS alebo WhatsApp potvrdenie.",
          },
        },
        {
          "@type": "Question",
          name: "Ako Telio prijíma a spracováva AI objednávky?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pri gastro prevádzkach alebo donáške Telio zaznamená vybrané jedlá z menu a adresu doručenia, ktorú overí cez Google Maps. Vypočíta predpokladaný čas doručenia a objednávku okamžite odošle do kuchyne alebo personálu.",
          },
        },
        {
          "@type": "Question",
          name: "Pre aké firmy a prevádzky je Telio vhodné?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Telio je ideálne pre kliniky a zubárov (virtuálna recepčná), športové centrá a kurty (rezervačný systém pre tenis, bedminton, squash), pizzerie a reštaurácie (AI objednávky), taxislužby (dispečing trás) a kadernícke salóny.",
          },
        },
        {
          "@type": "Question",
          name: "Hovorí Telio prirodzene po slovensky?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Áno, Telio hovorí plynulou, prirodzenou slovenčinou bez robotického prízvuku. Rozpoznáva slovenské názvy miest, ulíc, slangové výrazy a dokáže pohotovo reagovať do dvoch sekúnd.",
          },
        },
        {
          "@type": "Question",
          name: "Koľko stojí AI hlasový asistent Telio a je možné ho vyskúšať zadarmo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Telio ponúka bezplatnú 14-dňovú skúšobnú dobu bez nutnosti zadávať platobnú kartu. Ceny začínajú od 50 € mesačne za balík Starter, 99 € mesačne za balík Business a 400 € mesačne za balík Enterprise.",
          },
        },
      ],
    },
  ];

  return (
    <main style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <Hero />
      <AboutTelio />
      <Stats />
      <HowItWorks />
      <Features />
      <UseCases />
      <Pricing />
      <AboutUs />
      <Waitlist />
      <Footer />
    </main>
  );
}
