import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import AboutUs from "@/components/AboutUs";
import Waitlist from "@/components/Waitlist";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ background: "var(--bg)" }}>
      <Navbar />
      <Hero />
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
