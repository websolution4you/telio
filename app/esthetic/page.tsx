import type { Metadata } from "next";
import { Sparkles, Phone, ShieldCheck, Heart, User, ChevronRight } from "lucide-react";
import VoiceAuraWidget from "@/components/esthetic/VoiceAuraWidget";
import ProcedureDetails from "@/components/esthetic/ProcedureDetails";
import EstheticCalendar from "@/components/esthetic/EstheticCalendar";

export const metadata: Metadata = {
  title: "Klinika Estetickej Medicíny — Telio Konzultácie",
  description: "Inteligentný rezervačný systém pre kliniku estetickej medicíny poháňaný hlasovým asistentom Telio.",
};

export default function EstheticPage() {
  return (
    <main 
      className="min-h-screen text-stone-200 antialiased relative overflow-hidden font-sans"
      style={{
        backgroundColor: "#08060a",
        fontFamily: "'Outfit', var(--font-poppins), system-ui, sans-serif",
      }}
    >
      {/* Premium ambient glows */}
      <div className="absolute left-1/4 top-0 w-[500px] h-[500px] rounded-full blur-[180px] opacity-10 pointer-events-none" style={{ backgroundColor: "#E0B478" }} />
      <div className="absolute right-1/4 bottom-0 w-[600px] h-[600px] rounded-full blur-[200px] opacity-10 pointer-events-none" style={{ backgroundColor: "#9c60e5" }} />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Minimalist Clinical Header */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-md bg-stone-950/20 w-full">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-center">
          <span className="font-serif text-xs sm:text-base md:text-lg tracking-[0.12em] md:tracking-[0.15em] font-medium text-amber-50/90 uppercase text-center">
            Klinika Estetickej Medicíny
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-8 pb-16 md:pt-12 md:pb-24 text-center max-w-4xl mx-auto px-6">
        <h1 
          className="text-4xl md:text-6xl font-serif font-light text-stone-100 tracking-wide leading-tight mb-6"
          style={{
            textShadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
          }}
        >
          Objednanie konzultácie <br className="hidden sm:inline" />
          <span className="font-normal italic text-amber-300/80">s odborníkom</span>
        </h1>

        <p className="text-sm md:text-base text-stone-400 max-w-xl mx-auto leading-relaxed mb-12">
          Pre zaistenie maximálnej bezpečnosti a najlepších výsledkov vyžaduje každý estetický zákrok predchádzajúcu osobnú konzultáciu s doktorkou. Náš inteligentný hlasový asistent Telio vám pomôže vybrať zákrok a okamžite zarezervuje voľný termín.
        </p>

        {/* Highlighted Voice Assistant Widget Component */}
        <div id="telio-voice-assistant" className="scroll-mt-24 transition-all duration-500 rounded-3xl">
          <VoiceAuraWidget />
        </div>
      </section>

      {/* Three Pillar Benefits Section */}
      <section className="relative z-10 py-16 border-t border-b border-white/5 bg-stone-950/20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="p-3 h-fit rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.15)", background: "rgba(224, 180, 120, 0.03)" }}>
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold tracking-wide text-amber-50 mb-1">
                Bezpečnosť na prvom mieste
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Konzultácia s lekárom pred zákrokom minimalizuje akékoľvek zdravotné riziká a prispôsobuje liečbu na mieru vašej anatómii.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 h-fit rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.15)", background: "rgba(224, 180, 120, 0.03)" }}>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold tracking-wide text-amber-50 mb-1">
                Odborný posudok a informácie
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Náš asistent aj doktorka vám vopred zodpovedajú všetky otázky týkajúce sa dĺžky zotavenia, cien a priebehu vybraného ošetrenia.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 h-fit rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.15)", background: "rgba(224, 180, 120, 0.03)" }}>
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold tracking-wide text-amber-50 mb-1">
                Rýchle rezervačné termíny
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Prepojenie hlasového asistenta s rezervačným systémom kliniky zaručuje, že vybraný voľný termín je okamžite zablokovaný pre vás.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Procedures Catalog Component Section */}
      <section id="procedury" className="relative z-10 py-24 px-6 scroll-mt-10">
        <div className="max-w-6xl mx-auto mb-12 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-serif text-stone-100 mb-2">
            Ponuka procedúr a detailné informácie
          </h2>
          <p className="text-xs md:text-sm text-stone-400 max-w-lg leading-relaxed">
            Vyberte si zákrok, o ktorý máte záujem. Následne môžete spustiť hlasovú konzultáciu pre získanie odpovedí a rezerváciu konkrétneho času.
          </p>
        </div>

        <ProcedureDetails />
      </section>

      {/* Read-only Calendar Component Section */}
      <section id="kalendar" className="relative z-10 py-20 px-6 border-t border-white/5 bg-stone-950/10 scroll-mt-10">
        <div className="max-w-6xl mx-auto mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-stone-100 mb-2">
            Aktuálna obsadenosť konzultačných miestností
          </h2>
          <p className="text-xs md:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            Prehľadný rozpis voľných hodín pre MUDr. Elenu Valovú a MUDr. Adrianu Šimkovú. Pre rezerváciu kliknite na voľný čas alebo zavolajte asistentovi.
          </p>
        </div>

        <EstheticCalendar />
      </section>

      {/* Subtle Clinical Footer */}
      <footer className="relative z-20 border-t border-white/5 py-12 text-center text-stone-500 text-xs">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="font-serif font-medium tracking-wider text-stone-400">
              KLINIKA ESTETICKEJ MEDICÍNY
            </span>
            <span className="text-[10px] text-stone-600 mt-0.5">
              Prvotriedna starostlivosť a anti-aging ošetrenia
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
            <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Klinika využíva inteligentného hlasového recepčného Telio.</span>
          </div>

          <div className="text-[10px] text-stone-600">
            © 2026 Klinika Estetickej Medicíny & Telio. Všetky práva vyhradené.
          </div>
        </div>
      </footer>
    </main>
  );
}
