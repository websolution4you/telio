"use client";

import Link from "next/link";
import { useRef } from "react";
import { CalendarCheck, Check, Clock3, Headphones, MessageSquareText, PhoneCall, ShieldCheck, Stethoscope } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const capabilities = [
  [PhoneCall, "Zdvihne administratívne hovory", "Pomáha počas vyšetrení, špičky aj mimo ordinačných hodín, keď personál nemôže okamžite reagovať."],
  [CalendarCheck, "Objedná na dostupný termín", "Zistí požadovanú službu a termín, overí dostupnosť a podľa nastavených pravidiel vytvorí rezerváciu."],
  [MessageSquareText, "Odpovie na organizačné otázky", "Poskytne schválené informácie o otváracích hodinách, adrese, príprave na návštevu alebo procese kliniky."],
  [ShieldCheck, "Pozná hranice svojej úlohy", "Neposkytuje diagnózu ani zdravotné odporúčania. Neštandardnú požiadavku spracuje podľa pravidiel kliniky."],
] as const;

const situations = [
  ["Počas vyšetrenia", "Personál sa môže venovať pacientovi, zatiaľ čo Telio zachytí administratívny telefonát."],
  ["Po ordinačných hodinách", "Volajúci získa organizačné informácie alebo si podľa dostupnosti dohodne termín bez čakania do rána."],
  ["Pri návale hovorov", "Asistent pomáha obslúžiť viac telefonických požiadaviek bez dlhej čakacej doby."],
  ["Pri opakovaných otázkach", "Klinika nastaví schválené odpovede, aby boli informácie konzistentné a zrozumiteľné."],
];

export default function ClinicVoiceAssistantContent({ faqs }: { faqs: string[][] }) {
  const audioTrackedRef = useRef(false);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        <section className="grid-bg relative flex min-h-[90vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(0,212,255,0.1),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-7 inline-flex rounded-full border border-sky-300/20 bg-sky-300/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Administratívna komunikácia pre kliniky</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-7xl">
              AI hlasový asistent pre kliniky, ktorý <span className="text-gradient">odbremení personál</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">
              Telio vybavuje administratívne telefonáty, organizačné otázky a objednávanie pacientov, aby sa váš tím mohol sústrediť na starostlivosť v ambulancii.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "clinic_page_hero" })} className="btn-primary btn-xl w-full sm:w-auto">Chcem riešenie pre kliniku</Link>
              <Link href="/telefonicky-rezervacny-system" className="btn-ghost btn-xl w-full sm:w-auto">Telefonické rezervácie</Link>
            </div>
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-[#0c0c16]/90 p-5 text-left shadow-2xl">
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-white"><Headphones className="h-5 w-5 text-sky-300" />Vypočujte si prirodzený hlas Telia</div>
              <audio
                className="h-11 w-full"
                controls
                preload="metadata"
                src="/audio/telio-ukazka-hovoru.mp3"
                onPlay={() => {
                  if (!audioTrackedRef.current) {
                    trackEvent("play_audio_demo", { audio_name: "telio_sample_call", location: "clinic_page" });
                    audioTrackedRef.current = true;
                  }
                }}
              >Váš prehliadač nepodporuje prehrávanie audia.</audio>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Čo môže vybaviť" title="Menej prerušení, viac priestoru pre pacientov" text="Telio rieši vopred definované administratívne situácie a komunikuje len v rozsahu, ktorý schváli klinika." centered />
            <div className="grid gap-6 md:grid-cols-2">
              {capabilities.map(([Icon, title, text]) => (
                <article key={title} className="card-hover rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Icon className="mb-6 h-8 w-8 text-sky-300" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Ako funguje" title="Od hovoru k vybavenej administratívnej požiadavke" text="Scenár nastavíme podľa služieb, dostupnosti, komunikačných pravidiel a spôsobu práce vašej kliniky." />
            <ol className="space-y-5">
              {[
                ["01", "Pacient zavolá", "Telio sa predstaví v mene kliniky a zistí účel administratívneho telefonátu."],
                ["02", "Spracuje povolenú požiadavku", "Overí dostupnosť, poskytne schválenú organizačnú informáciu alebo získa potrebné údaje."],
                ["03", "Dokončí alebo odovzdá", "Vytvorí termín, zaznamená výsledok alebo požiadavku odovzdá personálu podľa pravidiel."],
              ].map(([number, title, text]) => (
                <li key={number} className="flex gap-5 rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <span className="font-mono text-lg font-bold text-sky-300">{number}</span><div><h3 className="mb-2 text-lg font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Kedy pomáha" title="Telefonická podpora v najvyťaženejších chvíľach" />
            <div className="grid gap-6 md:grid-cols-2">
              {situations.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Clock3 className="mb-5 h-7 w-7 text-[var(--cyan)]" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Bezpečné hranice" title="Administratívny asistent, nie zdravotnícky pracovník" text="Telio nenahrádza lekára ani sestru. Jeho úlohy a odpovede sú obmedzené na schválené organizačné procesy kliniky." />
            <ul className="space-y-5">
              {["Bez diagnostiky a zdravotných odporúčaní", "Jasné pravidlá pre neštandardné a zdravotné otázky", "Zber iba údajov potrebných pre nastavený účel", "Možnosť odovzdať požiadavku zodpovednému personálu"].map((item) => (
                <li key={item} className="flex items-start gap-4 text-lg text-white"><span className="mt-0.5 rounded-full bg-sky-300/10 p-1"><Check className="h-4 w-4 text-sky-300" /></span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <SectionHeader eyebrow="Časté otázky" title="AI hlasový asistent na klinike" centered />
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_50%,rgba(0,212,255,0.11),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-6">
            <Stethoscope className="mx-auto mb-7 h-10 w-10 text-sky-300" />
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">Navrhnime administratívne hovory pre vašu kliniku</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Prejdeme si typické požiadavky, kalendár a pravidlá odovzdania hovorov. Následne pripravíme bezpečný a praktický scenár.</p>
            <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "clinic_page_bottom" })} className="btn-primary btn-xl mt-10">Dohodnúť konzultáciu</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHeader({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text?: string; centered?: boolean }) {
  return <div className={`${centered ? "mx-auto text-center" : ""} mb-14 max-w-3xl`}><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">{eyebrow}</p><h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{title}</h2>{text && <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{text}</p>}</div>;
}
