"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

export default function NtcPrivacyPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />

      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,255,209,0.06) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(123,97,255,0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Main Container */}
      <div
        className="relative z-10 w-full flex flex-col items-center px-6 sm:px-12"
        style={{ paddingTop: "140px", paddingBottom: "160px" }}
      >
        <div className="w-full flex flex-col items-start" style={{ maxWidth: "900px" }}>
          
          {/* Header */}
          <div
            className={`w-full transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ marginBottom: "60px" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00FFD1] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#00FFD1]">
                NTC Rezervácie · Mobilná aplikácia
              </span>
            </div>

            <h1
              className="text-3xl sm:text-6xl font-black text-white mb-6"
              style={{ letterSpacing: "-0.04em", lineHeight: 1.1 }}
            >
              Zásady ochrany osobných údajov
            </h1>
            
            <div
              className="h-1.5 w-32 rounded-full mb-6"
              style={{ background: "linear-gradient(90deg, var(--cyan), var(--purple))" }}
            />
            
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "var(--text-muted)" }}>
              Posledná aktualizácia: 9. augusta 2026
            </p>
          </div>

          {/* Intro Box */}
          <div
            className={`w-full p-8 sm:p-10 rounded-3xl border mb-16 backdrop-blur-xl transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-lg sm:text-xl leading-relaxed text-white/90 font-medium">
              Spoločnosť <strong className="text-[#00FFD1]">Telio s. r. o.</strong> prevádzkuje mobilnú aplikáciu{" "}
              <strong>NTC Rezervácie</strong>. Ochrana vašich osobných údajov a súkromia je pre nás najvyššou prioritou.
              Tento dokument vás informuje o tom, aké osobné údaje zhromažďujeme, ako ich používame, chránime a aké
              práva máte podľa Nariadenia Európskeho parlamentu a Rady (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane osobných údajov.
            </p>
          </div>

          {/* Policy Sections */}
          <div
            className={`w-full space-y-12 transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >

            {/* Section 1: Prevádzkovateľ */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">1.</span> Prevádzkovateľ osobných údajov
              </h2>
              <p className="text-base sm:text-lg text-white/70 mb-6 leading-relaxed">
                Prevádzkovateľom, ktorý určuje účely a prostriedky spracúvania vašich osobných údajov, je:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#00FFD1] font-bold mb-1">Obchodné meno</p>
                  <p className="text-lg font-bold text-white">Telio s. r. o.</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#00FFD1] font-bold mb-1">IČO</p>
                  <p className="text-lg font-bold text-white">57 615 802</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#00FFD1] font-bold mb-1">Sídlo</p>
                  <p className="text-base text-white/90">Bujnákova 1839/7, 841 01 Bratislava-Dúbravka</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#00FFD1] font-bold mb-1">E-mail & Telefón</p>
                  <p className="text-base text-white/90">info@telio.sk</p>
                  <p className="text-sm text-white/70">0915 962 068 · 0905 012 054</p>
                </div>
              </div>
            </section>

            {/* Section 2: Spracúvané osobné údaje */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">2.</span> Rozsah spracúvaných osobných údajov
              </h2>
              <p className="text-base sm:text-lg text-white/70 mb-6 leading-relaxed">
                V mobilnej aplikácii NTC Rezervácie spracúvame výhradne údaje potrebné pre vytvorenie rezervácie a správu vášho účtu:
              </p>
              <ul className="space-y-4 text-base sm:text-lg text-white/80 list-disc pl-6">
                <li>
                  <strong className="text-white">Identifikačné a kontaktné údaje:</strong> Meno, priezvisko, e-mailová adresa a telefónne číslo zadané pri registrácii alebo rezervácii.
                </li>
                <li>
                  <strong className="text-white">Údaje o rezerváciách:</strong> História a detaily vytvorených rezervácií (dátumy, časy, vybrané športoviská/kurty).
                </li>
                <li>
                  <strong className="text-white">Technické a systémové údaje:</strong> IP adresa, unikátny token zariadenia pre doručovanie notifikácií (Expo Push Token), typ a verzia operačného systému.
                </li>
              </ul>
            </section>

            {/* Section 3: Účel a právny základ */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">3.</span> Účel a právny základ spracúvania
              </h2>
              <div className="space-y-6 text-base sm:text-lg text-white/80">
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-2">A. Poskytovanie rezervačných služieb</h3>
                  <p className="text-white/70">
                    Spracúvanie je nevyhnutné na plnenie zmluvy (Čl. 6 ods. 1 písm. b GDPR) – umožnenie vyhľadávania termínov, vytvorenia a správy rezervácie v NTC.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-2">B. Zasielanie systémových notifikácií</h3>
                  <p className="text-white/70">
                    Spracúvanie prebieha na základe plnenia zmluvy / oprávneného záujmu (Čl. 6 ods. 1 písm. b/f GDPR) pre informovanie o potvrdení, zmenách alebo zrušení rezervácie.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-2">C. Plnenie zákonných povinností</h3>
                  <p className="text-white/70">
                    Spracúvanie na základe osobitných právnych predpisov (Čl. 6 ods. 1 písm. c GDPR) najmä pre oblasť účtovníctva a daní.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: Vymazanie účtu (Account Deletion - Google Play Requirement) */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-gradient-to-b from-[#00FFD1]/10 to-transparent border-[#00FFD1]/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-md bg-[#00FFD1]/20 text-[#00FFD1] text-xs font-black uppercase tracking-wider">
                  Dôležité
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">4.</span> Postup na vymazanie účtu a údajov
              </h2>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-6">
                V súlade s pravidlami Google Play Console a nariadením GDPR má každý používateľ právo kedykoľvek požiadať o trvalé vymazanie svojho používateľského účtu a všetkých s ním spojených osobných údajov.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-black/60 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-2 text-[#00FFD1]">Možnosť 1: Priamo v aplikácii</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    V mobilnej aplikácii NTC Rezervácie prejdite do sekcie <strong>Profil / Nastavenia</strong> a zvoľte možnosť <strong>„Vymazať účet“</strong>.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-black/60 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-2 text-[#00FFD1]">Možnosť 2: E-mailovou žiadosťou</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Zašlite e-mailovú žiadosť na adresu <strong className="text-white">info@telio.sk</strong> s predmetom <em>„Žiadosť o zmazanie účtu NTC Rezervácie“</em> a vaším e-mailom.
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/50 mt-6">
                * Po doručení žiadosti budú vaše osobné údaje nenávratne vymazané alebo anonymizované najneskôr do 30 dní, s výnimkou údajov uchovávaných podľa zákonných účtovných predpisov.
              </p>
            </section>

            {/* Section 5: Práva používateľa */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">5.</span> Vaše práva podľa GDPR
              </h2>
              <p className="text-base sm:text-lg text-white/70 mb-6 leading-relaxed">
                Ako dotknutá osoba máte podľa GDPR nasledovné práva:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <h4 className="font-bold text-white mb-1">Právo na prístup</h4>
                  <p className="text-xs text-white/60">Získať potvrdenie a kópiu spracúvaných osobných údajov.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <h4 className="font-bold text-white mb-1">Právo na opravu</h4>
                  <p className="text-xs text-white/60">Požiadať o opravu nesprávnych alebo neúplných údajov.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <h4 className="font-bold text-white mb-1">Právo na vymazanie</h4>
                  <p className="text-xs text-white/60">Trvalé vymazanie údajov, ak už nie sú potrebné pre daný účel.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <h4 className="font-bold text-white mb-1">Právo na prenosnosť</h4>
                  <p className="text-xs text-white/60">Získať údaje v štruktúrovanom, bežne používanom formáte.</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mt-6">
                Máte tiež právo podať sťažnosť na dozorný orgán: <strong>Úrad na ochranu osobných údajov SR</strong> (Hraničná 12, 820 07 Bratislava 27, <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="underline text-[#00FFD1]">dataprotection.gov.sk</a>).
              </p>
            </section>

            {/* Section 6: Tretie strany a bezpečnosť */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">6.</span> Tretie strany a bezpečnosť údajov
              </h2>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-6">
                Vaše osobné údaje <strong>nikdy nepredávame ani neposkytujeme tretím stranám na marketingové účely</strong>. Pre zaistenie chodu aplikácie využívame výhradne overené cloudové infraštruktúry (napr. Supabase cloud / AWS v EÚ) a oficiálne sprostredkovateľské služby pre push notifikácie (Expo, Google FCM, Apple APNs).
              </p>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed">
                Všetky dáta prenášané medzi mobilnou aplikáciou a serverom sú šifrované pomocou bezpečného protokolu <strong>HTTPS / TLS</strong>. Databáza využíva prísne riadenie prístupových práv.
              </p>
            </section>

            {/* Section 7: Kontakt */}
            <section className="w-full p-8 sm:p-10 rounded-3xl border bg-black/40 backdrop-blur-md border-white/10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="text-[#00FFD1]">7.</span> Kontaktné údaje
              </h2>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-6">
                V prípade akýchkoľvek otázok ohľadom spracúvania osobných údajov alebo uplatnenia vašich práv nás neváhajte kontaktovať:
              </p>
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white/90 font-medium space-y-2">
                <p><strong>Telio s. r. o.</strong></p>
                <p>Bujnákova 1839/7, 841 01 Bratislava-Dúbravka</p>
                <p>E-mail: <a href="mailto:info@telio.sk" className="text-[#00FFD1] underline">info@telio.sk</a></p>
                <p>Telefón: 0915 962 068 · 0905 012 054</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
