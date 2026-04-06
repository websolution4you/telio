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
      about: "About us",
      cta: "Get Early Access",
    },
    aboutUs: {
      badge: "Team",
      h2a: "The minds behind",
      h2b: "Telio.",
      kamil: {
        name: "Kamil",
        role: "Co-founder & AI Architect",
        description: "Kamil leads the technological vision of Telio and designs the architecture of AI agents capable of natural customer interaction and reliable handling of complex real-time business scenarios.\n\nHe focuses on integrating AI, voice technologies, and backend systems to ensure Telio's solutions are scalable, accurate, and ready for real-world enterprise deployment."
      },
      peto: {
        name: "Peťo",
        role: "Co-founder & Product Lead",
        description: "Peťo is responsible for the product vision and user experience at Telio. As a skilled data analyst, he can extract relevant insights and tailor them to the company's needs to maximize business potential.\n\nHe bridges customer needs with technological capabilities, ensuring that AI agents provide real value, solve specific entrepreneurial challenges, and deliver measurable results."
      }
    },
    hero: {
      badge: "Telio is online",
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
      { value: "∞", label: "Business types", sub: "One platform, all industries" },
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
          detail: "",
        },
        {
          number: "02",
          title: "AI understands and responds",
          description: "Natural conversation powered by OpenAI. Telio understands intent, asks follow-up questions, checks availability, and takes action — all in real time.",
          detail: "",
        },
        {
          number: "03",
          title: "You get instant notifications",
          description: "WhatsApp message to your driver. Calendar event created. Booking confirmed. Everything documented — zero effort on your side.",
          detail: "",
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
      h2a: "Your reliable partner,",
      h2b: "who handles everything for you.",
      sub: "",
      items: [
        { title: "Natural Slovak voice", description: 'Sounds like a real person — warm, professional, native Slovak.', badge: "" },
        { title: "Google Calendar sync", description: "Checks real-time availability and creates events automatically. OAuth2 secured, per-tenant calendar isolation.", badge: "" },
        { title: "Google Maps routing", description: "Geocodes spoken addresses in real time, calculates exact distance and ETA. Scoped to your service area.", badge: "" },
        { title: "WhatsApp & SMS dispatch", description: "Instant driver or staff notification. Includes pickup, dropoff, ETA, navigation link, and full call transcript.", badge: "" },
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
          name: "Starter",
          price: "99 €",
          priceSub: "/ month",
          description: "Perfect for single locations getting started with AI voice.",
          features: ["1 AI voice assistant", "300 minutes included / month", "Rate 0.33€ / min after limit", "Support within 48 hours"],
          cta: "Try for free", highlighted: false, badge: null,
        },
        {
          name: "Business",
          price: "239 €",
          priceSub: "/ month",
          description: "For growing businesses needing more capacity and power.",
          features: ["3 AI voice assistants *", "1000 minutes included / month", "Rate 0.23€ / min after limit", "Full analytics dashboard", "Address validation via Google Maps", "Confirmation via WhatsApp + SMS", "Support within 24 hours"],
          cta: "Try for free", highlighted: true, badge: "Most popular",
          note: "* Can handle 3 calls simultaneously",
        },
        {
          name: "Enterprise",
          price: "Custom",
          priceSub: "tailored",
          description: "For chains, franchises, and platforms that need scale.",
          features: ["10+ AI voice assistants", "More than 5000 minutes", "Priority support", "Full analytics dashboard", "Custom integrations", "Onboarding & training"],
          cta: "Contact us", highlighted: false, badge: null,
        },
      ],
    },
    waitlist: {
      badge: "Beta v1.0 · Limited Slots",
      h2a: "Be among the first to automate",
      h2b: "your business.",
      sub: "Fill out our form and we'll contact you within 48 hours for priority access and introductory pricing.",
      businessLabel: "Select business area",
      nameLabel: "Name",
      emailLabel: "Email",
      phoneLabel: "Phone number (optional)",
      messageLabel: "More information (optional)",
      messagePlaceholder: "Describe your business or needs...",
      placeholder: "your@email.com",
      cta: "Send",
      successTitle: "You're in!",
      successSub: "We've received your request. We'll contact you within 48 hours. Check your inbox.",
      businesses: ["Restaurant", "Taxi", "Dentist / Clinic", "Pizzeria", "Salon", "Other"],
      trust: ["14 days free", "Cancel anytime"],
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
      copyright: "© 2025 Telio. All rights reserved. Peťo & Kamil ♥",
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: April 1st 2026",
      introduction: "This Privacy Policy explains how Telio processes personal data when you use our website (www.telio.sk), services, and AI voice solutions. Personal data refers to any information relating to an identifiable individual. We process personal data in accordance with the EU GDPR, the Slovak Act on Personal Data Protection, and other applicable laws.",
      sections: [
        {
          title: "1. Interpretation and Definitions",
          content: "The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.",
          subsections: [
            { title: "Account", text: "A unique account created for You to access our Service." },
            { title: "Company", text: "Refers to Telio." },
            { title: "Cookies", text: "Small files placed on Your device containing browsing history details." },
            { title: "Personal Data", text: "Information that relates to an identified or identifiable individual." },
            { title: "Service", text: "Refers to the Website and the Telio AI Platform." },
            { title: "Usage Data", text: "Data collected automatically, such as IP address and visit duration." }
          ]
        },
        {
          title: "2. Collecting and Using Your Personal Data",
          content: "We collect personal information such as email address, name, phone number, and usage data to provide and improve our Service. Usage data is collected automatically and may include IP addresses, browser types, and mobile device identifiers.",
        },
        {
          title: "3. Use of Your Personal Data",
          content: "The Company may use Personal Data to maintain our Service, manage Your Account, perform contracts, contact You with updates, and manage Your requests.",
        },
        {
          title: "4. Retention of Your Personal Data",
          content: "We will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations.",
        },
        {
          title: "5. Transfer of Your Personal Data",
          content: "Your information may be processed at the Company's operating offices. Your consent to this Privacy Policy represents Your agreement to that transfer. We ensure an adequate level of data protection by relying on standard contractual clauses for international transfers.",
        },
        {
          title: "6. Security of Your Personal Data",
          content: "The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet is 100% secure. We strive to use commercially acceptable means to protect Your Personal Data.",
        },
        {
          title: "7. Your Rights",
          content: "You have the right to access, rectify, or erase your data. You may also object to processing or request data portability. To exercise these rights, contact us at info@telio.sk.",
        }
      ]
    },
    demoCall: {
      tryDemo: "Try Demo Call",
      connecting: "Connecting...",
      endCall: "End Call",
    },
  },

  sk: {
    nav: {
      howItWorks: "Ako to funguje",
      useCases: "Možnosti použitia",
      features: "Funkcie",
      pricing: "Cenník",
      about: "O nás",
      cta: "Získať prístup",
    },
    aboutUs: {
      badge: "O nás",
      h2a: "Kto stojí za",
      h2b: "Telio.",
      kamil: {
        name: "Kamil",
        role: "Spoluzakladateľ & AI Architekt",
        description: "Kamil vedie technologickú víziu Telio a navrhuje architektúru AI agentov, ktorí dokážu prirodzene komunikovať so zákazníkmi a spoľahlivo zvládať komplexné biznis scenáre v reálnom čase.\n\nZameriava sa na prepojenie umelej inteligencie, voice technológií a backend systémov tak, aby riešenia Telio boli škálovateľné, presné a pripravené pre reálne nasadenie vo firmách."
      },
      peto: {
        name: "Peťo",
        role: "Spoluzakladateľ & Product Lead",
        description: "Peťo zodpovedá za produktovú víziu a používateľskú skúsenosť Telio. Ako skúsený dátový analytik dokáže vytiahnuť relevantné dáta a prispôsobiť ich firme tak, aby vyťažila zo svojho podnikania čo najviac.\n\nPrepája potreby zákazníkov s technologickými možnosťami tak, aby AI agenti prinášali firmám reálnu hodnotu, riešili konkrétne problémy a prinášali merateľné výsledky."
      }
    },
    hero: {
      badge: "Telio is online",
      h1a: "Váš biznis",
      h1b: "nezaspí nikdy.",
      sub: "Telio je váš AI hlasový agent 24/7. Zdvihne každý hovor, hovorí prirodzene po slovensky a v iných jazykoch rezervuje termíny, dispečuje taxíky — a nikdy si nevezme voľno.",
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
      { value: "∞", label: "Typy prevádzok", sub: "Jedna platforma, všetky odvetvia" },
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
          detail: "",
        },
        {
          number: "02",
          title: "AI rozumie a odpovedá",
          description: "Prirodzený rozhovor poháňaný OpenAI. Telio pochopí zámer, pýta sa doplňujúce otázky, overuje dostupnosť a vykoná akciu — všetko v reálnom čase.",
          detail: "",
        },
        {
          number: "03",
          title: "Dostanete okamžité upozornenia",
          description: "WhatsApp správa vodičovi. Vytvorená udalosť v kalendári. Potvrdená rezervácia. Všetko zdokumentované — nulová námaha z vašej strany.",
          detail: "",
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
          description: "Telio stráži prichádzajúce hovory — bežné prehliadky, akútna bolesť, predpisy — správne ich presmeruje a zarezervuje termín v kalendári bez toho, aby rušil lekára.",
          features: ["Detekcia zámeru: urgentné vs. bežné", "Rezervácia termínu podľa rozvrhu lekára", "Príjemný hlas", "Presmerovanie urgentných hovorov na živý personál"],
          callSample: [
            { role: "caller", text: "Volám kvôli bolesti zuba, je to veľmi nepríjemné." },
            { role: "ai", text: "Jasné, rozumiem. V prípade akútnej bolesti je možné navštíviť našu ambulanciu kedykoľvek počas otváracích hodín." },
            { role: "caller", text: "Áno, ďakujem veľmi pekne." },
            { role: "ai", text: "Rado sa stalo!" },
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
            { role: "ai", text: "Výborná voľba! Na akú adresu by som to mal doručiť?" },
            { role: "caller", text: "Na Hlavnú 5, Levoča." },
            { role: "ai", text: "Objednávka prijatá! Doručenie cca za 35 minút. Ďakujeme!" },
          ],
          color: "#FF6B35",
        },
        {
          id: "salon", emoji: "💈", label: "Kadernícky salón",
          title: "Rezervujte, kým striháte",
          description: "Kým máte ruky plné práce, Telio vybavuje rezervácie, presúvanie termínov a storná — Váš kalendár zostane plný bez prerušenia vášho toku.",
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
      h2a: "Váš spoľahlivý partner,",
      h2b: "ktorý vybaví všetko za vás.",
      sub: "",
      items: [
        { title: "Prirodzený hlas", description: 'Znie ako skutočný človek — priateľský, profesionálny.', badge: "" },
        { title: "Synchronizácia s Google Kalendárom", description: "Overuje dostupnosť v reálnom čase a automaticky vytvára udalosti. Vlastný kalendár pre každú prevádzku.", badge: "" },
        { title: "Smerovanie cez Google Maps", description: "Geokóduje hovorené adresy v reálnom čase, vypočíta presnú vzdialenosť a ETA. Ohraničené na vašu servisnú oblasť.", badge: "" },
        { title: "Dispečing cez WhatsApp a SMS", description: "Okamžité upozornenie vodičovi alebo personálu. Obsahuje miesto vyzdvihnutia, cieľ, ETA, navigačný odkaz a prepis hovoru.", badge: "" },
      ],
    },
    integrations: {
      sub: "Postavené na najspoľahlivejších API sveta",
      h2a: "Jednotky na trhu,",
      h2b: "implementované v jednom balíku.",
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
          name: "Starter",
          price: "99 €",
          priceSub: "/ mesiac",
          description: "Ideálne pre začínajúcich podnikateľov a jednotlivcov.",
          features: ["1 hlasový asistent", "300 minút v cene / mesiac", "Cena 0,33€ / min po prevolaní", "Podpora do 48 hodín"],
          cta: "Vyskúšať zdarma", highlighted: false, badge: null,
        },
        {
          name: "Business",
          price: "239 €",
          priceSub: "/ mesiac",
          description: "Pre rastúce prevádzky, ktoré potrebujú väčší výkon.",
          features: ["3 hlasoví asistenti *", "1000 minút v cene / mesiac", "Cena 0,23€ / min po prevolaní", "Kompletný analytický dashboard", "Validácia adries cez Google Maps", "Potvrdenie cez WhatsApp + SMS", "Podpora do 24 hodín"],
          cta: "Vyskúšať zdarma", highlighted: true, badge: "Najpopulárnejší",
          note: "* Vie vybaviť 3 hovory súčasne",
        },
        {
          name: "Enterprise",
          price: "Individuálne",
          priceSub: "na mieru",
          description: "Pre siete, franšízy a platformy, ktoré potrebujú škálovanie.",
          features: ["10+ hlasových asistentov", "Viac ako 5000 minút", "Prioritná podpora", "Kompletný analytický dashboard", "Vlastné integrácie", "Onboarding a školenie"],
          cta: "Kontaktovať nás", highlighted: false, badge: null,
        },
      ],
    },
    waitlist: {
      badge: "Beta verzia 1.0 · Obmedzený počet miest",
      h2a: "Buďte medzi prvými, ktorí automatizujú",
      h2b: "svoju prevádzku.",
      sub: "Vyplňte náš formulár a my Vás budeme kontaktovať do 48 hodín pre prioritný prístup a zavádzaciu cenu.",
      businessLabel: "Vyberte oblasť podnikania",
      nameLabel: "Meno",
      emailLabel: "Email",
      phoneLabel: "Tel. číslo (voliteľné)",
      messageLabel: "Viac informácií (voliteľné)",
      messagePlaceholder: "Opíšte svoj biznis alebo potreby...",
      placeholder: "vas@email.sk",
      cta: "Odoslať",
      successTitle: "Máme to!",
      successSub: "Vašu požiadavku sme prijali. Budeme Vás kontaktovať do 48 hodín na uvedený email.",
      businesses: ["Reštaurácia", "Taxi", "Zubár / Klinika", "Pizzeria", "Salón", "Iné"],
      trust: ["14 dní zadarmo", "Zrušenie kedykoľvek"],
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
      copyright: "© 2025 Telio. Všetky práva vyhradené. Peťo & Kamil ♥",
    },
    privacy: {
      title: "Ochrana osobných údajov",
      lastUpdated: "Posledná aktualizácia: 1. apríla 2026",
      introduction: "Tieto zásady ochrany osobných údajov vysvetľujú, ako Telio  spracúva osobné údaje, keď používate našu webovú stránku (www.telio.sk), služby a hlasové AI riešenia. Osobné údaje sú akékoľvek informácie týkajúce sa identifikovateľnej osoby. Osobné údaje spracúvame v súlade s nariadením EÚ GDPR, slovenským zákonom o ochrane osobných údajov a ďalšími platnými právnymi predpismi.",
      sections: [
        {
          title: "1. Výklad a definície",
          content: "Slová s veľkým začiatočným písmenom majú význam definovaný za nasledujúcich podmienok. Nasledujúce definície majú rovnaký význam bez ohľadu na to, či sa vyskytujú v jednotnom alebo množnom čísle.",
          subsections: [
            { title: "Účet", text: "Jedinečný účet vytvorený pre Vás na prístup k našej Službe." },
            { title: "Spoločnosť", text: "Vzťahuje sa na Telio" },
            { title: "Cookies", text: "Malé súbory umiestnené vo Vašom zariadení obsahujúce podrobnosti o histórii prehliadania." },
            { title: "Osobné údaje", text: "Informácie, ktoré sa vzťahujú na identifikovanú alebo identifikovateľnú osobu." },
            { title: "Služba", text: "Vzťahuje sa na Webovú stránku a platformu Telio AI." },
            { title: "Údaje o používaní", text: "Údaje zhromažďované automaticky, ako je IP adresa a dĺžka návštevy." }
          ]
        },
        {
          title: "2. Zhromažďovanie a používanie Vašich osobných údajov",
          content: "Zhromažďujeme osobné údaje, ako je e-mailová adresa, meno, telefónne číslo a údaje o používaní, s cieľom poskytovať a zlepšovať našu Službu. Údaje o používaní sa zhromažďujú automaticky a môžu zahŕňať IP adresy, typy prehliadačov a identifikátory mobilných zariadení.",
        },
        {
          title: "3. Používanie Vašich osobných údajov",
          content: "Spoločnosť môže využívať osobné údaje na údržbu našej Služby, správu Vášho Účtu, plnenie zmlúv, informovanie o aktualizáciách a správu Vašich žiadostí.",
        },
        {
          title: "4. Uchovávanie Vašich osobných údajov",
          content: "Vaše osobné údaje budeme uchovávať len po dobu nevyhnutnú na účely stanovené v týchto zásadách. Vaše osobné údaje budeme uchovávať a používať v rozsahu nevyhnutnom na splnenie našich zákonných povinností.",
        },
        {
          title: "5. Prenos Vašich osobných údajov",
          content: "Vaše informácie môžu byť spracúvané v prevádzkových priestoroch Spoločnosti. Váš súhlas s týmito zásadami predstavuje Váš súhlas s týmto prenosom. Zabezpečujeme primeranú úroveň ochrany údajov spoliehaním sa na štandardné zmluvné doložky pri medzinárodných prenosoch.",
        },
        {
          title: "6. Bezpečnosť Vašich osobných údajov",
          content: "Bezpečnosť Vašich osobných údajov je pre nás dôležitá, ale pamätajte, že žiadny spôsob prenosu cez internet nie je 100% bezpečný. Snažíme sa používať komerčne prijateľné prostriedky na ochranu Vašich osobných údajov.",
        },
        {
          title: "7. Vaše práva",
          content: "Máte právo na prístup k svojim údajom, ich opravu alebo vymazanie. Môžete tiež namietať proti spracovaniu alebo požiadať o prenosnosť údajov. Na uplatnenie týchto práv nás kontaktujte na info@telio.sk.",
        }
      ]
    },
    demoCall: {
      tryDemo: "Vyskúšať Demo Hovor",
      connecting: "Pripájam...",
      endCall: "Ukončiť hovor",
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
