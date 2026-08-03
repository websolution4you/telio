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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Telio",
    url: "https://telio.sk",
    description: "AI hlasový asistent pre slovenské firmy, ktorý vybavuje hovory a rezervácie 24/7.",
    areaServed: { "@type": "Country", name: "Slovensko" },
  };

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
