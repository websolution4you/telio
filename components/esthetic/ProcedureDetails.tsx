"use client";

import { useState } from "react";
import { Sparkles, Clock, CircleDollarSign, ShieldCheck, HeartPulse, ChevronRight, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type Procedure = {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  duration: string;
  price: string;
  recovery: string;
  suitability: string;
  icon: any;
};

const procedures: Procedure[] = [
  {
    id: "hyaluronic",
    name: "Výplň kyselina hyalurónová",
    shortDesc: "Modelácia pier, líc a korekcia vrások s okamžitým efektom.",
    fullDesc: "Aplikácia prémiových výplňových materiálov s kyselinou hyalurónovou pre hydratáciu, korekciu asymetrií pier, vyplnenie hlbokých vrások alebo remodeláciu kontúr tváre. Výsledky sú viditeľné ihneď a pretrvávajú 6 až 12 mesiacov.",
    duration: "30 - 45 minút",
    price: "od 190 €",
    recovery: "1 - 3 dni (možný mierny opuch)",
    suitability: "Vhodné pre hydratáciu, zväčšenie pier a korekciu strateného objemu tváre.",
    icon: Sparkles
  },
  {
    id: "botox",
    name: "Aplikácia Botulotoxínu",
    shortDesc: "Vyhladenie mimických vrások a prevencia starnutia pleti.",
    fullDesc: "Ošetrenie zamerané na redukciu mimických vrások dočasným uvoľnením činnosti svalov. Zákrok trvá len pár minút a výsledný efekt nastupuje po 3 až 7 dňoch, pričom vydrží 3 až 6 mesiacov.",
    duration: "15 - 20 minút",
    price: "od 130 €",
    recovery: "Žiadne (okamžitý návrat k aktivitám)",
    suitability: "Ideálne na odstránenie vrások hnevu, čelných vrások a vrások smiechu.",
    icon: ShieldCheck
  },
  {
    id: "pmu",
    name: "Permanentný make-up",
    shortDesc: "Dlhodobé zvýraznenie obočia, pier alebo očných liniek.",
    fullDesc: "Mikropigmentácia pokožky na zvýraznenie prirodzených kontúr tváre. Využívame šetrné techniky ako púdrové obočie (shading) alebo akvarelové pery. Pigment sa postupne prirodzene vytráca.",
    duration: "90 - 120 minút",
    price: "od 180 €",
    recovery: "5 - 7 dní (odlupovanie jemných chrást)",
    suitability: "Pre ženy, ktoré chcú ušetriť čas pri líčení a vyzerať upravene 24/7.",
    icon: HeartPulse
  },
  {
    id: "laser-tx",
    name: "Laserové ošetrenia",
    shortDesc: "Omladenie pleti, odstránenie jaziev, pigmentácií a cievok.",
    fullDesc: "Moderné laserové technológie pre resurfacing pleti, stimuláciu nového kolagénu, redukciu jaziev po akné, odstránenie pigmentových škvŕn a elimináciu začervenaní či cievok na tvári.",
    duration: "30 - 60 minút",
    price: "od 80 €",
    recovery: "2 - 5 dní (podľa intenzity ošetrenia)",
    suitability: "Pre omladenie pleti a odstránenie nedokonalostí pleti, jazvičiek a cievok.",
    icon: CircleDollarSign
  },
  {
    id: "laser-hair",
    name: "Laserová epilácia",
    shortDesc: "Trvalé odstránenie chĺpkov pomocou najmodernejšieho lasera.",
    fullDesc: "Bezpečné a vysoko účinné zničenie vlasových folikulov laserovým lúčom. Pre trvalý efekt je ošetrenie potrebné opakovať v intervaloch 4-6 týždňov kvôli rastovým fázam chĺpkov.",
    duration: "15 - 90 minút",
    price: "od 40 €",
    recovery: "Žiadne (jemné začervenanie v deň zákroku)",
    suitability: "Pre každého, kto sa chce natrvalo zbaviť chĺpkov a vyhnúť sa zarastaniu.",
    icon: Sparkles
  },
  {
    id: "cosmetics",
    name: "Kozmetika",
    shortDesc: "Hĺbkové čistenie, masáže a masky na mieru pre vašu pleť.",
    fullDesc: "Komplexná profesionálna starostlivosť o pleť zahŕňajúca povrchové a hĺbkové čistenie (ultrazvuk/manuálne), relaxačnú masáž tváre, krku a dekoltu, aplikáciu masiek a výživných sér.",
    duration: "60 - 90 minút",
    price: "od 50 €",
    recovery: "Žiadne (okamžité rozžiarenie pleti)",
    suitability: "Pre pravidelnú udržiavaciu starostlivosť a relaxáciu pleti.",
    icon: HeartPulse
  },
  {
    id: "dermatology",
    name: "Dermatológia",
    shortDesc: "Odborná diagnostika kožných ochorení a kontrola znamienok.",
    fullDesc: "Lekárske vyšetrenie kože, diagnostika problematickej pleti, nastavenie liečby akné, rosacey, ekzémov a dermatoskopická kontrola materských znamienok.",
    duration: "20 - 30 minút",
    price: "od 40 €",
    recovery: "Žiadne",
    suitability: "Pri kožných problémoch alebo pre preventívnu lekársku kontrolu znamienok.",
    icon: ShieldCheck
  },
  {
    id: "infusion",
    name: "Infúzna terapia",
    shortDesc: "Podanie vysokodávkového vitamínu C pre posilnenie imunity.",
    fullDesc: "Priame intravenózne podanie vitamínov, antioxidantov a stopových prvkov do krvného obehu pre maximálnu vstrebateľnosť. Pomáha pri únave, strese, oslabenej imunite a regenerácii.",
    duration: "30 - 45 minút",
    price: "od 60 €",
    recovery: "Žiadne",
    suitability: "Pre zvýšenie imunity, energie a rýchlu regeneráciu organizmu.",
    icon: CircleDollarSign
  },
  {
    id: "eyes-dark",
    name: "Odstránenie kruhov pod očami",
    shortDesc: "Neinvazívna redukcia tmavých kruhov a omladenie očného okolia.",
    fullDesc: "Špeciálne ošetrenie očného okolia zamerané na hydratáciu, zosvetlenie tmavých kruhov pod očami a vyhladenie vrások s využitím mezoterapie alebo špeciálnej kyseliny hyalurónovej.",
    duration: "30 - 45 minút",
    price: "od 120 €",
    recovery: "1 - 2 dni (mierny opuch)",
    suitability: "Pre unavené oči s tmavými kruhmi a povadnutou kožou očného okolia.",
    icon: Sparkles
  },
  {
    id: "lipolysis",
    name: "Injekčná lipolýza",
    shortDesc: "Odstránenie lokálneho tuku podbradku a tela pomocou enzýmov.",
    fullDesc: "Minimálne invazívna metóda aplikácie lipolytického roztoku priamo do nežiaduceho tukového tkaniva. Roztok rozpúšťa tukové bunky, ktoré telo následne prirodzene vylúči.",
    duration: "30 minút",
    price: "od 90 €",
    recovery: "3 - 5 dní (opuch, citlivosť na dotyk)",
    suitability: "Pre redukciu menších ložísk tuku odolných voči cvičeniu a diéte.",
    icon: CircleDollarSign
  },
  {
    id: "blepharoplasty",
    name: "Operácia viečok - Blefaroplastika",
    shortDesc: "Chirurgická korekcia previsajúcich horných alebo dolných viečok.",
    fullDesc: "Aj vy túžite zlepšiť vzhľad svojich viečok? Trápia vás previsajúce horné viečka alebo vačky pod očami? Ideálnym irrešením je blefaroplastika – korekcia viečok, ktorá vám dokonale omladí výzor a zvýrazní krásu vašich očí.",
    duration: "60 - 90 minút",
    price: "od 650 €",
    recovery: "7 - 14 dní (stehy sa odstraňujú po týždni)",
    suitability: "Pri previsoch kože horných viečok brániacich videniu alebo estetických vačkoch pod očami.",
    icon: ShieldCheck
  }
];

export default function ProcedureDetails() {
  const [selectedId, setSelectedId] = useState<string>(procedures[0].id);

  const activeProcedure = procedures.find(p => p.id === selectedId) || procedures[0];

  const handleBookConsultation = () => {
    // Smooth scroll to the voice call assistant widget
    const assistantEl = document.getElementById("telio-voice-assistant");
    if (assistantEl) {
      assistantEl.scrollIntoView({ behavior: "smooth", block: "center" });
      // Temporary visually appealing focus state
      assistantEl.classList.add("ring-2", "ring-amber-400/50");
      setTimeout(() => {
        assistantEl.classList.remove("ring-2", "ring-amber-400/50");
      }, 2000);
    }
  };

  const IconComponent = activeProcedure.icon;

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Navigation list */}
      <div className="lg:col-span-5 flex flex-col gap-3 w-full">
        <h4 className="text-xs uppercase font-bold tracking-[0.2em] mb-2 px-1" style={{ color: "#E0B478" }}>
          Ponuka Estetických Zákrokov
        </h4>
        
        {procedures.map((p) => {
          const isSelected = p.id === selectedId;
          const PIcon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="w-full text-left p-5 rounded-2xl border transition-all duration-300 relative group cursor-pointer flex items-center justify-between"
              style={{
                background: isSelected 
                  ? "linear-gradient(135deg, rgba(224, 180, 120, 0.12) 0%, rgba(20, 16, 26, 0.6) 100%)" 
                  : "rgba(15, 12, 20, 0.4)",
                borderColor: isSelected ? "rgba(224, 180, 120, 0.35)" : "rgba(255, 255, 255, 0.05)",
                boxShadow: isSelected ? "0 10px 20px -5px rgba(224, 180, 120, 0.05)" : "none"
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl border transition-colors"
                  style={{
                    background: isSelected ? "rgba(224, 180, 120, 0.2)" : "rgba(255, 255, 255, 0.02)",
                    borderColor: isSelected ? "rgba(224, 180, 120, 0.3)" : "rgba(255, 255, 255, 0.08)",
                    color: isSelected ? "#E0B478" : "#A39E93"
                  }}
                >
                  <PIcon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-serif text-sm md:text-base font-medium tracking-wide transition-colors"
                    style={{ color: isSelected ? "#F5EFE6" : "#C7C4BC" }}
                  >
                    {p.name}
                  </h5>
                  <p className="text-xs text-stone-500 line-clamp-1 mt-0.5 font-sans">
                    {p.shortDesc}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-600 transition-transform group-hover:translate-x-1"
                style={{ color: isSelected ? "#E0B478" : "inherit" }}
              />
            </button>
          );
        })}
      </div>

      {/* Details Display Pane */}
      <div className="lg:col-span-7 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full p-8 rounded-3xl border backdrop-blur-md relative"
            style={{
              background: "linear-gradient(135deg, rgba(20, 16, 26, 0.7) 0%, rgba(12, 10, 15, 0.9) 100%)",
              borderColor: "rgba(224, 180, 120, 0.12)",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6)"
            }}
          >
            {/* Visual design elements */}
            <div className="absolute right-6 top-6 opacity-5 pointer-events-none">
              <IconComponent className="w-32 h-32 text-amber-300" />
            </div>

            <h3 className="text-2xl md:text-3xl font-serif text-amber-50/95 tracking-wide mb-4">
              {activeProcedure.name}
            </h3>

            <p className="text-sm md:text-base text-stone-300 leading-relaxed font-sans mb-8">
              {activeProcedure.fullDesc}
            </p>

            {/* Structured details grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.08)", background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="flex items-center gap-2 text-stone-500 mb-1 text-xs uppercase font-bold tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                  Dĺžka zákroku
                </div>
                <div className="text-sm font-medium text-stone-200">
                  {activeProcedure.duration}
                </div>
              </div>

              <div className="p-4 rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.08)", background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="flex items-center gap-2 text-stone-500 mb-1 text-xs uppercase font-bold tracking-wider">
                  <CircleDollarSign className="w-3.5 h-3.5 text-amber-400/70" />
                  Orientačná Cena
                </div>
                <div className="text-sm font-medium text-amber-300">
                  {activeProcedure.price}
                </div>
              </div>

              <div className="p-4 rounded-2xl border" style={{ borderColor: "rgba(224, 180, 120, 0.08)", background: "rgba(255, 255, 255, 0.01)" }}>
                <div className="flex items-center gap-2 text-stone-500 mb-1 text-xs uppercase font-bold tracking-wider">
                  <HeartPulse className="w-3.5 h-3.5 text-amber-400/70" />
                  Doba Zotavenia
                </div>
                <div className="text-sm font-medium text-stone-200">
                  {activeProcedure.recovery}
                </div>
              </div>
            </div>

            {/* Suitability panel */}
            <div className="p-5 rounded-2xl border mb-8"
              style={{
                borderColor: "rgba(224, 180, 120, 0.15)",
                background: "rgba(224, 180, 120, 0.03)"
              }}
            >
              <h6 className="text-xs uppercase font-bold tracking-wider text-amber-400/90 mb-1">Pre koho je zákrok vhodný?</h6>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">{activeProcedure.suitability}</p>
            </div>

            {/* Booking call-to-action */}
            <button
              onClick={handleBookConsultation}
              className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-sm tracking-wide transition-all duration-300 relative group overflow-hidden cursor-pointer text-stone-950"
              style={{
                background: "linear-gradient(135deg, #E0B478 0%, #C99757 100%)",
                boxShadow: "0 10px 25px -5px rgba(201, 151, 87, 0.25)"
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              <Phone className="w-4.5 h-4.5 relative z-10" />
              <span className="relative z-10 font-bold">Objednať termín konzultácie cez Telio asistent</span>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
