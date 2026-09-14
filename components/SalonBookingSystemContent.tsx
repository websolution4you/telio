"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { 
  Scissors, 
  CalendarCheck, 
  Sparkles, 
  PhoneCall, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  Headphones, 
  UserCheck,
  ChevronDown,
  Coins
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const salonTypes = [
  {
    title: "Kaderníctva a vlasové štúdiá",
    desc: "Rezervácie dámskych a pánskych strihov, farbenia, melíru či fúkanej podľa dĺžky trvania a konkrétneho kaderníka.",
    icon: Scissors,
  },
  {
    title: "Barber shopy a holičstvá",
    desc: "Rýchla telefonická alebo webová rezervácia strihu, úpravy brady a holenia britvou s výberom obľúbeného barbera.",
    icon: UserCheck,
  },
  {
    title: "Kozmetické salóny a estetika",
    desc: "Plánovanie ošetrení pleti, líčenia, čistenia a depilácie s presnými časovými oknami.",
    icon: Sparkles,
  },
  {
    title: "Nechtové a masážne salóny",
    desc: "Jednoduché objednanie na manikúru, pedikúru alebo masáže s automatickými SMS pripomienkami.",
    icon: CalendarCheck,
  },
];

const salonFeatures = [
  {
    title: "Rezervujte, kým máte ruky v práci",
    desc: "Striháte, farbíte alebo češete? Nemusíte si skladať rukavice ani prerušovať prácu so zákazníkom. Telio zdvihne za vás do 2 sekúnd.",
    icon: Scissors,
  },
  {
    title: "Výber stylistu a služby hlasom",
    desc: "Telio vie, ktoré služby salón ponúka, ako dlho trvajú a ktorí zamestnanci majú kedy voľno. Zákazník si ľahko vyberie svojho obľúbeného barbera či kaderníčku.",
    icon: UserCheck,
  },
  {
    title: "Automatické SMS pripomienky (Stop No-shows)",
    desc: "Zabudnuté termíny stoja salóny tisíce eur ročne. Telio odošle zákazníkovi potvrdenie a pripomienku 24 hodín pred termínom cez SMS.",
    icon: MessageSquare,
  },
  {
    title: "Webový kalendár aj telefónne číslo spolu",
    desc: "Zákazníci z Instagramu a webu si naklikajú termín sami, kým volajúci zákazníci sú vybavení hlasovou AI. Všetko vidíte v jednom prehľadnom Google Kalendári.",
    icon: CalendarCheck,
  },
];

export default function SalonBookingSystemContent({ faqs }: { faqs: string[][] }) {
  const audioTrackedRef = useRef(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        {/* Hero */}
        <section className="grid-bg relative flex min-h-[85vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(236,72,153,0.14),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-pink-300">
              <Scissors className="h-3.5 w-3.5" />
              Pre kaderníctva, barber shopy a salóny krásy
            </p>
            <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Rezervačný systém pre salóny: <span className="text-gradient">Rezervujte, kým striháte</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">
              Už žiadne zmeškané hovory pri strihaní alebo farbení. Telio zdvihne každý telefonát za 2 sekundy, overí voľný termín v kalendári a pošle zákazníkovi SMS potvrdenie.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#waitlist"
                onClick={() => trackEvent("click_demo_cta", { location: "salon_page_hero" })}
                className="btn-primary btn-xl w-full sm:w-auto"
              >
                Vyskúšať pre môj salón zadarmo
              </Link>
              <Link
                href="/porovnanie-rezervacnych-systemov"
                className="btn-ghost btn-xl w-full sm:w-auto"
              >
                Prečo Telio vs. bežný systém
              </Link>
            </div>

            {/* Audio demo card */}
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-[#0c0c16]/90 p-5 text-left shadow-2xl">
              <div className="mb-3 flex items-center gap-3 text-sm font-semibold text-white">
                <Headphones className="h-5 w-5 text-pink-400" />
                Vypočujte si ukážku telefonickej rezervácie strihu vlasov
              </div>
              <audio
                className="h-11 w-full"
                controls
                preload="metadata"
                src="/audio/telio-ukazka-hovoru.mp3"
                onPlay={() => {
                  if (!audioTrackedRef.current) {
                    trackEvent("play_audio_demo", { audio_name: "salon_booking_call", location: "salon_page" });
                    audioTrackedRef.current = true;
                  }
                }}
              >
                Váš prehliadač nepodporuje prehrávanie audia.
              </audio>
            </div>

            <div className="mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-3 text-sm font-semibold text-white sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                Dvíhanie 24/7
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                SMS pripomienky
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                Výber barbera / stylistu
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                Google Kalendár
              </div>
            </div>
          </div>
        </section>

        {/* Salon Types Grid */}
        <section className="relative border-y border-white/10 bg-[#0c0c16] py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                Riešenie prispôsobené pre každé beauty odvetvie
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {salonTypes.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-pink-500/30">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">
                Prečo kaderníci a barberi milujú Telio?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-muted)]">
                Klasické rezervačné systémy vás nútia posielať zákazníkov na web. Telio sa prispôsobí zákazníkovi – nech už si vyberie web alebo vám zavolá.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {salonFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="flex gap-5 rounded-2xl border border-white/10 bg-[#0c0c16] p-7">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{feat.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Financial impact: No-shows */}
        <section className="border-t border-white/10 bg-[#0a0a14] py-16">
          <div className="mx-auto max-w-5xl rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
                  Stop prepadnutým termínom
                </span>
                <h3 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
                  Koľko vás stoja zákazníci, ktorí zabudnú prísť?
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
                  Ak vám mesačne neprídu len 4 zákazníci na strih či farbenie, salón prichádza o <strong>150 € až 300 € čistého zisku</strong>. Telio pošle automatickú SMS pripomienku s možnosťou včasného storna alebo presunu termínu. Vaše kreslo tak nikdy nezostane prázdne.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c0c16] p-6 text-center">
                <div className="text-4xl font-extrabold text-pink-400">až -80 %</div>
                <div className="mt-1 text-sm font-semibold text-white">pokles zabudnutých termínov (no-shows)</div>
                <div className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-400">
                  Vďaka automatickým SMS notifikáciám 24h a 2h vopred.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-3xl font-extrabold text-white md:text-4xl">
              Často kladené otázky pre salóny
            </h2>
            <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0c0c16] p-6">
              {faqs.map(([q, a], idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between text-left text-base font-semibold text-white transition hover:text-pink-300"
                    >
                      <span>{q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-pink-400" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                        {a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/10 bg-gradient-to-b from-[#0e0e1a] to-[var(--bg)] py-20 text-center">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Vyskúšajte Telio vo vašom salóne na 14 dní zdarma
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-muted)]">
              Nastavíme vaše služby, rozvrh kaderníkov a prepojíme váš kalendár. Už žiadny zmeškaný zákazník počas strihania.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#waitlist"
                onClick={() => trackEvent("click_demo_cta", { location: "salon_bottom_cta" })}
                className="btn-primary btn-xl w-full sm:w-auto"
              >
                Dohodnúť bezplatné nasadenie
              </Link>
              <Link
                href="/#pricing"
                className="btn-ghost btn-xl w-full sm:w-auto"
              >
                Pozrieť cenník pre salóny
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
