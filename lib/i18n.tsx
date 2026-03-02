"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "sk";

export const translations = {
  en: {
    nav: {
      howItWorks: "How it works",
      useCases: "Use cases",
      features: "Features",
      pricing: "Pricing",
      cta: "Get Early Access",
    },
    hero: {
      badge: "Beta version 1.0",
      h1a: "Your business,",
      h1b: "always on the line.",
      sub: "Telio is your 24/7 AI voice agent. It picks up every call, speaks naturally, books appointments, dispatches taxis — and never takes a day off.",
      cta1: "Get Early Access →",
      cta2: "See how it works",
      statResponse: "Response time",
      statAvail: "Always available",
      statCalls: "Calls answered",
      statLang: "Languages",
      live: "LIVE",
      events: [
        { emoji: "📅", text: "Table for four people — booked", time: "just now" },
        { emoji: "🚕", text: "Taxi to Tesco — dispatched", time: "2s ago" },
        { emoji: "🦷", text: "Appointment confirmed", time: "15s ago" },
        { emoji: "📅", text: "Table for two — booked", time: "32s ago" },
        { emoji: "🚕", text: "Taxi to Hospital — dispatched", time: "1m ago" },
      ],
      scroll: "scroll",
    },
    stats: [
      { value: "< 2s", label: "Average response time", sub: "From ring to first word" },
      { value: "24/7", label: "Always available", sub: "No breaks, no sick days" },
      { value: "100%", label: "Calls answered", sub: "Zero missed opportunities" },
      { value: "5+", label: "Business types", sub: "One platform, all industries" },
    ],
    howItWorks: {
      badge: "How it works",
      h2a: "From ring to resolved",
      h2b: "in seconds.",
      steps: [
        {
          number: "01",
          title: "Customer calls your number",
          description: "Telio picks up instantly — no waiting, no voicemail. It greets the caller in your business's name, just like a real receptionist would.",
          detail: "Average pickup time: 0.3 seconds",
        },
        {
          number: "02",
          title: "AI understands and responds",
          description: "Natural conversation powered by OpenAI. Telio understands intent, asks follow-up questions, checks availability, and takes action — all in real time.",
          detail: "Powered by GPT-4o + Whisper STT",
        },
        {
          number: "03",
          title: "You get instant notifications",
          description: "WhatsApp message to your driver. Calendar event created. Booking confirmed. Everything documented — zero effort on your side.",
          detail: "Google Calendar + WhatsApp + SMS",
        },
      ],
      step: "STEP",
    },
    useCases: {
      badge: "Use cases",
      h2a: "One AI agent.",
      h2b: "Any business.",
      actionLine: "Action completed · Google Calendar updated · Driver notified",
      liveLabel: "TELIO · LIVE CALL SIMULATION",
      cases: [
        {
          id: "restaurant", emoji: "🍽", label: "Restaurant",
          title: "Never lose a reservation again",
          description: "Telio answers every call, asks for date, time and party size, checks your Google Calendar in real time, and confirms the booking — all while you focus on the kitchen.",
          features: ["Real-time availability check via Google Calendar", "Automatic event creation with guest details", "Handles multiple languages (SK / EN)", "Works during rush hours when staff can't pick up"],
          callSample: [
            { role: "caller", text: "Dobrý deň, chcel by som rezervovať stôl." },
            { role: "ai", text: "Dobrý deň! Pre koľkých hostí a na ktorý dátum?" },
            { role: "caller", text: "Pre štyroch, v piatok o 19:00." },
            { role: "ai", text: "Výborne, mám vás zapísaných. Tešíme sa na vás v piatok!" },
          ],
          color: "var(--cyan)",
        },
        {
          id: "taxi", emoji: "🚕", label: "Taxi service",
          title: "Instant dispatch, zero missed rides",
          description: "Telio collects pickup and dropoff in natural speech, recognizes streets according to google maps, calculates the route via Google Maps, and sends the driver a WhatsApp with everything needed.",
          features: ["Natural Slovak address recognition", "Google Maps distance & ETA calculation", "Instant WhatsApp / SMS to driver with nav link", "Full call transcript saved for every ride"],
          callSample: [
            { role: "caller", text: "Ahoj, potrebujem taxík od Tesca na stanicu." },
            { role: "ai", text: "Dobre! Vyzdvihnutie z Tesca, cieľ hlavná stanica — potvrdíte?" },
            { role: "caller", text: "Áno, presne." },
            { role: "ai", text: "Super, taxík je na ceste! Trasa 2.3 km, cca 6 minút." },
          ],
          color: "#7B61FF",
        },
        {
          id: "dental", emoji: "🦷", label: "Dental / Clinic",
          title: "Your virtual medical receptionist",
          description: "Telio triages incoming calls — routine check-ups, urgent pain, prescription refills — routes them appropriately, and books into your calendar without interrupting the doctor.",
          features: ["Intent detection: urgent vs. routine", "Appointment booking with doctor schedule", "Patient-friendly, calm Slovak voice", "Emergency call escalation to human staff"],
          callSample: [
            { role: "caller", text: "Volám kvôli bolesti zuba, je to veľmi nepríjemné." },
            { role: "ai", text: "Prepáčte, porozumiem. Máme voľný termín dnes o 14:30 — vyhovuje?" },
            { role: "caller", text: "Áno, ďakujem veľmi pekne." },
            { role: "ai", text: "Zapísala som vás. Uvidíme sa o 14:30, veľa zdravia!" },
          ],
          color: "#00D4FF",
        },
        {
          id: "pizza", emoji: "🍕", label: "Pizzeria / Delivery",
          title: "Autonomous order taking, every time",
          description: "Handles the full order flow — menu items, quantities, delivery address, payment preference — and sends the confirmed order directly to your kitchen display or WhatsApp.",
          features: ["Full menu conversation flow", "Address geocoding for delivery routing", "Order confirmation sent to kitchen/driver", "Upsell suggestions built-in"],
          callSample: [
            { role: "caller", text: "Dobrý deň, chcem si objednať pizzu Margherita, veľkú." },
            { role: "ai", text: "Výborná voľba! Doručiť alebo vyzdvihnúť? Aká je vaša adresa?" },
            { role: "caller", text: "Doručiť, Hlavná 5, Levoča." },
            { role: "ai", text: "Objednávka prijatá! Doručenie cca za 35 minút. Ďakujeme!" },
          ],
          color: "#FF6B35",
        },
        {
          id: "salon", emoji: "💈", label: "Salon / Spa",
          title: "Book while you style",
          description: "While your hands are busy, Telio handles bookings, reschedules, and cancellations — keeping your calendar full without interrupting your flow.",
          features: ["Service & stylist selection via voice", "Real-time slot availability", "Reminder calls / SMS (coming soon)", "Works in Slovak and English"],
          callSample: [
            { role: "caller", text: "Chcem si rezervovať strihanie vlasov na utorok." },
            { role: "ai", text: "Utorok máme voľné o 10:00 alebo o 14:00 — ktorý termín vám vyhovuje?" },
            { role: "caller", text: "O 10:00, prosím." },
            { role: "ai", text: "Zapísaná! Do videnia v utorok o 10:00." },
          ],
          color: "#FF61DC",
        },
      ],
    },
    features: {
      badge: "Features",
      h2a: "Created for the real world.",
      h2b: "Used for reliability.",
      sub: "Every feature is production-tested — no demos. Telio handles real calls for real businesses today.",
      items: [
        { title: "Sub-second response", description: "AI starts speaking before you even finish thinking. Instant filler audio plays while the model processes — zero awkward silence.", badge: "< 1s latency" },
        { title: "Natural Slovak voice", description: 'Powered by OpenAI TTS with voice "nova". Sounds like a real person — warm, professional, native Slovak.', badge: "OpenAI TTS" },
        { title: "Google Calendar sync", description: "Checks real-time availability and creates events automatically. OAuth2 secured, per-tenant calendar isolation.", badge: "Google Calendar API" },
        { title: "Google Maps routing", description: "Geocodes spoken addresses in real time, calculates exact distance and ETA. Scoped to your service area.", badge: "Geocoding + Directions" },
        { title: "WhatsApp & SMS dispatch", description: "Instant driver or staff notification via Twilio. Includes pickup, dropoff, ETA, navigation link, and full call transcript.", badge: "Twilio API" },
        { title: "Multi-tenant architecture", description: "One platform, unlimited businesses. Each with their own phone number, persona, calendar, and business logic.", badge: "Unlimited tenants" },
        { title: "Barge-in detection", description: "When a caller speaks over the AI, Telio stops immediately and listens. Natural, human-like conversational rhythm.", badge: "RMS voice activity detection" },
        { title: "Full call transcripts", description: "Every conversation stored, searchable, and auditable. GPT-4 post-call analysis extracts structured data as a safety net.", badge: "Supabase + PostgreSQL" },
      ],
    },
    integrations: {
      sub: "Built on the most reliable APIs in the world",
      h2a: "Market-leading integrations,",
      h2b: "out of the box.",
      note: "All integrations are production-grade and battle-tested.",
      noteHighlight: "No demos.",
    },
    pricing: {
      badge: "Pricing",
      h2a: "Clear, transparent",
      h2b: "pricing.",
      sub: "No hidden fees. No per-call charges. Just one flat monthly price.",
      trialNote: "All plans include a",
      trialBold: "14-day free trial",
      trialEnd: ". No credit card required.",
      plans: [
        {
          name: "Starter", price: "€99", period: "/month",
          description: "Perfect for a single location getting started with AI voice.",
          features: ["1 business / phone number", "Up to 300 minutes / month", "Mode according to business type", "Google Calendar sync", "Full call transcripts", "Support within 24 hours"],
          cta: "Start free trial", highlighted: false, badge: null,
        },
        {
          name: "Business", price: "€199", period: "/month",
          description: "For growing businesses that need more capacity and power.",
          features: ["700 minutes / month", "All business modes", "Google Calendar + Maps", "WhatsApp + SMS dispatch", "Custom AI persona name", "Full analytics dashboard", "Priority 24/7 support"],
          cta: "Get started", highlighted: true, badge: "Most popular",
        },
        {
          name: "Enterprise", price: "Custom", period: "",
          description: "For chains, franchises, and platforms that need scale.",
          features: ["Unlimited businesses", "Unlimited calls", "Custom AI voice & persona", "Dedicated phone numbers", "SLA guarantee (99.9%)", "Custom integrations", "Onboarding & training", "Dedicated account manager"],
          cta: "Contact us", highlighted: false, badge: null,
        },
      ],
    },
    waitlist: {
      badge: "Beta version 1.0 · Limited spots",
      h2a: "Be among the first to automate",
      h2b: "your business.",
      sub: "Join businesses already on the waitlist. We are rolling out the production version in groups — get in early for priority access and launch pricing.",
      placeholder: "your@email.com",
      cta: "Join Waitlist →",
      successTitle: "You're on the list!",
      successSub: "We'll be in touch soon. Check your email for confirmation.",
      businesses: ["Restaurant", "Taxi", "Dental / Clinic", "Pizzeria", "Salon", "Other"],
      trust: ["No credit card required", "14-day free trial", "Cancel anytime"],
    },
    footer: {
      tagline: "Your 24/7 AI voice agent for Slovak businesses. Never miss a customer call again.",
      status: "System operational · All services online",
      product: "Product",
      industries: "Industries",
      company: "Company",
      productLinks: ["Features", "Use cases", "Pricing", "Changelog"],
      industryLinks: ["Restaurant", "Taxi & Transport", "Healthcare", "Food delivery", "Salons"],
      companyLinks: ["About", "Privacy Policy", "Terms of Service", "Contact"],
      copyright: "© 2025 Telio. All rights reserved. Made with ♥ in Slovakia.",
    },
  },

  sk: {
    nav: {
      howItWorks: "Ako to funguje",
      useCases: "Možnosti použitia",
      features: "Funkcie",
      pricing: "Cenník",
      cta: "Získať prístup",
    },
    hero: {
      badge: "Beta verzia 1.0",
      h1a: "Váš biznis",
      h1b: "nezaspí nikdy.",
      sub: "Telio je váš AI hlasový agent 24/7. Zdvihne každý hovor, hovorí prirodzene po slovensky, rezervuje termíny, dispečuje taxíky — a nikdy si nevezme voľno.",
      cta1: "Získať prístup →",
      cta2: "Zistiť viac",
      statResponse: "Čas odozvy",
      statAvail: "Vždy k dispozícii",
      statCalls: "Zodpovedané hovory",
      statLang: "Jazyky",
      live: "LIVE",
      events: [
        { emoji: "📅", text: "Stôl pre štyri osoby — rezervovaný", time: "práve teraz" },
        { emoji: "🚕", text: "Taxi do Tesca — odoslané", time: "pred 2s" },
        { emoji: "🦷", text: "Termín potvrdený", time: "pred 15s" },
        { emoji: "📅", text: "Stôl pre dvoch — rezervovaný", time: "pred 32s" },
        { emoji: "🚕", text: "Taxi do nemocnice — odoslané", time: "pred 1m" },
      ],
      scroll: "scroll",
    },
    stats: [
      { value: "< 2s", label: "Priemerný čas odozvy", sub: "Od zvonenia po prvé slovo" },
      { value: "24/7", label: "Vždy k dispozícii", sub: "Žiadne prestávky ani dni voľna" },
      { value: "100%", label: "Zodpovedané hovory", sub: "Nulová strata zákazníkov" },
      { value: "5+", label: "Typy prevádzok", sub: "Jedna platforma, všetky odvetvia" },
    ],
    howItWorks: {
      badge: "Ako to funguje",
      h2a: "Od zvonenia k vybaveniu",
      h2b: "za pár sekúnd.",
      steps: [
        {
          number: "01",
          title: "Zákazník zavolá na vaše číslo",
          description: "Telio zdvihne okamžite — žiadne čakanie, žiadna hlasová schránka. Privíta volajúceho v mene vašej prevádzky, presne ako skutočná recepčná.",
          detail: "Priemerný čas zdvihnutia: 0,3 sekundy",
        },
        {
          number: "02",
          title: "AI rozumie a odpovedá",
          description: "Prirodzený rozhovor poháňaný OpenAI. Telio pochopí zámer, pýta sa doplňujúce otázky, overuje dostupnosť a vykoná akciu — všetko v reálnom čase.",
          detail: "Poháňané GPT-4o + Whisper STT",
        },
        {
          number: "03",
          title: "Dostanete okamžité upozornenia",
          description: "WhatsApp správa vodičovi. Vytvorená udalosť v kalendári. Potvrdená rezervácia. Všetko zdokumentované — nulová námaha z vašej strany.",
          detail: "Google Calendar + WhatsApp + SMS",
        },
      ],
      step: "KROK",
    },
    useCases: {
      badge: "Možnosti použitia",
      h2a: "Jeden AI agent.",
      h2b: "Akákoľvek prevádzka.",
      actionLine: "Akcia dokončená · Google Calendar aktualizovaný · Vodič notifikovaný",
      liveLabel: "TELIO · SIMULÁCIA ŽIVÉHO HOVORU",
      cases: [
        {
          id: "restaurant", emoji: "🍽", label: "Reštaurácia",
          title: "Nikdy nestratíte rezerváciu",
          description: "Telio odpovedá na každý hovor, pýta sa na dátum, čas a počet hostí, overuje dostupnosť v Google Calendar v reálnom čase a potvrdí rezerváciu — kým sa vy sústredíte na kuchyňu.",
          features: ["Overenie dostupnosti v reálnom čase cez Google Calendar", "Automatické vytvorenie udalosti s detailmi hostí", "Funguje vo viacerých jazykoch (SK / EN)", "Pracuje aj počas špičky, keď personál nestačí zdvíhať"],
          callSample: [
            { role: "caller", text: "Dobrý deň, chcel by som rezervovať stôl." },
            { role: "ai", text: "Dobrý deň! Pre koľkých hostí a na ktorý dátum?" },
            { role: "caller", text: "Pre štyroch, v piatok o 19:00." },
            { role: "ai", text: "Výborne, mám vás zapísaných. Tešíme sa na vás v piatok!" },
          ],
          color: "var(--cyan)",
        },
        {
          id: "taxi", emoji: "🚕", label: "Taxislužba",
          title: "Okamžitý dispečing, nula zmeškaných jázd",
          description: "Telio zozbiera adresu vyzdvihnutia a cieľ v prirodzenej reči, rozpozná ulice podľa google máp, vypočíta trasu cez Google Maps a pošle vodičovi WhatsApp so všetkými informáciami.",
          features: ["Rozpoznávanie slovenských adries v prirodzenej reči", "Výpočet vzdialenosti a ETA cez Google Maps", "Okamžitý WhatsApp / SMS vodičovi s navigačným odkazom", "Zápis kompletného prepisu hovoru pre každú jazdu"],
          callSample: [
            { role: "caller", text: "Ahoj, potrebujem taxík od Tesca na stanicu." },
            { role: "ai", text: "Dobre! Vyzdvihnutie z Tesca, cieľ hlavná stanica — potvrdíte?" },
            { role: "caller", text: "Áno, presne." },
            { role: "ai", text: "Super, taxík je na ceste! Trasa 2,3 km, cca 6 minút." },
          ],
          color: "#7B61FF",
        },
        {
          id: "dental", emoji: "🦷", label: "Zubár / Klinika",
          title: "Vaša virtuálna zdravotná sestra",
          description: "Telio triáži prichádzajúce hovory — bežné prehliadky, akútna bolesť, predpisy — správne ich presmeruje a zarezervuje termín v kalendári bez toho, aby rušil lekára.",
          features: ["Detekcia zámeru: urgentné vs. bežné", "Rezervácia termínu podľa rozvrhu lekára", "Príjemný, pokojný slovenský hlas", "Eskalácia urgentných hovorov na živý personál"],
          callSample: [
            { role: "caller", text: "Volám kvôli bolesti zuba, je to veľmi nepríjemné." },
            { role: "ai", text: "Prepáčte, porozumiem. Máme voľný termín dnes o 14:30 — vyhovuje?" },
            { role: "caller", text: "Áno, ďakujem veľmi pekne." },
            { role: "ai", text: "Zapísala som vás. Uvidíme sa o 14:30, veľa zdravia!" },
          ],
          color: "#00D4FF",
        },
        {
          id: "pizza", emoji: "🍕", label: "Pizzeria / Rozvoz",
          title: "Autonómne prijímanie objednávok",
          description: "Zvládne celý tok objednávky — položky z menu, množstvá, adresa doručenia, spôsob platby — a potvrdenie pošle priamo na váš kuchynský displej alebo WhatsApp.",
          features: ["Kompletný konverzačný tok objednávky", "Geokódovanie adresy pre plánovanie dovozu", "Potvrdenie objednávky odoslané do kuchyne / vodičovi", "Vstavaná funkcia na odporúčanie doplnkov"],
          callSample: [
            { role: "caller", text: "Dobrý deň, chcem si objednať pizzu Margherita, veľkú." },
            { role: "ai", text: "Výborná voľba! Doručiť alebo vyzdvihnúť? Aká je vaša adresa?" },
            { role: "caller", text: "Doručiť, Hlavná 5, Levoča." },
            { role: "ai", text: "Objednávka prijatá! Doručenie cca za 35 minút. Ďakujeme!" },
          ],
          color: "#FF6B35",
        },
        {
          id: "salon", emoji: "💈", label: "Kadernícky salón",
          title: "Rezervujte, kým strihate",
          description: "Kým máte ruky plné práce, Telio vybavuje rezervácie, presúvanie termínov a storná — váš kalendár zostane plný bez prerušenia vášho toku.",
          features: ["Výber služby a kaderníka hlasom", "Dostupnosť termínov v reálnom čase", "Pripomienky cez hovor / SMS (čoskoro)", "Funguje po slovensky aj anglicky"],
          callSample: [
            { role: "caller", text: "Chcem si rezervovať strihanie vlasov na utorok." },
            { role: "ai", text: "Utorok máme voľné o 10:00 alebo o 14:00 — ktorý termín vám vyhovuje?" },
            { role: "caller", text: "O 10:00, prosím." },
            { role: "ai", text: "Zapísaná! Do videnia v utorok o 10:00." },
          ],
          color: "#FF61DC",
        },
      ],
    },
    features: {
      badge: "Funkcie",
      h2a: "Vyvorené pre reálny svet.",
      h2b: "Využívané pre spoľahlivosť.",
      sub: "Každá funkcia je testovaná v produkčnom prostredí — žiadne demá. Telio dnes vybavuje skutočné hovory pre skutočné prevádzky.",
      items: [
        { title: "Odozva pod sekundu", description: "AI začne hovoriť skôr, než dokončíte myšlienku. Okamžitý výplňový zvuk hrá, kým model spracúva — nula nepríjemného ticha.", badge: "< 1s latencia" },
        { title: "Prirodzený slovenský hlas", description: 'Poháňané OpenAI TTS s hlasom "nova". Znie ako skutočný človek — priateľský, profesionálny, rodný Slovák.', badge: "OpenAI TTS" },
        { title: "Synchronizácia s Google Kalendárom", description: "Overuje dostupnosť v reálnom čase a automaticky vytvára udalosti. Zabezpečené OAuth2, izolácia kalendára pre každého nájomníka.", badge: "Google Calendar API" },
        { title: "Smerovanie cez Google Maps", description: "Geokóduje hovorené adresy v reálnom čase, vypočíta presnú vzdialenosť a ETA. Ohraničené na vašu servisnú oblasť.", badge: "Geocoding + Directions" },
        { title: "Dispečing cez WhatsApp a SMS", description: "Okamžité upozornenie vodičovi alebo personálu cez Twilio. Obsahuje miesto vyzdvihnutia, cieľ, ETA, navigačný odkaz a prepis hovoru.", badge: "Twilio API" },
        { title: "Multi-tenant architektúra", description: "Jedna platforma, neobmedzené prevádzky. Každá s vlastným telefónnym číslom, personou, kalendárom a business logikou.", badge: "Neobmedzené prevádzky" },
        { title: "Detekcia prerušenia", description: "Keď volajúci hovorí cez AI, Telio okamžite zamlčí a počúva. Prirodzený, ľudský rytmus konverzácie.", badge: "RMS detekcia hlasovej aktivity" },
        { title: "Kompletné prepisy hovorov", description: "Každý rozhovor uložený, vyhľadateľný a auditovateľný. GPT-4 analýza po hovore extrahuje štruktúrované dáta ako záchranná sieť.", badge: "Supabase + PostgreSQL" },
      ],
    },
    integrations: {
      sub: "Postavené na najspoľahlivejších API sveta",
      h2a: "Integrácie jednotiek na trhu,",
      h2b: "hneď v balíku.",
      note: "Všetky integrácie sú produkčné a overené v praxi.",
      noteHighlight: "Žiadne demá.",
    },
    pricing: {
      badge: "Cenník",
      h2a: "Prehľadný, transparentný",
      h2b: "cenník.",
      sub: "Žiadne skryté poplatky. Žiadne účtovanie za hovor. Jeden paušálny mesačný poplatok.",
      trialNote: "Všetky plány zahŕňajú",
      trialBold: "14-dňovú skúšobnú dobu zdarma",
      trialEnd: ". Platobná karta nie je potrebná.",
      plans: [
        {
          name: "Starter", price: "€99", period: "/mesiac",
          description: "Ideálne pre jednu prevádzku, ktorá chce začať s AI hlasovým agentom.",
          features: ["1 prevádzka / telefónne číslo", "Až 300 minút / mesiac", "Režim podľa prevádzky", "Synchronizácia s Google Kalendárom", "Kompletné prepisy hovorov", "Podpora do 24 hodín"],
          cta: "Začať zadarmo", highlighted: false, badge: null,
        },
        {
          name: "Business", price: "€199", period: "/mesiac",
          description: "Pre rastúce prevádzky, ktoré potrebujú väčšiu kapacitu a výkon.",
          features: ["700 minút / mesiac", "Všetky obchodné režimy", "Google Calendar + Maps", "Dispečing cez WhatsApp + SMS", "Vlastné meno AI persony", "Kompletný analytický dashboard", "Prioritná podpora 24/7"],
          cta: "Začať teraz", highlighted: true, badge: "Najpopulárnejší",
        },
        {
          name: "Enterprise", price: "Custom", period: "",
          description: "Pre siete, franšízy a platformy, ktoré potrebujú škálovanie.",
          features: ["Neobmedzené prevádzky", "Neobmedzené hovory", "Vlastný AI hlas a persona", "Dedikované telefónne čísla", "SLA garancia (99,9 %)", "Vlastné integrácie", "Onboarding a školenie", "Dedikovaný account manager"],
          cta: "Kontaktujte nás", highlighted: false, badge: null,
        },
      ],
    },
    waitlist: {
      badge: "Beta verzia 1.0 · Obmedzený počet miest",
      h2a: "Buďte medzi prvými, ktorí automatizujú",
      h2b: "svoju prevádzku.",
      sub: "Pridajte sa k firmám, ktoré sú už na čakacom zozname. Produkčnú verziu zavádzame po skupinách — zaregistrujte sa skoro pre prioritný prístup a zavádzaciu cenu.",
      placeholder: "vas@email.sk",
      cta: "Pridať sa na čakací zoznam →",
      successTitle: "Ste na zozname!",
      successSub: "Čoskoro Vás budeme kontaktovať. Skontrolujte si emailovú schránku.",
      businesses: ["Reštaurácia", "Taxi", "Zubár / Klinika", "Pizzeria", "Salón", "Iné"],
      trust: ["Platobná karta nie je potrebná", "14 dní zadarmo", "Zrušenie kedykoľvek"],
    },
    footer: {
      tagline: "Váš AI hlasový agent 24/7 pre slovenské firmy. Nikdy nestratíte zákazníka.",
      status: "Systém funguje · Všetky služby online",
      product: "Produkt",
      industries: "Odvetvia",
      company: "Spoločnosť",
      productLinks: ["Funkcie", "Možnosti použitia", "Cenník", "Zmeny"],
      industryLinks: ["Reštaurácia", "Taxi & doprava", "Zdravotníctvo", "Rozvoz jedla", "Salóny"],
      companyLinks: ["O nás", "Ochrana súkromia", "Podmienky služby", "Kontakt"],
      copyright: "© 2025 Telio. Všetky práva vyhradené. Vyrobené s ♥ na Slovensku.",
    },
  },
} as const;

// Use a loose type so both SK and EN strings are accepted
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translations = any;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType>({
  lang: "sk",
  setLang: () => { },
  t: translations.sk,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("sk");
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
