"use client";

import Link from "next/link";
import { useRef } from "react";
import { BellRing, CalendarCheck, Check, Clock3, Headphones, PhoneCall, RefreshCw, UserRoundCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const capabilities = [
  [Clock3, "Rezervácie 24/7", "Zákazník si môže dohodnúť termín aj večer, cez víkend alebo v čase, keď sa personál venuje práci."],
  [CalendarCheck, "Aktuálna dostupnosť", "Telio overí voľné termíny v prepojenom kalendári a nevytvára rezervácie naslepo."],
  [UserRoundCheck, "Zber potrebných údajov", "Počas prirodzeného rozhovoru zistí službu, dátum, čas a kontaktné údaje potrebné pre rezerváciu."],
  [BellRing, "Potvrdenie a notifikácie", "Výsledok hovoru môže zapísať do kalendára a odoslať ďalej personálu alebo zákazníkovi."],
] as const;

const industries = [
  ["Kliniky a ambulancie", "Objednávanie pacientov na dostupné termíny bez prerušovania práce zdravotníckeho personálu."],
  ["Zubné ambulancie", "Rezervácie kontrol, dentálnej hygieny a ďalších služieb podľa pravidiel ambulancie."],
  ["Salóny a služby", "Rezervácia konkrétnej služby, pracovníka a času počas jedného telefonického rozhovoru."],
  ["Športoviská", "Overenie dostupnosti kurtu alebo športoviska a okamžité vytvorenie rezervácie."],
];

export default function PhoneBookingSystemContent({ faqs }: { faqs: string[][] }) {
  const audioTrackedRef = useRef(false);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        <section className="grid-bg relative flex min-h-[90vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(123,97,255,0.11),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-7 inline-flex rounded-full border border-purple-300/20 bg-purple-300/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#a995ff]">Rezervácie cez telefón bez čakania</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-7xl">
              Telefonický rezervačný systém, ktorý pracuje <span className="text-gradient">24/7</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">
              Telio zdvihne hovor, zistí požadovaný termín, overí dostupnosť a vytvorí rezerváciu v kalendári — prirodzene po slovensky a bez čakania na obsluhu.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "booking_page_hero" })} className="btn-primary btn-xl w-full sm:w-auto">Chcem automatizovať rezervácie</Link>
              <Link href="/ai-hlasovy-asistent" className="btn-ghost btn-xl w-full sm:w-auto">Ako funguje Telio</Link>
            </div>
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-[#0c0c16]/90 p-5 text-left shadow-2xl">
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-white"><Headphones className="h-5 w-5 text-[#a995ff]" />Ukážka telefonického rozhovoru</div>
              <audio
                className="h-11 w-full"
                controls
                preload="metadata"
                src="/audio/telio-ukazka-hovoru.mp3"
                onPlay={() => {
                  if (!audioTrackedRef.current) {
                    trackEvent("play_audio_demo", { audio_name: "telio_sample_call", location: "booking_page" });
                    audioTrackedRef.current = true;
                  }
                }}
              >Váš prehliadač nepodporuje prehrávanie audia.</audio>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Čo systém vybaví" title="Od telefonátu po rezerváciu v kalendári" text="AI rezervačný systém spája hlasový rozhovor s aktuálnou dostupnosťou a pravidlami vašej prevádzky." centered />
            <div className="grid gap-6 md:grid-cols-2">
              {capabilities.map(([Icon, title, text]) => (
                <article key={title} className="card-hover rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Icon className="mb-6 h-8 w-8 text-[#a995ff]" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Priebeh rezervácie" title="Jednoduchý proces pre zákazníka aj personál" text="Zákazník nepotrebuje aplikáciu ani účet. Stačí zavolať tak, ako je zvyknutý." />
            <ol className="space-y-5">
              {[
                ["01", "Zákazník zavolá", "Telio sa predstaví a zistí, o akú službu alebo rezerváciu má záujem."],
                ["02", "Overí voľný termín", "Asistent skontroluje kalendár a pri obsadenom čase ponúkne dostupnú alternatívu."],
                ["03", "Potvrdí a zapíše rezerváciu", "Po získaní potrebných údajov vytvorí termín a oznámi zákazníkovi výsledok."],
              ].map(([number, title, text]) => (
                <li key={number} className="flex gap-5 rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <span className="font-mono text-lg font-bold text-[#a995ff]">{number}</span><div><h3 className="mb-2 text-lg font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Pre koho je vhodný" title="Telefonické rezervácie pre prevádzky, ktoré nemôžu vždy zdvihnúť" />
            <div className="grid gap-6 md:grid-cols-2">
              {industries.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <PhoneCall className="mb-5 h-7 w-7 text-[var(--cyan)]" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/ai-hlasovy-asistent-pre-kliniky" className="inline-flex items-center font-semibold text-[#a995ff] transition-opacity hover:opacity-80">
                Pozrite si riešenie pre kliniky a ambulancie →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Podľa vašich pravidiel" title="Nie iba vytvorenie nového termínu" text="Konkrétny scenár nastavujeme podľa vašich služieb, kalendára a pravidiel pre prácu s rezerváciami." />
            <ul className="space-y-5">
              {["Ponuka alternatívneho termínu pri obsadenom čase", "Zmena alebo zrušenie rezervácie podľa nastavených pravidiel", "Rozlíšenie služieb, dĺžky termínov a dostupných pracovníkov", "Odovzdanie neštandardnej požiadavky personálu"].map((item, index) => (
                <li key={item} className="flex items-start gap-4 text-lg text-white"><span className="mt-0.5 rounded-full bg-purple-300/10 p-1">{index === 1 ? <RefreshCw className="h-4 w-4 text-[#a995ff]" /> : <Check className="h-4 w-4 text-[#a995ff]" />}</span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <SectionHeader eyebrow="Časté otázky" title="Telefonický rezervačný systém v praxi" centered />
            <div className="space-y-4">
              {faqs.map(([question, answer]) => (
                <details key={question} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <summary className="cursor-pointer list-none pr-8 text-lg font-bold text-white">{question}</summary><p className="mt-4 leading-7 text-[var(--text-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-28 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_50%,rgba(123,97,255,0.12),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-6">
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">Premeňte zmeškané hovory na rezervácie</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Ukážte nám váš kalendár a spôsob objednávania. Navrhneme telefonický scenár vhodný pre vašu prevádzku.</p>
            <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "booking_page_bottom" })} className="btn-primary btn-xl mt-10">Dohodnúť bezplatnú konzultáciu</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHeader({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text?: string; centered?: boolean }) {
  return <div className={`${centered ? "mx-auto text-center" : ""} mb-14 max-w-3xl`}><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#a995ff]">{eyebrow}</p><h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{title}</h2>{text && <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{text}</p>}</div>;
}
