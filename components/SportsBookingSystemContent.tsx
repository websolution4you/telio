"use client";

import Link from "next/link";
import { BarChart3, CalendarCheck, Check, LayoutDashboard, PhoneCall, ShieldCheck, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

const features = [
  [CalendarCheck, "Online rezervácia kurtu", "Hráč si vyberie šport, dátum, voľný kurt a čas v prehľadnom webovom kalendári."],
  [PhoneCall, "AI rezervácia cez telefonát", "Telio prirodzene zistí požiadavku, overí obsadenosť a vytvorí rezerváciu aj bez zásahu recepcie."],
  [LayoutDashboard, "Správa rezervácií", "Používateľ vidí svoje termíny a prevádzkovateľ má administratívny prehľad o rezerváciách a zákazníkoch."],
  [ShieldCheck, "Kontrola dostupnosti", "Systém kontroluje časové kolízie, prevádzkové hodiny a blokované termíny, napríklad údržbu kurtu."],
] as const;

const sports = [
  ["Tenis", "Rezervácie indoor kurtov aj antukových dvorcov s vlastnými otváracími hodinami a intervalmi."],
  ["Squash", "Rýchly výber squashového kurtu, dátumu a voľného času cez online rezervačný kalendár."],
  ["Badminton / bedminton", "Prehľad dostupnosti viacerých badmintonových kurtov a jednoduchá rezervácia pre hráčov."],
  ["Ďalšie športoviská", "Model vieme prispôsobiť kurtom, halám a ďalším rezervovateľným športovým priestorom."],
];

export default function SportsBookingSystemContent({ faqs }: { faqs: string[][] }) {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        <section className="grid-bg relative flex min-h-[90vh] items-center pt-32 pb-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(16,185,129,0.12),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-7 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Online kalendár + AI telefonické rezervácie</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-7xl">
              Rezervačný systém pre športoviská a <span className="text-gradient">športové kurty</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">
              Tenis, squash aj badminton v jednom prehľadnom kalendári. Hráči rezervujú online alebo telefonicky cez AI asistenta a prevádzka má obsadenosť pod kontrolou.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/newbookings" onClick={() => trackEvent("click_demo_cta", { location: "sports_page_demo" })} className="btn-primary btn-xl w-full sm:w-auto">Vyskúšať rezervačný kalendár</Link>
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "sports_page_hero" })} className="btn-ghost btn-xl w-full sm:w-auto">Chcem systém pre športovisko</Link>
            </div>
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 text-sm font-semibold text-white sm:grid-cols-4">
              {["Tenis", "Squash", "Badminton", "Antuka"].map((sport) => <span key={sport} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">{sport}</span>)}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Dva spôsoby rezervácie" title="Online rezervácia aj automatická rezervácia cez telefón" text="Jeden kalendár prijíma rezervácie z webu aj od AI hlasového asistenta, takže recepcia nemusí údaje prepisovať medzi systémami." centered />
            <div className="grid gap-6 md:grid-cols-2">
              {features.map(([Icon, title, text]) => (
                <article key={title} className="card-hover rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Icon className="mb-6 h-8 w-8 text-emerald-300" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Jednoduchá rezervácia" title="Od výberu športu po potvrdený kurt" text="Hráč nepotrebuje volať opakovane ani čakať, kým recepcia skontroluje obsadenosť." />
            <ol className="space-y-5">
              {[
                ["01", "Vyberie šport a dátum", "Na webe alebo počas telefonátu určí tenis, squash, badminton a požadovaný deň."],
                ["02", "Systém nájde voľný kurt", "Kalendár skontroluje dostupné kurty, čas, prevádzkové hodiny a existujúce rezervácie."],
                ["03", "Rezerváciu uloží", "Termín sa okamžite zobrazí v kalendári a prevádzkovateľ ho vidí vo svojom prehľade."],
              ].map(([number, title, text]) => (
                <li key={number} className="flex gap-5 rounded-2xl border border-white/8 bg-[var(--bg-card)] p-6">
                  <span className="font-mono text-lg font-bold text-emerald-300">{number}</span><div><h3 className="mb-2 text-lg font-bold text-white">{title}</h3><p className="leading-7 text-[var(--text-muted)]">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.015] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader eyebrow="Športy a kurty" title="Rezervačný systém pre tenis, squash a badminton" text="Každý šport môže mať vlastné kurty, dostupnosť, otváracie hodiny a pravidlá rezervácie." />
            <div className="grid gap-6 md:grid-cols-2">
              {sports.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[var(--bg-card)] p-8">
                  <Trophy className="mb-5 h-7 w-7 text-[var(--cyan)]" /><h2 className="mb-3 text-xl font-bold text-white">{title}</h2><p className="leading-7 text-[var(--text-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
            <SectionHeader eyebrow="Pre prevádzkovateľa" title="Obsadenosť a rezervácie na jednom mieste" text="Administratívny dashboard pomáha prevádzke sledovať kalendár a riadiť dostupnosť športoviska." />
            <ul className="space-y-5">
              {["Prehľad rezervácií podľa športu, kurtu a času", "Rozlíšenie rezervácie z webu a cez hlasového asistenta", "Blokovanie kurtu pre údržbu alebo mimo prevádzky", "Prehľad zákazníkov, obsadenosti a základných štatistík"].map((item) => (
                <li key={item} className="flex items-start gap-4 text-lg text-white"><span className="mt-0.5 rounded-full bg-emerald-300/10 p-1"><Check className="h-4 w-4 text-emerald-300" /></span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-6">
            <SectionHeader eyebrow="Časté otázky" title="Rezervačný systém pre športoviská v praxi" centered />
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_50%,rgba(16,185,129,0.13),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-6">
            <BarChart3 className="mx-auto mb-7 h-10 w-10 text-emerald-300" />
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">Zjednodušte rezervácie vášho športoviska</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">Ukážte nám vaše kurty, cenník a pravidlá. Navrhneme online kalendár a AI telefonické rezervácie pre vašu prevádzku.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/newbookings" onClick={() => trackEvent("click_demo_cta", { location: "sports_page_bottom_demo" })} className="btn-primary btn-xl">Otvoriť ukážku systému</Link>
              <Link href="/#waitlist" onClick={() => trackEvent("click_demo_cta", { location: "sports_page_bottom_contact" })} className="btn-ghost btn-xl">Dohodnúť konzultáciu</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHeader({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text?: string; centered?: boolean }) {
  return <div className={`${centered ? "mx-auto text-center" : ""} mb-14 max-w-3xl`}><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p><h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{title}</h2>{text && <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">{text}</p>}</div>;
}
