"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  PhoneCall, 
  CalendarCheck, 
  ArrowRight, 
  ShieldCheck, 
  Coins, 
  ChevronDown,
  Users,
  Zap
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/analytics";

interface ComparisonRow {
  feature: string;
  telio: string | boolean;
  traditional: string | boolean;
  human: string | boolean;
  highlight?: boolean;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Online rezervácie na webe (kalendár)",
    telio: true,
    traditional: true,
    human: false,
  },
  {
    feature: "AI telefonický asistent 24/7 (Voice AI)",
    telio: true,
    traditional: false,
    human: false,
    highlight: true,
  },
  {
    feature: "Zdvihnutie hovoru do 2 sekúnd",
    telio: true,
    traditional: false,
    human: "Závisí od vyťaženia",
  },
  {
    feature: "Vybavenie viacerých hovorov naraz (bez obsadenia)",
    telio: "Neobmedzene",
    traditional: "Žiadne hovory",
    human: "Iba 1 hovor naraz",
    highlight: true,
  },
  {
    feature: "SMS & WhatsApp potvrdenia a pripomienky",
    telio: true,
    traditional: "Za príplatok",
    human: "Iba manuálne",
  },
  {
    feature: "Zmena a storno rezervácie cez telefón",
    telio: true,
    traditional: false,
    human: true,
  },
  {
    feature: "Obojsmerné prepojenie s Google Kalendárom",
    telio: true,
    traditional: true,
    human: "Manuálny zápis",
  },
  {
    feature: "Dostupnosť počas víkendov a v noci",
    telio: "24/7/365",
    traditional: "Len web",
    human: "Zvyčajne nedostupné",
  },
  {
    feature: "Riziko PN, dovolenky a fluktuácie",
    telio: "0 % (stále online)",
    traditional: "0 %",
    human: "Pravidelné výpadky",
  },
  {
    feature: "Mesačné náklady",
    telio: "Od 50 € do 99 €",
    traditional: "30 € – 80 € (+ personál)",
    human: "1 200 € – 1 800 € (+ odvody)",
    highlight: true,
  },
];

export default function ComparisonContent({ faqs }: { faqs: string[][] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const renderVal = (val: string | boolean) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
          <Check className="h-5 w-5" /> Áno
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center gap-1.5 text-zinc-500">
          <X className="h-5 w-5 text-rose-500/70" /> Nie
        </span>
      );
    }
    return <span className="font-medium text-white">{val}</span>;
  };

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[var(--bg)]">
        {/* Hero */}
        <section className="grid-bg relative flex min-h-[75vh] items-center pt-32 pb-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_35%,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="relative mx-auto w-full max-w-6xl px-6 text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Porovnanie rezervačných systémov na Slovensku
            </p>
            <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">
              Telio vs. Tradičné rezervačné systémy vs. Recepčná
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">
              Bežný rezervačný systém vyrieši len webový kalendár. Čo sa však stane, keď vám zákazník zavolá? Pozrite sa na detailné porovnanie nákladov, dostupnosti a funkcií.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#waitlist"
                onClick={() => trackEvent("click_demo_cta", { location: "comparison_page_hero" })}
                className="btn-primary btn-xl w-full sm:w-auto"
              >
                Vyskúšať Telio na 14 dní zdarma
              </Link>
              <Link
                href="/#pricing"
                onClick={() => trackEvent("select_pricing_plan", { location: "comparison_page_hero" })}
                className="btn-ghost btn-xl w-full sm:w-auto"
              >
                Pozrieť cenník
              </Link>
            </div>
          </div>
        </section>

        {/* Insight Section: The hidden gap */}
        <section className="relative border-y border-white/10 bg-[#0c0c16] py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">40–60 % zákazníkov stále volá</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  Mnoho ľudí nemá čas klikať vo formulári. Chcú rýchlu odpoveď alebo špecifickú požiadavku. Ak nikto nedvihne, okamžite volajú vašej konkurencii.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Náklady na recepčnú rastú</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  Zamestnať recepčnú stojí firmu 1 400 € až 2 000 € mesačne s odvodmi. Napriek tomu dvíha len počas pracovných hodín a vybaví iba jeden hovor súčasne.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Hybridné riešenie Telio</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  Telio spája moderný webový rezervačný kalendár s inteligentným slovenským AI hlasovým asistentom. Všetky rezervácie z webu aj z telefónu máte v jednom kalendári.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Master Comparison Table */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Veľké porovnanie: Kto ponúka najviac za vaše peniaze?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-muted)]">
                Pozrite sa, ako si stojí Telio oproti tradičným rezervačným softvérom a klasickej recepčnej.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-4 text-sm font-semibold text-zinc-400">Vlastnosť / Parameter</th>
                    <th className="rounded-t-xl border-x border-t border-indigo-500/30 bg-indigo-500/10 p-4 text-center text-sm font-bold text-indigo-300">
                      <div className="text-base font-extrabold text-white">Telio</div>
                      <div className="text-xs text-indigo-300/80 font-normal">Web + AI telefonista</div>
                    </th>
                    <th className="p-4 text-center text-sm font-semibold text-zinc-300">
                      <div className="text-base font-bold text-white">Webové systémy</div>
                      <div className="text-xs text-zinc-400 font-normal">Reservio, Bookio a iné</div>
                    </th>
                    <th className="p-4 text-center text-sm font-semibold text-zinc-300">
                      <div className="text-base font-bold text-white">Bežná recepčná</div>
                      <div className="text-xs text-zinc-400 font-normal">Zamestnanec na plný úväzok</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisonData.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`transition-colors hover:bg-white/[0.02] ${row.highlight ? "bg-white/[0.03]" : ""}`}
                    >
                      <td className="p-4 text-sm font-medium text-zinc-200">
                        {row.feature}
                        {row.highlight && (
                          <span className="ml-2 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                            Kľúčový rozdiel
                          </span>
                        )}
                      </td>
                      <td className="border-x border-indigo-500/20 bg-indigo-500/[0.05] p-4 text-center text-sm">
                        {renderVal(row.telio)}
                      </td>
                      <td className="p-4 text-center text-sm">
                        {renderVal(row.traditional)}
                      </td>
                      <td className="p-4 text-center text-sm">
                        {renderVal(row.human)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-sm text-emerald-300">
              💡 <strong>Zhrnutie:</strong> Tradičné webové systémy sú skvelé, kým zákazník nezdvihne telefón. Recepčná je skvelá, kým neochorie, neskončí pracovná doba alebo nevolajú dvaja ľudia naraz. <strong>Telio spája silné stránky oboch za zlomok ceny.</strong>
            </div>
          </div>
        </section>

        {/* Detailed breakdown: Telio vs Reservio & Bookio */}
        <section className="border-t border-white/10 bg-[#0a0a14] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                  Priame porovnanie
                </div>
                <h3 className="mt-3 text-3xl font-extrabold text-white">Telio vs. Webové rezervačné softvéry</h3>
                <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">
                  Rezervačné systémy ako Reservio, Bookio, Reservanto či reenio sú populárne riešenia pre online formuláre. Telio však prináša novú generáciu automatizácie.
                </p>

                <div className="mt-6 space-y-4 text-sm text-zinc-300">
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Žiadne zmeškané hovory:</strong> Kým bežný systém pri zvonení telefónu mlčí, Telio hovor do 2 sekúnd zodpovie, odpovie na otázky a termín zapíše.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Jeden centrálny kalendár:</strong> Rezervácie z vášho webu aj z telefónu idú do toho istého kalendára. Žiadne duplicity ani manuálne prepisovanie.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Prirodzená slovenská reč:</strong> Zákazník má pocit, že hovorí s milou, profesionálnou recepčnou.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Finančná úspora
                </div>
                <h3 className="mt-3 text-3xl font-extrabold text-white">Telio vs. Zamestnanie recepčnej</h3>
                <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">
                  Zamestnať človeka je dôležité pre osobný kontakt na prevádzke. Dvíhanie rutinných telefonátov a zapisovanie termínov však personál zbytočne vyčerpáva a stojí tisíce eur.
                </p>

                <div className="mt-6 space-y-4 text-sm text-zinc-300">
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Úspora viac ako 1 300 € mesačne:</strong> Telio stojí 50 € až 99 € mesačne. Nemusíte riešiť odvody, stravné, pracovné miesto ani PN.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Personál sa venuje prítomným zákazníkom:</strong> Lekár sa môže sústrediť na pacienta, kaderník na strihanie, tréner na kurt. Telefón zvoní bez vyrušovania.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <strong className="text-white">Rezervácie v noci aj cez víkend:</strong> Viac ako 30 % ľudí robí rezervácie po 18:00 alebo cez víkend, keď bežná recepcia nepracuje.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-3xl font-extrabold text-white md:text-4xl">
              Často kladené otázky k porovnaniu
            </h2>
            <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0c0c16] p-6">
              {faqs.map(([q, a], idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between text-left text-base font-semibold text-white transition hover:text-indigo-300"
                    >
                      <span>{q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-indigo-400" : ""}`}
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
              Prejdite na moderný rezervačný systém s hlasovou AI
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-muted)]">
              Vyskúšajte Telio na 14 dní úplne zadarmo. Nastavenie zvládneme spoločne a bez nutnosti meniť vaše existujúce telefónne číslo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#waitlist"
                onClick={() => trackEvent("click_demo_cta", { location: "comparison_bottom_cta" })}
                className="btn-primary btn-xl w-full sm:w-auto"
              >
                Vyskúšať Telio zdarma
              </Link>
              <Link
                href="/ai-hlasovy-asistent"
                className="btn-ghost btn-xl w-full sm:w-auto"
              >
                Viac o AI asistentovi
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
