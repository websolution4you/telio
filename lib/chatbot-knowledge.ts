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
        "Ak je otázka nejasná, najprv ju jemne spresni.",
        "Ak používateľ rieši cenu, demo, vhodnosť riešenia alebo získanie prístupu, odpovedz užitočne a môžeš pridať jemné CTA.",
        "Dlhšie odpovede vždy rozdeľuj na menšie, prehľadné odseky pomocou dvojitého riadkovania (double newline).",
        "Ak niečo nevieš spoľahlivo potvrdiť, nepouži technickú formuláciu typu 'niečo sa pokazilo'. Použi pokojný a profesionálny fallback."
    ],

    overview: [
        "Telio je AI hlasový asistent pre firmy, ktorý funguje 24 hodín denne, 7 dní v týždni.",
        "Zdvihne každý hovor, komunikuje prirodzene po slovensky a podľa nastavenia aj v ďalších jazykoch.",
        "Pomáha automatizovať telefonickú komunikáciu, rezervácie, dispečing a odpovede na časté otázky.",
        "Telio je navrhnuté tak, aby firmy nestrácali hovory ani zákazníkov."
    ],

    coreValue: [
        "Telio zabezpečí, že váš biznis nezaspí nikdy.",
        "Je stále dostupné, bez prestávok a bez dní voľna.",
        "Od zvonenia po prvé slovo reaguje veľmi rýchlo.",
        "Pomáha firmám nepremeškať dôležitý hovor a zefektívniť prevádzku."
    ],

    metrics: [
        "Priemerný čas odozvy je menej ako 2 sekundy od zvonenia po prvé slovo.",
        "Telio funguje 24/7.",
        "Cieľom je, aby boli zodpovedané všetky hovory.",
        "Jedna platforma je použiteľná pre rôzne typy prevádzok."
    ],

    howItWorks: [
        "Krok 1: Zákazník zavolá na vaše číslo a hovor je presmerovaný na Telio.",
        "Telio zdvihne okamžite, bez čakania a bez hlasovej schránky, a privíta volajúceho v mene vašej prevádzky.",
        "Krok 2: Telio rozumie zámeru volajúceho, pýta sa doplňujúce otázky, overuje dostupnosť a vykonáva akciu v reálnom čase.",
        "Krok 3: Výsledok sa odošle ďalej, napríklad ako WhatsApp správa, SMS, vytvorená udalosť v kalendári alebo potvrdená rezervácia."
    ],

    targetBusinesses: [
        "Reštaurácia",
        "Taxislužba",
        "Zubár alebo klinika",
        "Pizzeria a rozvoz",
        "Kadernícky salón"
    ],

    useCases: [
        "rezervácie stolov alebo termínov",
        "odpovedanie na časté otázky",
        "spracovanie hovorov počas špičky",
        "spracovanie hovorov mimo pracovnej doby",
        "dispečing taxi jázd",
        "zber kontaktných údajov",
        "potvrdenie rezervácie alebo dopytu",
        "spracovanie požiadaviek na rozvoz",
        "upozornenie vodičovi alebo personálu v reálnom čase"
    ],

    restaurantUseCase: [
        "Pre reštaurácie Telio odpovedá na hovory, pýta sa na dátum, čas a počet hostí a overuje dostupnosť v Google Calendar.",
        "Následne vie potvrdiť rezerváciu a vytvoriť udalosť s detailmi hostí.",
        "Hodí sa najmä v čase špičky, keď personál nestíha dvíhať telefón."
    ],

    pizzaUseCase: [
        "Pre pizzerie a rozvoz môže Telio prijímať objednávky, odpovedať na časté otázky a pomáhať s organizáciou rozvozov.",
        "Na webe je dostupné Pizza Demo a ukážkový dashboard pre pizzeriu.",
        "Pizza dashboard zobrazuje napríklad objednávky dnes, obrat dnes, priemer objednávky, najnovšie objednávky, predaj za 7 dní, objednávky podľa hodiny, heatmapu rozvozov a menu položky.",
        "V ukážke menu položiek je možné spravovať názov jedla, cenu, hmotnosť a zloženie."
    ],

    taxiUseCase: [
        "Pre taxislužby môže Telio fungovať ako AI dispečer.",
        "Dokáže spracovať požiadavku na jazdu, pracovať s adresami a odovzdať informácie vodičovi.",
        "Na webe je dostupné Taxi Demo a ukážkový dashboard pre taxi dispečing.",
        "Taxi dashboard zobrazuje napríklad dnešné jazdy, odhad obratu, najnovšie jazdy, objednávky podľa hodiny, heatmapu rozvozov, cenník zón a sledovanie flotily v reálnom čase."
    ],

    features: [
        "Prirodzený hlas, ktorý pôsobí ako skutočný človek a znie priateľsky a profesionálne.",
        "Synchronizácia s Google Calendar na overenie dostupnosti a automatické vytváranie udalostí.",
        "Google Maps na geokódovanie hovorených adries, výpočet vzdialenosti a ETA.",
        "Dispečing cez WhatsApp a SMS s odoslaním detailov vodičovi alebo personálu.",
        "Možnosť fungovať vo viacerých jazykoch podľa konkrétneho nastavenia riešenia.",
        "Analytický dashboard pre prevádzkové dáta a prehľady."
    ],

    languages: [
        "Telio komunikuje prirodzene po slovensky.",
        "Môže fungovať aj v ďalších jazykoch podľa konkrétneho nastavenia riešenia.",
        "Jazykové možnosti nie sú pevne obmedzené len na slovenčinu alebo angličtinu.",
        "Podpora konkrétneho jazyka závisí od konfigurácie riešenia a použitej technológie.",
        "Ak má klient záujem o konkrétny jazyk, je vhodné ho potvrdiť pri nasadení."
    ],

    dashboard: [
        "Telio obsahuje aj analytický dashboard.",
        "Dashboard sa líši podľa typu prevádzky, napríklad pre pizzeriu alebo taxislužbu.",
        "Môže zobrazovať objednávky alebo jazdy, obrat, priemernú objednávku, heatmapy, menu položky, zóny, sledovanie flotily a ďalšie prevádzkové dáta."
    ],

    demo: [
        "Na webe sú dostupné ukážky Pizza Demo a Taxi Demo.",
        "Pizza Demo ukazuje použitie Telio pre pizzeriu alebo rozvoz.",
        "Taxi Demo ukazuje použitie Telio pre taxislužbu a AI dispečing."
    ],

    pricing: {
        summary: [
            "Telio má transparentný mesačný cenník.",
            "Na webe je uvedené, že nejde o účtovanie za každý hovor ako samostatnú službu, ale o prehľadný mesačný plán.",
            "Všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma a platobná karta nie je potrebná."
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
                    "podpora do 24 hodín",
                    "vie vybaviť 3 hovory súčasne"
                ]
            },
            {
                name: "Enterprise",
                price: "Individuálne na mieru",
                details: [
                    "10 a viac hlasových asistentov",
                    "viac ako 5000 minút",
                    "prioritná podpora",
                    "kompletný analytický dashboard",
                    "vlastné integrácie",
                    "onboarding a školenie"
                ]
            }
        ]
    },

    onboarding: [
        "Používateľ môže na webe kliknúť na 'Získať prístup' alebo vyplniť formulár.",
        "Vo formulári vyberie oblasť podnikania, zadá meno, email, voliteľne telefón a opíše svoj biznis alebo potreby.",
        "Tím Telio kontaktuje záujemcu do 48 hodín.",
        "Na webe je uvedené aj '14 dní zadarmo' a 'Zrušenie kedykoľvek'."
    ],

    contact: [
        "Hlavné CTA na webe je 'Získať prístup'.",
        "Ak má používateľ záujem o ukážku alebo chce zistiť, či je Telio vhodné pre jeho prevádzku, odporúča sa kliknúť na 'Získať prístup' alebo vyplniť formulár."
    ],

    limitations: [
        "Telio nie je určené na odpovedanie na úplne všetko.",
        "Je navrhnuté najmä na špecifické firemné scenáre, ako sú rezervácie, dispečing, rozvoz a odpovedanie na časté otázky.",
        "Pri veľmi špecifických, individuálnych alebo nejasných požiadavkách je vhodné odporučiť priamy kontakt."
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
            term: "geokódovanie",
            explanation: "Geokódovanie je prevod adresy alebo miesta na konkrétnu polohu na mape."
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
            term: "cenník zón",
            explanation: "Cenník zón je rozdelenie cien podľa oblastí alebo trás, napríklad pri taxislužbe."
        },
        {
            term: "hlasový asistent",
            explanation: "Hlasový asistent je AI systém, ktorý vedie telefonický rozhovor so zákazníkom a pomáha vybaviť jeho požiadavku."
        }
    ],

    team: [
        "Za Telio stoja spoluzakladatelia Kamil a Peťo.",
        "Kamil vedie technologickú víziu a architektúru AI agentov.",
        "Peťo vedie produktovú víziu a používateľskú skúsenosť."
    ],

    faq: [
        {
            q: "Čo je Telio?",
            a: "Telio je AI hlasový asistent pre firmy, ktorý funguje 24/7, zdvíha hovory a pomáha automatizovať rezervácie, dispečing a odpovede na časté otázky."
        },
        {
            q: "Pre koho je Telio vhodné?",
            a: "Telio je vhodné pre prevádzky ako reštaurácie, pizzerie, taxislužby, kliniky, salóny a ďalšie firmy, ktoré prijímajú veľa opakujúcich sa telefonických požiadaviek."
        },
        {
            q: "Ako Telio funguje?",
            a: "Zákazník zavolá na vaše číslo, hovor sa presmeruje na Telio, Telio zdvihne okamžite, vedie prirodzený rozhovor, spracuje požiadavku a odošle výsledok alebo upozornenie v reálnom čase."
        },
        {
            q: "Funguje Telio nonstop?",
            a: "Áno, Telio funguje 24 hodín denne, 7 dní v týždni."
        },
        {
            q: "Hovorí Telio po slovensky?",
            a: "Áno, Telio komunikuje prirodzene po slovensky."
        },
        {
            q: "Vie Telio aj iné jazyky?",
            a: "Áno, Telio môže fungovať aj v ďalších jazykoch. Jazykové možnosti závisia od konkrétneho nastavenia riešenia a od použitej technológie."
        },
        {
            q: "Do you speak English?",
            a: "Yes. Telio can also work in English and in other languages depending on the setup and configuration of the solution."
        },
        {
            q: "Is Telio limited to Slovak only?",
            a: "No. Telio is not limited to Slovak only. Language support depends on the specific setup and configuration."
        },
        {
            q: "Vie Telio pracovať s kalendárom?",
            a: "Áno, Telio vie overovať dostupnosť v Google Calendar a automaticky vytvárať udalosti."
        },
        {
            q: "Vie Telio pracovať s mapami a adresami?",
            a: "Áno, Telio využíva Google Maps na geokódovanie hovorených adries, výpočet vzdialenosti a ETA."
        },
        {
            q: "Posiela Telio upozornenia?",
            a: "Áno, Telio vie posielať upozornenia cez WhatsApp a SMS."
        },
        {
            q: "Je tam nejaká mapa?",
            a: "Áno. V taxi riešení je k dispozícii mapa na sledovanie flotily v reálnom čase. Okrem toho Telio využíva Google Maps aj na prácu s adresami, vzdialenosťou a odhadovaným časom príchodu."
        },
        {
            q: "Čo je flotila?",
            a: "Flotila znamená skupinu vozidiel alebo vodičov v prevádzke. Pri taxislužbe ide o autá a vodičov, ktorých možno sledovať a riadiť v systéme."
        },
        {
            q: "Dá sa to sledovať live?",
            a: "Áno, pri taxi deme je k dispozícii aj live sledovanie flotily. To znamená, že v mape vidíte aktuálnu polohu vozidiel a prehľad o stave prevádzky v reálnom čase."
        },
        {
            q: "Koľko stojí Telio?",
            a: "Starter stojí 99 € mesačne, Business 239 € mesačne a Enterprise je individuálne na mieru. Všetky plány majú 14-dňovú skúšobnú dobu zdarma."
        },
        {
            q: "Je to drahé?",
            a: "To závisí od typu prevádzky a objemu hovorov. Telio má transparentný mesačný cenník: Starter 99 € mesačne, Business 239 € mesačne a Enterprise individuálne. Ak chcete, môžem vám stručne zhrnúť rozdiely medzi plánmi."
        },
        {
            q: "Je k dispozícii skúšobná verzia?",
            a: "Áno, všetky plány zahŕňajú 14 dní zadarmo a platobná karta nie je potrebná."
        },
        {
            q: "Čo obsahuje Starter plán?",
            a: "Starter obsahuje 1 hlasového asistenta, 300 minút mesačne v cene, 0,33 € za minútu po prevolaní a podporu do 48 hodín."
        },
        {
            q: "Čo obsahuje Business plán?",
            a: "Business obsahuje 3 hlasových asistentov, 1000 minút mesačne v cene, 0,23 € za minútu po prevolaní, analytický dashboard, validáciu adries cez Google Maps, potvrdenie cez WhatsApp a SMS a podporu do 24 hodín."
        },
        {
            question: "Kde môžem vidieť demo?",
            answer: "Máme dve interaktívne ukážky: Pizza Demo (pre reštaurácie) a Taxi Demo (pre prepravcov). Odkazy nájdete priamo v sekcii 'Demo' v našom dashboarde."
        },
        {
            question: "What is Telio?",
            answer: "Telio is an AI-powered voice assistant designed for businesses. it handles incoming calls, creates reservations, answers FAQs, and automates communication 24/7 in native Slovak and English."
        },
        {
            question: "How does Telio work?",
            answer: "You simply forward your phone line to Telio. When a customer calls, Telio answers in your brand's name, understands their intent, collects necessary data, and performs actions like calendar entries or text confirmations."
        },
        {
            question: "Who is Telio for?",
            answer: "It is ideal for restaurants, taxi services, medical clinics, and any business that handles many phone inquiries or bookings and wants to automate them efficiently."
        },
        {
            question: "How much does it cost?",
            answer: "We offer three plans: Starter for small businesses, Business for growing companies, and Enterprise for large-scale operations. For specific pricing, please check our Pricing section."
        },
        {
            question: "Is there a free trial?",
            answer: "Yes, you can try our interactive Pizza or Taxi demos immediately to see how the voice assistant handles real conversations."
        },
        {
            question: "Do you speak English?",
            answer: "Yes, Telio fully supports both Slovak and English languages for both the voice assistant and the chat interface."
        },
        {
            question: "What is Taxi Demo?",
            answer: "It is a practical demonstration where Telio acts as a taxi dispatcher, takes pick-up details, and confirms the ride."
        },
        {
            question: "What is Pizza Demo?",
            answer: "A voice demo where Telio handles a food order, asks for toppings and delivery details, and confirms the price."
        },
        {
            question: "Is there a map?",
            answer: "Yes, Telio's dashboard includes a live fleet tracking map where you can see all your vehicles and orders in real-time."
        },
        {
            question: "What is fleet tracking?",
            answer: "It is a feature that provides real-time GPS monitoring of your mobile units, heatmaps of your business activity, and accurate ETA predictions."
        },
        {
            q: "Čo znamená Pizza Demo?",
            a: "Pizza Demo je ukážka použitia Telio pre pizzeriu alebo rozvoz. Súčasťou je aj ukážkový dashboard s objednávkami, predajom, heatmapou rozvozov a správou menu položiek."
        },
        {
            q: "Čo znamená Taxi Demo?",
            a: "Taxi Demo je ukážka použitia Telio pre taxislužbu. Zahŕňa AI dispečing, dashboard jázd, heatmapy, cenník zón a sledovanie flotily."
        },
        {
            q: "Dá sa to vyskúšať alebo získať prístup?",
            a: "Áno, na webe je možné kliknúť na 'Získať prístup' alebo vyplniť formulár. Tím Telio sa následne ozve do 48 hodín."
        },
        {
            q: "Na čo Telio nie je určené?",
            a: "Telio nie je určené na odpovedanie na úplne všetko. Je navrhnuté najmä na konkrétne firemné scenáre, ako sú rezervácie, dispečing a odpovede na časté otázky."
        }
    ],

    intentFallbacks: {
        pricing: {
            sk: "Telio má transparentný mesačný cenník. Starter stojí 99 € mesačne, Business 239 € mesačne a Enterprise je individuálne na mieru. Všetky plány zahŕňajú 14-dňovú skúšobnú dobu zdarma.",
            en: "Telio has transparent monthly pricing. Starter costs €99 per month, Business €239 per month, and Enterprise is custom-priced. All plans include a 14-day free trial."
        },
        demo: {
            sk: "Na webe sú dostupné ukážky Pizza Demo a Taxi Demo. Ak chcete prístup alebo bližšiu ukážku, kliknite na 'Získať prístup' alebo vyplňte formulár.",
            en: "The website includes Pizza Demo and Taxi Demo examples. If you want access or a closer walkthrough, click 'Get Access' or fill out the form."
        },
        languages: {
            sk: "Telio môže fungovať aj v ďalších jazykoch. Jazykové možnosti závisia od konkrétneho nastavenia riešenia a použitej technológie.",
            en: "Telio can also work in other languages. Language support depends on the specific setup and configuration of the solution."
        },
        dashboard: {
            sk: "Telio obsahuje aj analytický dashboard, ktorý sa líši podľa typu prevádzky. Môže zobrazovať objednávky alebo jazdy, obrat, heatmapy, menu položky, zóny a sledovanie flotily.",
            en: "Telio also includes an analytics dashboard that varies by business type. It can show orders or rides, revenue, heatmaps, menu items, zones, and live fleet tracking."
        },
        contact: {
            sk: "Ak máte záujem o ukážku alebo chcete zistiť, či je Telio vhodné pre vašu prevádzku, kliknite na 'Získať prístup' alebo vyplňte formulár. Tím Telio sa ozve do 48 hodín.",
            en: "If you want a demo or would like to find out whether Telio fits your business, click 'Get Access' or fill out the form. The Telio team will get back to you within 48 hours."
        },
        unknown: {
            sk: "Momentálne vám na toto neviem dať spoľahlivú odpoveď. Skúste prosím otázku trochu spresniť alebo kliknite na 'Získať prístup' a Telio tím sa vám ozve.",
            en: "I can’t give you a reliable answer to that right now. Please try to rephrase the question or click 'Get Access' and the Telio team will get back to you."
        },
        technical: {
            sk: "Momentálne sa mi nepodarilo pripraviť odpoveď. Skúste to prosím ešte raz alebo kliknite na 'Získať prístup' a radi sa vám ozveme.",
            en: "I couldn’t prepare a reliable answer right now. Please try again or click 'Get Access' and the Telio team will get back to you."
        }
    }
};