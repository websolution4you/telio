"use client";

import { useRef } from "react";
import Link from "next/link";
import { CalendarCheck, Check, Clock3, Headphones, Languages, PhoneCall, Workflow } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const benefits = [
  [Clock3, "Dostupnosť 24/7", "Zdvihne hovor počas špičky, po pracovnej dobe aj cez víkend bez čakania na voľného operátora."],
  [Languages, "Prirodzená slovenčina", "Rozumie bežnej reči, pýta sa doplňujúce otázky a komunikuje profesionálne podľa pravidiel vašej firmy."],
  [CalendarCheck, "Rezervácie v reálnom čase", "Overí dostupnosť, vytvorí termín v kalendári a zákazníkovi potvrdí výsledok priamo počas hovoru."],
  [Workflow, "Napojenie na procesy", "Po hovore môže odoslať notifikáciu, zapísať údaje alebo spustiť ďalší krok vo vašom systéme."],
] as const;

const useCases = [
  ["Reštaurácie", "Prijímanie rezervácií, otázky o otváracích hodinách a základné informácie o prevádzke."],
  ["Kliniky a salóny", "Objednávanie klientov, zmena termínu a odpovede na opakované otázky bez prerušovania personálu."],
  ["Taxi a doprava", "Získanie nástupnej a cieľovej adresy, spracovanie objednávky a odoslanie údajov dispečingu."],
  ["Služby a zákaznícka podpora", "Prvý kontakt, kvalifikácia požiadavky a smerovanie prípadu správnej osobe."],
];

export default function AiVoiceAssistantContent({ faqs }: { faqs: string[][] }) {
  const audioTrackedRef = useRef(false);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        <section className="grid-bg relative flex min-h-[90vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(0,255,209,0.09),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-7 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan)]">Automatizácia firemných telefonátov</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-7xl">
              AI hlasový asistent, ktorý <span className="text-gradient">zdvihne každý hovor</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">
              Telio komunikuje prirodzene po slovensky, odpovedá na otázky, vytvára rezervácie a prepája telefonáty s procesmi vašej firmy — 24 hodín denne.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "seo_page_hero" })} className="btn-primary btn-xl w-full sm:w-auto">Vyskúšať Telio zdarma</Link>
              <Link href="/#pricing" onClick={() => trackEvent("select_pricing_plan", { plan_name: "pricing_section", location: "seo_page_hero" })} className="btn-ghost btn-xl w-full sm:w-auto">Pozrieť cenník</Link>
            </div>
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-[#0c0c16]/90 p-5 text-left shadow-2xl">
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-white"><Headphones className="h-5 w-5 text-[var(--cyan)]" />Vypočujte si ukážku hovoru s Teliom</div>
              <audio
                className="h-11 w-full"
                controls
                preload="metadata"
                src="/audio/telio-ukazka-hovoru.mp3"
                onPlay={() => {
                  if (!audioTrackedRef.current) {
                    trackEvent("play_audio_demo", { audio_name: "telio_sample_call", location: "seo_page" });
                    audioTrackedRef.current = true;
                  }
                }}
              >
                Váš prehliadač nepodporuje prehrávanie audia.
              </audio>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Ako pomáha firmám" title="Viac vybavených zákazníkov, menej prerušení" text="Hlasový AI asistent preberá opakované telefonické úlohy, no zachováva prirodzený rozhovor a pravidlá vašej prevádzky." centered />
            <div className="grid gap-6 md:grid-cols-2">
              {benefits.map(([Icon, title, text]) => (
                <article key={title} className="card-hover rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Icon className="mb-6 h-8 w-8 text-[var(--cyan)]" /><h3 className="mb-3 text-xl font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Ako funguje" title="Od zazvonenia po vybavenú požiadavku" text="Telio nie je iba hlasová schránka. Počas hovoru rozpozná, čo zákazník potrebuje, pracuje s aktuálnymi údajmi a vykoná dohodnutú akciu." />
            <ol className="space-y-5">
              {[
                ["01", "Zákazník zavolá", "Hovor sa presmeruje na Telio, ktoré sa predstaví v mene vašej firmy."],
                ["02", "Asistent vedie rozhovor", "Zistí zámer, položí potrebné otázky a overí dostupné informácie."],
                ["03", "Vykoná akciu", "Vytvorí rezerváciu, zaznamená požiadavku alebo odošle údaje personálu."],
              ].map(([number, title, text]) => (
                <li key={number} className="flex gap-5 rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <span className="font-mono text-lg font-bold text-[var(--cyan)]">{number}</span><div><h3 className="mb-2 text-lg font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Prípady použitia" title="Jeden asistent, rôzne firemné scenáre" />
            <div className="grid gap-6 md:grid-cols-2">
              {useCases.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <PhoneCall className="mb-5 h-7 w-7 text-[#9b87ff]" /><h3 className="mb-3 text-xl font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/telefonicky-rezervacny-system" className="inline-flex items-center font-semibold text-[var(--cyan)] transition-opacity hover:opacity-80">
                Zistite viac o telefonickom rezervačnom systéme →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Prečo Telio" title="AI asistent dopĺňa váš tím" text="Automatizuje opakované hovory a personálu necháva situácie, v ktorých je potrebné ľudské rozhodnutie." />
            <ul className="space-y-5">
              {["Viac súčasne vybavených požiadaviek", "Konzistentné odpovede podľa vašich pravidiel", "Prehľad o výsledkoch hovorov", "Možnosť bezpečného odovzdania požiadavky človeku"].map((item) => (
                <li key={item} className="flex items-start gap-4 text-lg text-white"><span className="mt-0.5 rounded-full bg-cyan-300/10 p-1"><Check className="h-4 w-4 text-[var(--cyan)]" /></span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <SectionHeader eyebrow="Časté otázky" title="Čo potrebujete vedieť o AI hlasovom asistentovi" centered />
            <div className="space-y-4">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <summary className="cursor-pointer list-none pr-8 text-lg font-bold text-white">{question}</summary>
                  <p className="mt-4 leading-7 text-[var(--text-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-28 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_50%,rgba(0,255,209,0.09),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-6">
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">Zistite, čo môže Telio vybaviť za vás</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Popíšte nám vaše hovory a proces. Navrhneme vhodný scenár a ukážeme vám AI hlasového asistenta v praxi.</p>
            <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "seo_page_bottom" })} className="btn-primary btn-xl mt-10">Dohodnúť bezplatnú konzultáciu</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHeader({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text?: string; centered?: boolean }) {
  return (
    <div className={`${centered ? "mx-auto text-center" : ""} mb-14 max-w-3xl`}>
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--cyan)]">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{text}</p>}
    </div>
  );
}
