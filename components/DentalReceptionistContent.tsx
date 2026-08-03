"use client";

import Link from "next/link";
import { useRef } from "react";
import { CalendarCheck, Check, Clock3, Headphones, MessageSquareText, PhoneCall, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const capabilities = [
  [PhoneCall, "Zdvihne počas ošetrovania", "Pacient sa dovolá aj vtedy, keď zubár a asistentka nemôžu prerušiť prebiehajúce ošetrenie."],
  [CalendarCheck, "Objedná na povolené služby", "Podľa pravidiel ambulancie môže overiť termín pre kontrolu, dentálnu hygienu alebo inú dostupnú službu."],
  [MessageSquareText, "Odpovie na organizačné otázky", "Oznámi schválené informácie o ordinačných hodinách, adrese, parkovaní či príprave na návštevu."],
  [Clock3, "Funguje aj po ordinačných hodinách", "Zachytí administratívnu požiadavku večer alebo cez víkend a spracuje ju podľa nastaveného scenára."],
] as const;

const scenarios = [
  ["Objednanie na kontrolu", "Zistí preferovaný deň a čas, overí dostupnosť a vytvorí rezerváciu podľa kalendára ambulancie."],
  ["Termín dentálnej hygieny", "Rozlíši typ služby a ponúkne termíny s vhodnou dĺžkou a príslušným pracovníkom."],
  ["Zmena alebo zrušenie", "Po splnení pravidiel identifikácie upraví existujúci termín alebo odovzdá požiadavku recepcii."],
  ["Neštandardná požiadavka", "Zaznamená kontakt a dôvod hovoru alebo ho spracuje podľa bezpečného postupu určeného ambulanciou."],
];

export default function DentalReceptionistContent({ faqs }: { faqs: string[][] }) {
  const audioTrackedRef = useRef(false);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        <section className="grid-bg relative flex min-h-[90vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(0,212,255,0.1),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-7 inline-flex rounded-full border border-sky-300/20 bg-sky-300/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Telefonická recepcia pre zubné ambulancie</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-7xl">
              Virtuálna recepčná pre zubára, ktorá <span className="text-gradient">zdvihne aj počas ošetrovania</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">
              Telio vybavuje administratívne hovory, organizačné otázky a rezervácie, zatiaľ čo sa tím zubnej ambulancie naplno venuje pacientovi.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "dental_page_hero" })} className="btn-primary btn-xl w-full sm:w-auto">Chcem virtuálnu recepčnú</Link>
              <Link href="/telefonicky-rezervacny-system" className="btn-ghost btn-xl w-full sm:w-auto">Ako fungujú rezervácie</Link>
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
                    trackEvent("play_audio_demo", { audio_name: "telio_sample_call", location: "dental_page" });
                    audioTrackedRef.current = true;
                  }
                }}
              >Váš prehliadač nepodporuje prehrávanie audia.</audio>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Pomoc pre ambulanciu" title="Menej zmeškaných hovorov bez prerušovania ošetrenia" text="Virtuálna recepčná pracuje s informáciami, službami a pravidlami, ktoré schváli vaša zubná ambulancia." centered />
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
            <SectionHeader eyebrow="Ako funguje" title="Recepcia nastavená podľa vašej ambulancie" text="Pred nasadením nastavíme služby, dĺžky termínov, dostupnosť, povolené odpovede a pravidlá odovzdania požiadaviek." />
            <ol className="space-y-5">
              {[
                ["01", "Pacient zavolá", "Telio sa predstaví v mene ambulancie a zistí, s akou administratívnou požiadavkou volá."],
                ["02", "Vybaví povolený scenár", "Overí termín, poskytne organizačnú informáciu alebo získa údaje potrebné pre recepciu."],
                ["03", "Zapíše alebo odovzdá", "Vytvorí rezerváciu, zaznamená výsledok alebo požiadavku odošle zodpovednému personálu."],
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
            <SectionHeader eyebrow="Praktické scenáre" title="Najčastejšie telefonáty zubnej ambulancie" />
            <div className="grid gap-6 md:grid-cols-2">
              {scenarios.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Sparkles className="mb-5 h-7 w-7 text-[var(--cyan)]" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Jasné hranice" title="Administratívna recepčná, nie zubný lekár" text="Telio nenahrádza odborné posúdenie. Zdravotné otázky rieši výhradne podľa bezpečného postupu, ktorý určí ambulancia." />
            <ul className="space-y-5">
              {["Bez diagnózy a odporúčania liečby", "Bez posudzovania naliehavosti zdravotného stavu", "Schválené organizačné odpovede a scenáre", "Odovzdanie zdravotnej alebo neštandardnej otázky personálu"].map((item) => (
                <li key={item} className="flex items-start gap-4 text-lg text-white"><span className="mt-0.5 rounded-full bg-sky-300/10 p-1"><ShieldCheck className="h-4 w-4 text-sky-300" /></span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <SectionHeader eyebrow="Časté otázky" title="Virtuálna recepčná v zubnej ambulancii" centered />
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
            <Check className="mx-auto mb-7 h-10 w-10 text-sky-300" />
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">Nastavme recepčnú pre vašu zubnú ambulanciu</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Prejdeme si služby, kalendár, typické hovory a bezpečné pravidlá. Potom pripravíme scenár na praktické vyskúšanie.</p>
            <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "dental_page_bottom" })} className="btn-primary btn-xl mt-10">Dohodnúť konzultáciu</Link>
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
