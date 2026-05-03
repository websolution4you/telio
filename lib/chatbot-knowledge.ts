export const chatbotKnowledge = {
    brand: {
        name: "Telio",
        assistantName: "Telio AI Asistent",
        defaultLanguage: "sk",
        role: "AI hlasový asistent pre firmy",
    },

    responseRules: [
        "Odpovedaj stručne, vecne, prirodzene a profesionálne.",
        "Ak používateľ píše po slovensky, odpovedaj po slovensky.",
        "Ak používateľ píše po anglicky, odpovedaj po anglicky.",
        "Ak si jazyk otázky nie si istý, odpovedaj po slovensky.",
        "Používaj iba informácie z tejto knowledge base.",
        "Nevymýšľaj si ceny, funkcie, integrácie ani garancie, ktoré tu nie sú uvedené.",
        "Ak je otázka nejasná alebo príliš krátka (napr. 'dd', 'ano', 'ako?'), najprv ju jemne spresni podľa požiadavky.",
        "Ak používateľ rieši cenu, demo, vhodnosť riešenia alebo získanie prístupu, odpovedz užitočne a môžeš pridať jemné CTA.",
        "Dlhšie odpovede rozdeľuj na kratšie odseky.",
        "Ak niečo nevieš spoľahlivo potvrdiť, nepouži technickú formuláciu typu 'niečo sa pokazilo'. Použi pokojný a profesionálny fallback."
    ],

    overview: [
        "Telio je AI hlasový asistent pre firmy, ktorý funguje 24 hodín denne, 7 dní v týždni.",
        "Zdvihne každý hovor, komunikuje prirodzene po slovensky a podľa nastavenia aj v ďalších jazykoch.",
        "Pomáha automatizovať telefonickú komunikáciu, rezervácie, dispečing a odpovede na časté otázky.",
        "Telio je navrhnuté tak, aby firmy nestrácali hovory ani zákazníkov."
    ],

    howItWorks: [
        "Zákazník zavolá na firemné číslo a hovor sa presmeruje na Telio.",
        "Telio zdvihne okamžite, vedie prirodzený rozhovor a zistí, čo zákazník potrebuje.",
        "Podľa scenára vie spracovať požiadavku, potvrdiť rezerváciu, zaznamenať informácie alebo odoslať upozornenie ďalej.",
        "Výsledok môže smerovať napríklad do kalendára, na personál, vodiča alebo do interného prehľadu."
    ],

    targetBusinesses: [
        "pizzeria a rozvoz",
        "taxislužba",
        "reštaurácia",
        "ambulancia alebo klinika",
        "salón alebo iná prevádzka, ktorá rieši opakujúce sa telefonické požiadavky"
    ],

    useCases: [
        "prijímanie objednávok alebo rezervácií",
        "odpovedanie na časté otázky",
        "spracovanie hovorov počas špičky alebo mimo pracovnej doby",
        "dispečing taxi alebo rozvozov",
        "zber kontaktných údajov a základných informácií od zákazníka",
        "odoslanie upozornenia personálu alebo vodičovi"
    ],

    features: [
        "prirodzený hlasový rozhovor",
        "prevádzka 24/7",
        "Google Calendar na overenie dostupnosti a vytváranie udalostí",
        "Google Maps na prácu s adresami, vzdialenosťou a ETA",
        "WhatsApp a SMS notifikácie",
        "analytický dashboard podľa typu prevádzky"
    ],

    demo: [
        "Na webe sú dostupné ukážky Pizza Demo a Taxi Demo.",
        "Pizza Demo ukazuje použitie Telio pre pizzeriu alebo rozvoz.",
        "Taxi Demo ukazuje použitie Telio pre taxislužbu a AI dispečing."
    ],

    dashboard: [
        "Telio obsahuje aj analytický dashboard.",
        "Podľa typu prevádzky môže dashboard zobrazovať objednávky alebo jazdy, obrat, priemernú hodnotu, heatmapy, menu položky, zóny alebo sledovanie flotily.",
        "Pri taxi riešení je dostupné aj live sledovanie flotily v mape."
    ],

    languages: [
        "Telio komunikuje prirodzene po slovensky.",
        "Môže fungovať aj v ďalších jazykoch podľa konkrétneho nastavenia riešenia.",
        "Jazykové možnosti závisia od konfigurácie a od použitej technológie."
    ],

    pricing: {
        summary: [
            "Telio má transparentný mesačný cenník.",
            "Všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma.",
            "Platobná karta nie je potrebná."
        ],
        plans: [
            {
                name: "Starter",
                price: "99 € / mesiac",
                details: [
                    "1 hlasový asistent",
                    "300 minút v cene za mesiac",
                    "0,33 € za minútu po prevolaní",
                    "podpora do 48 hodín"
                ]
            },
            {
                name: "Business",
                price: "239 € / mesiac",
                details: [
                    "3 hlasoví asistenti",
                    "1000 minút v cene za mesiac",
                    "0,23 € za minútu po prevolaní",
                    "kompletný analytický dashboard",
                    "validácia adries cez Google Maps",
                    "potvrdenie cez WhatsApp a SMS",
                    "podpora do 24 hodín"
                ]
            },
            {
                name: "Enterprise",
                price: "Individuálne na mieru",
                details: [
                    "10 a viac hlasových asistentov",
                    "viac ako 5000 minút",
                    "prioritná podpora",
                    "vlastné integrácie",
                    "onboarding a školenie"
                ]
            }
        ]
    },

    onboarding: [
        "Záujemca môže kliknúť na 'Získať prístup' alebo vyplniť formulár na webe.",
        "Vo formulári uvedie oblasť podnikania a stručne opíše svoj biznis alebo potreby.",
        "Tím Telio kontaktuje záujemcu do 48 hodín."
    ],

    contact: [
        "Hlavné CTA na webe je 'Získať prístup'.",
        "Ak má používateľ záujem o ukážku alebo chce zistiť, či je Telio vhodné pre jeho prevádzku, odporúča sa kliknúť na 'Získať prístup' alebo vyplniť formulár."
    ],

    glossary: [
        {
            term: "flotila",
            explanation: "Flotila je skupina vozidiel alebo vodičov v prevádzke. Pri taxislužbe ide o autá a vodičov, ktorých možno sledovať a riadiť v systéme."
        },
        {
            term: "dispečing",
            explanation: "Dispečing znamená riadenie a prideľovanie jázd alebo úloh vodičom či personálu."
        },
        {
            term: "ETA",
            explanation: "ETA znamená odhadovaný čas príchodu."
        },
        {
            term: "heatmapa",
            explanation: "Heatmapa je vizuálny prehľad, ktorý ukazuje, kde sa objednávky, jazdy alebo rozvozy vyskytujú najčastejšie."
        },
        {
            term: "dashboard",
            explanation: "Dashboard je prehľadná obrazovka s najdôležitejšími dátami, metrikami a prevádzkovými informáciami."
        },
        {
            term: "hlasový asistent",
            explanation: "Hlasový asistent je AI systém, ktorý vedie telefonický rozhovor so zákazníkom a pomáha vybaviť jeho požiadavku."
        }
    ],

    clarification: {
        sk: "Môžete to prosím trochu spresniť? Napríklad či sa pýtate na cenu, demo, dashboard alebo spôsob fungovania.",
        en: "Could you clarify that a bit? For example, are you asking about pricing, demo, dashboard, or how it works?"
    },

    faq: [
        {
            q: "Čo je Telio?",
            a: "Telio je AI hlasový asistent pre firmy, ktorý funguje 24/7 a pomáha automatizovať telefonickú komunikáciu, rezervácie, dispečing a odpovede na časté otázky."
        },
        {
            q: "Ako Telio funguje?",
            a: "Zákazník zavolá na firemné číslo, hovor sa presmeruje na Telio, Telio vedie prirodzený rozhovor a spracuje požiadavku podľa nastaveného scenára."
        },
        {
            q: "Pre koho je Telio vhodné?",
            a: "Telio je vhodné pre prevádzky ako pizzerie, taxislužby, reštaurácie, kliniky, salóny a ďalšie firmy, ktoré prijímajú opakujúce sa telefonické požiadavky."
        },
        {
            q: "Môže to byť aj pre inú prevádzku než pizzeriu?",
            a: "Áno. Telio nie je určené len pre pizzerie. Hodí sa aj pre taxislužby, reštaurácie, kliniky, salóny a ďalšie prevádzky s opakujúcimi sa telefonickými požiadavkami."
        },
        {
            q: "Koľko stojí Telio?",
            a: "Starter stojí 99 € mesačne, Business 239 € mesačne a Enterprise je individuálne na mieru. Všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma."
        },
        {
            q: "Dá sa to vyskúšať zadarmo?",
            a: "Áno, všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma."
        },
        {
            q: "Je tam skúšobná doba?",
            a: "Áno, Telio má 14-dňovú skúšobnú dobu zdarma."
        },
        {
            q: "Čo je Taxi Demo?",
            a: "Taxi Demo je ukážka použitia Telio pre taxislužbu. Zahŕňa AI dispečing, dashboard jázd, heatmapy, cenník zón a sledovanie flotily."
        },
        {
            q: "Čo je Pizza Demo?",
            a: "Pizza Demo je ukážka použitia Telio pre pizzeriu alebo rozvoz. Súčasťou je aj ukážkový dashboard s objednávkami, predajom, heatmapou rozvozov a správou menu položiek."
        },
        {
            q: "Je tam mapa?",
            a: "Áno. Pri taxi riešení je k dispozícii mapa na sledovanie flotily v reálnom čase. Telio zároveň využíva Google Maps aj na prácu s adresami, vzdialenosťou a ETA."
        },
        {
            q: "Čo je flotila?",
            a: "Flotila znamená skupinu vozidiel alebo vodičov v prevádzke. Pri taxislužbe ide o autá a vodičov, ktorých možno sledovať a riadiť v systéme."
        },
        {
            q: "Vie Telio aj iné jazyky?",
            a: "Áno, Telio môže fungovať aj v ďalších jazykoch. Jazykové možnosti závisia od konkrétneho nastavenia riešenia a od použitej technológie."
        },
        {
            q: "Kto mi to nastaví alebo nainštaluje?",
            a: "Nastavenie riešenia prebieha s tímom Telio. Najlepšie je vyplniť formulár alebo kliknúť na 'Získať prístup' a Telio tím sa ozve s ďalším postupom."
        },
        {
            q: "Čo sa stane, ak AI nerozumie alebo si nevie potvrdiť objednávku?",
            a: "Ak Telio nevie niečo spoľahlivo potvrdiť, je vhodné situáciu odovzdať ďalej alebo odporučiť priamy kontakt. Pri nejasných alebo špecifických požiadavkách nemá chatbot vymýšľať odpoveď."
        },
        {
            q: "Ako to celé funguje?",
            a: "Telio zdvihne hovor, prirodzene komunikuje so zákazníkom, spracuje požiadavku podľa scenára a výsledok odošle ďalej, napríklad ako rezerváciu, upozornenie alebo záznam do prehľadu."
        },
        {
            q: "Je tam analýza alebo analytika?",
            a: "Áno. Business a Enterprise plány obsahujú analytický dashboard, kde vidíte štatistiky hovorov, objednávok, ich vývoj v čase a grafy."
        },
        {
            q: "Čo sú objednávky podľa hodiny?",
            a: "Je to prehľad v dashbaorde, ktorý ukazuje, kedy máte najviac objednávok. Pomáha to lepšie plánovať zmeny personálu alebo počet vozidiel v teréne."
        },
        {
            q: "Čo je heatmapa?",
            a: "Heatmapa vizuálne zobrazuje miesta (adresy), z ktorých prichádza najviac objednávok alebo jazdi. Je to ideálne na optimalizáciu rozvozových zón."
        },
        {
            q: "Ako dlho trvá skúšobná doba?",
            a: "Skúšobná doba trvá 14 dní. Počas tejto doby si môžete Telio otestovať naplno a bez záväzkov."
        },
        {
            q: "Ako si môžem Telio objednať?",
            a: "Stačí kliknúť na 'Získať prístup' alebo vyplniť formulár na webe. Náš tím vás kontaktuje do 48 hodín a preberie s vami detaily nastavenia."
        }
    ],

    intentFallbacks: {
        prehlad: {
            sk: "Telio je AI hlasový asistent pre firmy, ktorý pomáha automatizovať hovory, rezervácie, dispečing a odpovede na časté otázky. Ak chcete, môžem stručne vysvetliť aj to, ako funguje v praxi.",
            en: "Telio is an AI voice assistant for businesses that helps automate calls, reservations, dispatching, and answers to common questions. If you want, I can also briefly explain how it works in practice."
        },
        cena: {
            sk: "Telio má transparentný mesačný cenník. Starter stojí 99 € mesačne, Business 239 € mesačne a Enterprise je individuálne na mieru. Všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma.",
            en: "Telio has transparent monthly pricing. Starter costs €99 per month, Business €239 per month, and Enterprise is custom-priced. All plans include a 14-day free trial."
        },
        demo: {
            sk: "Na webe sú dostupné ukážky Pizza Demo a Taxi Demo. Ak chcete, môžem stručne vysvetliť rozdiel medzi nimi alebo vás naviesť na ďalší krok.",
            en: "The website includes Pizza Demo and Taxi Demo examples. If you want, I can briefly explain the difference between them or point you to the next step."
        },
        jazyky: {
            sk: "Telio komunikuje prirodzene po slovensky a môže fungovať aj v ďalších jazykoch podľa konkrétneho nastavenia riešenia.",
            en: "Telio communicates naturally in Slovak and can also work in other languages depending on the specific setup of the solution."
        },
        dashboard: {
            sk: "Telio obsahuje aj analytický dashboard, ktorý môže zobrazovať objednávky, jazdy, obrat, heatmapy alebo sledovanie flotily.",
            en: "Telio also includes an analytics dashboard that can show orders, rides, revenue, heatmaps, or fleet tracking."
        },
        kontakt: {
            sk: "Ak máte záujem o ukážku alebo chcete zistiť, či je Telio vhodné pre vašu prevádzku, kliknite na 'Získať prístup' alebo vyplňte formulár na webe.",
            en: "If you want a demo or would like to find out whether Telio fits your business, click 'Get Access' or fill out the form on the website."
        },
        nezname: {
            sk: "Momentálne vám na toto neviem dať spoľahlivú odpoveď. Skúste prosím otázku trochu spresniť alebo kliknite na 'Získať prístup' a Telio tím sa vám ozve.",
            en: "I can’t give you a reliable answer to that right now. Please try to rephrase the question or click 'Get Access' and the Telio team will get back to you."
        }
    }
};