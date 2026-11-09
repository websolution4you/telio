# 🎾 NTC Rezervačný a telefonický systém
### Technické riešenie, architektúra, dátové toky a prevádzka

Tento dokument prehľadnou a zrozumiteľnou formou vysvetľuje, ako funguje systém pre **Národné tenisové centrum (NTC Bratislava)**. Popisuje jednotlivé funkcie, použité technológie, spôsob ukladania dát na Supabase, priebeh bankových platieb cez Tatra banku, infraštruktúru na Google Cloud Run a spôsob realizácie budúcich aktualizácií.

---

## 📌 1. Čo systém rieši a ako funguje (Prehľad)

Systém slúži ako centrálny mozog pre dennú prevádzku športovísk v NTC. Spája do jedného celku:
1. **Online rezervácie kurtov** pre verejnosť, členov klubu, trénerov aj reprezentáciu.
2. **Kreditnú peňaženku a platobný portál** napojený priamo na **Tatra banku (TatraPay+)**.
3. **Inteligentnú recepčnú telefóniu** cez telekomunikačného operátora **Telnyx** s prehľadom hovorov a AI sumarizáciou.
4. **Administrátorský pult** pre recepciu a manažment NTC na správu cenníkov, používateľov, peňazí a histórie zmien.

```
                           AKO TO CELÉ FUNGUJE SPOLU
                           
   [ Zákazník / Hráč ]                    [ Recepcia NTC ]
            │                                    │
   (Webový kalendár kurtov)             (Administrátorský pult)
            │                                    │
            ▼                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    SYSTÉM TELIO PRE NTC                      │
│               (Beží na Google Cloud Run)                     │
│                                                              │
│  • Výpočet ceny na mieru (špička, zľavy, MultiSport karty)    │
│  • Okamžitá kontrola dostupnosti kurtov bez kolízií          │
│  • Zrážanie a pripisovanie kreditu v digitálnej peňaženke    │
│  • Bezpečnostné overovanie používateľov                      │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
        (Platby a overenia)            (Hovory a SMS linky)
                │                               │
                ▼                               ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │      TATRA BANKA      │       │     TELNYX TELEFÓN    │
    │  • Portál TatraPay+   │       │  • Hovorová linka     │
    │  • Okamžité dobitie   │       │  • Evidencia minút    │
    │  • Automatická kontrol│       │  • AI zhrnutie hovoru │
    └───────────────────────┘       └───────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
                    ┌───────────────────────┐
                    │  SUPABASE CLOUD DB    │
                    │  (PostgreSQL cluster) │
                    │  • Profily a zostatky │
                    │  • Rezervácie kurtov  │
                    │  • Audit zmien        │
                    └───────────────────────┘
```

---

## 🗄️ 2. Kam sa čo ukladá (Mapa dát v cloude Supabase)

Všetky živé dáta aplikácie sú bezpečne uložené v **spravovanej cloudovej databáze Supabase (vysokovýkonný PostgreSQL cluster v EÚ dátovom centre)**. 

Prehliadač používateľa neuchováva žiadne databázové záznamy, heslá ani čísla platobných kariet. V prehliadači zostáva výhradne zašifrovaný bezpečnostný kľúč prihlásenia (tzv. `HTTP-only` session cookie), ktorý sa nedá prečítať klientskymi skriptami.

### 2.1. Databáza Supabase (Kde žijú živé dáta systému)

V nasledujúcej tabuľke je prehľad konkrétnych databázových tabuliek v Supabase, čo presne obsahujú a prečo sú v systéme potrebné:

| Oblasť a Názov tabuľky v Supabase | Čo konkrétne sa v Supabase ukladá | Prečo a na čo to slúži |
|---|---|---|
| **👤 Používatelia a účty**<br>`tabuľka: booking_users` | Meno, priezvisko, e-mail, telefónne číslo (v medzinárodnom formáte), zahashované heslo (kryptografický odtlačok SHA-256), číslo klubovej/členskej karty, rola (`admin`, `trainer`, `ntc_team`, `user`), priradená zľavová kategória (`discount_tier_id`) a stav overenia e-mailu. | Umožňuje hráčom bezpečne sa prihlásiť, sledovať svoje rezervácie a čerpať zľavy schválené recepciou NTC. |
| **🎾 Rezervácie kurtov**<br>`tabuľka: bookings` | Identifikátor kurtu, šport (tenis tvrdý povrch, tenis antuka, bedminton, squash), presný čas začiatku a konca, ID hráča, vypočítaná cena, rozpad zliav, počet uplatnených MultiSport kariet, poznámka k rezervácii a ID opakovanej série (`recurring_group_id`). | Zabezpečuje, aby sa žiadne dva termíny neprekrývali, systém poznal presnú obsadenosť kurtov a recepcia mala okamžitý prehľad. |
| **💶 Sezónne cenníky**<br>`tabuľka: ntc_pricelists` | Názov cenníka (napr. Zimná sezóna 2025/2026), dátum začiatku a konca platnosti, príznak aktivity a kompletná matica cien (pre každý šport, deň v týždni a hodinu dňa vrátane špičiek). | Zaručuje, že systém účtuje presné a aktuálne ceny schválené vedením NTC bez nutnosti manuálneho zásahu. |
| **🏷️ Kategórie rezervácií**<br>`tabuľka: ntc_reservation_categories` | Názvy a farebné označenia typov rezervácií (napr. Slovenský tenisový zväz, Komerčný nájom, Turnaje, Údržba kurtov). | Umožňuje recepcii NTC vizuálne odlíšiť účel rezervácie v kalendári a filtrovať obsadenosť. |
| **📋 Pravidlá pre roly**<br>`tabuľka: role_booking_policies` | Nastavenia pre jednotlivé roly: maximálna povolená dĺžka rezervácie (v minútach), rezervačný horizont dopredu (počet dní), hodinová zľava (€/hod) a minimálna storno lehota (hodiny pred začiatkom). | Riadi práva hráčov, trénerov a tímov podľa interného prevádzkového poriadku NTC. |
| **💳 Peňaženky hráčov**<br>`tabuľka: wallets` | Unikátna väzba na hráča a NTC tenanta, aktuálny disponibilný kredit v eurách (`balance_eur`). | Zabezpečuje predplatený kreditný systém, aby hráč nemusel pri každej rezervácii nanovo zadávať platobné príkazy. |
| **📑 Pohyby v peňaženke (Ledger)**<br>`tabuľka: wallet_transactions` | Nezmazateľná účtovná kniha: ID peňaženky, presný čas, suma pohybu (+ dobite, - platba za kurt, + vrátenie pri storne), dôvod pohybu a zostatok po operácii. | Poskytuje 100 % finančnú kontrolu a vylučuje akúkoľvek stratu peňazí alebo nejasnosti v zostatkoch. |
| **🏦 Záznamy bankových platieb**<br>`tabuľka: payments` | ID používateľa, suma v eurách, poskytovateľ (`tatrabanka`), stav transakcie (`pending`, `processing`, `completed`, `failed`), externé identifikačné číslo z Tatra banky (`provider_payment_id`) a technické dáta odpovede. | Slúži na bezpečné spárovanie platieb z portálu TatraPay+ s kreditnou peňaženkou používateľa. |
| **📞 Telefónne hovory recepcie**<br>`tabuľka: calls` | Telefónne číslo volajúceho, cieľové NTC číslo, presný čas a trvanie hovoru v sekundách, účtované minúty z Telnyxu, stav hovoru a textová sumarizácia (AI prepis). | Recepcia NTC vidí kompletnú históriu hovorov, prevolané minúty a rýchle textové zhrnutie toho, čo volajúci riešil. |
| **🛡️ Bezpečnostný audit zmien**<br>`tabuľka: audit_logs` | ID aktéra (kto akciu vykonal), typ udalosti (napr. zmena cenníka, manuálne storno, úprava profilu), presný timestamp a kompletný JSON rozdiel hodnôt (stav PRED a PO zmene). | Chráni NTC pred neoprávnenými zásahmi a garantuje auditovateľnosť pre vedenie a revízorov. |

### 2.2. Dlhodobý archív záloh (Microsoft Azure Blob Storage)
- **Kde to je:** Privátny šifrovaný cloudový kontajner v Microsoft Azure Storage.
- **Ako to funguje:** Každú noc o 03:00 hodine naplánovaný proces vyexportuje všetky denné auditné záznamy z tabuľky `audit_logs` do formátu JSON a cez autorizovaný SAS kľúč ich odošle do Azure úložiska (`backups/audit_logs/YYYY-MM/audit_logs_YYYY-MM-DD.json`).
- **Prečo:** Dáta v archíve sú chránené pred vymazaním alebo zmenou aj v prípade zlyhania databázy.

---

## 🏦 3. Platobný portál Tatra banky (TatraPay+) a overovanie platieb

Systém využíva oficiálne bankové rozhranie **TatraPay+ od Tatra banky**. Tento portál umožňuje zákazníkom okamžite dobiť kredit priamo zo svojho bankového účtu alebo cez kartu so špičkovým bankovým zabezpečením.

```
                           DETAILNÝ TOK PLATBY TATRAPAY+
                           
  [ 1. Hráč v Peňaženke ]  --->  Klikne "Dobiť 50 €"
            │
            ▼
  [ 2. Server NTC ]        --->  Vytvorí platbu v Supabase (stav: "pending")
            │                    Získa bezpečný OAuth2 token od Tatra banky
            │                    Zostaví požiadavku s variabilným symbolom a sumou
            │                    Vráti unikátny odkaz na platobný portál
            ▼
  [ 3. Portál Tatra banky] --->  Hráč je presmerovaný do zabezpečenej zóny Tatra banky
            │                    Autorizuje platbu (Tatra banka appka / Čítačka / SMS)
            │
            ├────────────────────────────────────────┬────────────────────────────────────────┐
            │                                        │                                        │
     (A: Bežný návrat)                        (B: Zatvorenie okna / Výpadok siete)            │
            │                                        │                                        │
            ▼                                        ▼                                        ▼
  [ 4A. Okamžitý návrat ]                 [ 4B. Platba visí v stave "processing" ]            │
  Hráč klikne "Návrat do e-shopu"         Zákazník zavrie okno, neklikne späť                 │
  NTC overí podpis banky                  │                                                   │
  Kredit sa ihneď pripíše                 ▼                                                   │
                                  [ 5B. Automatická poistka (Cron) ]                          │
                                  Každých pár minút skontroluje čakajúce platby               │
                                  Opýta sa REST API Tatra banky na reálny stav transakcie     │
                                  Banka potvrdí: "Platba prebehla úspešne"                    │
                                  Systém v Supabase automaticky pripíše kredit!               │
```

### 3.1. Ako prebieha platba krok za krokom

#### Krok 1: Inicializácia v NTC peňaženke
Zákazník si v profile zvolí sumu dobitia (napr. 20 €, 50 €, 100 €). Server vygeneruje záznam v tabuľke `payments` so stavom `pending`. Server požiada Tatra banku cez chránený protokol OAuth 2.0 (využíva `TATRABANKA_CLIENT_ID` a tajný podpisový kľúč `TATRABANKA_SHARED_SECRET`) o vystavenie autorizovanej platobnej relácie.

#### Krok 2: Presmerovanie na platobný portál Tatra banky
Tatra banka vráti unikátny odkaz `tatraPayPlusUrl`. Zákazník je bezpečne presmerovaný do rozhrania Tatra banky. Tu vidí predvyplnené údaje:
- **Príjemca:** Národné tenisové centrum
- **Suma:** presná zvolená suma v EUR
- **Variabilný symbol:** unikátne číslo generované systémom NTC

Zákazník sa prihlási do svojho internet bankingu alebo aplikácie Tatra banka a platbu potvrdí (biometriou, Čítačkou alebo heslom).

#### Krok 3: Návrat a okamžité pripísanie (Štandardný scenár A)
Po autorizácii banka presmeruje hráča späť na adresu `/api/payments/tatrabanka/callback`. Server NTC overí výsledok a okamžite zavolá zabezpečenú procedúru v Supabase (`wallet_process_successful_payment`). Táto procedúra v **jednej nedeliteľnej transakcii (ACID)**:
1. Zmení stav platby na `completed`.
2. Pripíše sumu do peňaženky hráča (`wallets`).
3. Vytvorí nezmazateľný záznam v histórii pohybov (`wallet_transactions`).
Zákazník hneď na obrazovke vidí svoj nový zostatok a môže rezervovať kurt.

---

### 3.2. Čo sa deje na pozadí pri výpadku alebo zatvorení okna? (Dvojitá poistka)

Veľmi častým javom v praxi je, že zákazník zaplatí cez mobilnú aplikáciu svojej banky, **ale po úspešnej platbe už neklikne na tlačidlo „Návrat k obchodníkovi“ a okno prehliadača rovno zavrie**.

V bežných e-shopoch by peniaze zostali „visieť“ a zákazník by sa musel sťažovať na recepcii. **V NTC systéme je pre tento prípad vybudovaná robustná automatická poistka:**

1. **Stav platby zostáva zaznamenaný:** Platba zostáva v tabuľke `payments` v stave `processing` s uloženým externým číslom bankovej transakcie (`provider_payment_id`).
2. **Pravidelný kontrolný proces na pozadí (Cron Job):**
   - Na adrese `/api/cron/tatrabanka-payments` beží zabezpečený kontrolný robot.
   - Tento robot automaticky vyhľadá všetky platby cez Tatra banku, ktoré sú v stave `processing`.
   - Pre každú takúto platbu pošle dotaz na oficiálne REST API Tatra banky:
     `GET /payments/{provider_payment_id}/status`
3. **Vyhodnotenie stavu priamo z bankového systému:**
   - **Ak Tatra banka potvrdí úspech** (stavy `SUCCESSFUL`, `AUTHORIZED`, `ACSC`, `PAID`): Robot okamžite na pozadí spustí transakciu `wallet_process_successful_payment`, kredit pripíše do hráčovej peňaženky a stav platby označí ako `completed`. Peniaze sa nikdy nestratia.
   - **Ak Tatra banka hlási zlyhanie** (nedostatok peňazí, vypršanie časového limitu na autorizáciu): Robot platbu označí ako `failed` a kredit sa nepripíše.
4. **Okamžitá kontrola pri vstupe do peňaženky:**
   - Ak hráč medzitým znova otvorí stránku svojej peňaženky, funkcia `getWalletAction` automaticky skontroluje čakajúce platby z posledných 15 minút, takže hráč vidí, že jeho platba bola bankou spracovaná, a môže okamžite hrať.

---

### 3.3. Testovací Sandbox Tatra banky (Ako prebieha testovanie a prechod do ostrej prevádzky)

Pred spustením do reálnej prevádzky s ostrými peniazmi sa platobný tok overuje v oficiálnom testovacom prostredí **TatraPayPlus Developer Sandbox (špecifikácia OpenAPI v1.6.0)**.

- **Čo je to Sandbox:**
  - Ide o vernú kópiu bankového portálu Tatra banky, ktorá reaguje na volania systému presne tak ako skutočná banka, ale nepracuje s reálnymi peniazmi.
  - Využíva samostatné testovacie adresy:
    - *Sandbox API:* `https://api.tatrabanka.sk/tatrapayplus/sandbox/v1`
    - *Sandbox OAuth2 Token:* `https://api.tatrabanka.sk/tatrapayplus/sandbox/auth/oauth/v2/token`
- **Čo sa v Sandboxe simuluje a testuje:**
  - **Úspešná platba:** Simulácia schválenia transakcie cez bankový prevod (`BANK_TRANSFER`) alebo platobnú kartu (`CARD_PAY`), overenie automatického dobitia kreditu v NTC peňaženke.
  - **Chybové scenáre:** Simulácia odmietnutia platby, nedostatku zostatku na testovacom účte alebo vypršania časového limitu na zadanie autorizačného SMS/PIN kódu (stavy `FAIL`, `REJECTED`, `EXPIRED`).
  - **Testovanie poistky (Cron overenie):** Overenie, že systém správne zistí stav platby aj v prípade, ak tester po schválení simulácie zatvorí prehliadač.
- **Ako sa systém prepne zo Sandboxu do Ostrej prevádzky?**
  - Zdrojový kód systému je 100 % identický pre testovacie aj ostré prostredie.
  - Prepnutie z testu do produkcie sa realizuje **výlučne zmenou konfiguračných kľúčov v `.env` súbore**:
    1. Zmení sa adresa API z testovacej `/sandbox/v1` na produkčnú `https://api.tatrabanka.sk/tatrapayplus/v1`.
    2. Namiesto testovacích údajov sa zadajú produkčné kľúče (`TATRABANKA_CLIENT_ID` a `TATRABANKA_SHARED_SECRET`), ktoré Tatra banka vygeneruje NTC po podpise zmluvy o akceptácii platieb.
  - Tento prístup vylučuje riziko, že by sa pri prechode do produkcie v kóde čokoľvek pokazilo.

---

## 🎾 4. Hlavné funkcie rezervačného systému a telefónie

### 4.1. Rezervačný kalendár a ochrana súkromia
- **Športoviská:** Tenis v hale (tvrdý povrch), vonkajšia antuka, bedmintonové dvorce a squash.
- **Granularita:** 30 a 60-minútové intervaly s okamžitou kontrolou voľných kapacít bez možnosti prekrytia.
- **Ochrana osobných údajov (Privacy-First):**
  - **Verejný návštevník:** Vidí iba text „Obsadené“. Žiadne mená ani kontakty.
  - **Prihlásený hráč:** Vidí detaily a cenu výhradne svojich vlastných rezervácií.
  - **Recepcia a Manažment:** Kompletný dispečerský prehľad s menami, telefónmi, možnosťou operatívneho presunu termínu alebo vytvorenia série.
- **Opakované rezervácie (Série):** Možnosť zarezervovať stabilný kurt na celú sezónu jedným klikom (napr. každý utorok od 18:00) so spoločným kódom série (`recurring_group_id`).

### 4.2. Cenový automat (NTC Pricing Engine)
Cena sa počíta dynamicky na základe oficiálnych pravidiel NTC:
1. **Sezónny cenník:** Nájde cenník platný pre konkrétny dátum hrania.
2. **Časová zóna dňa:** Rozlišuje bežné dopoludňajšie hodiny a exponovanú poobednú špičku (16:00 – 21:00) a víkendy.
3. **Klubové a trénerské zľavy:** Zľava z hodinovej sadzby podľa roly používateľa (`role_booking_policies`).
4. **Individuálne zľavové úrovne:** Osobné zľavy priradené recepciou konkrétnemu hráčovi.
5. **MultiSport karty:** Odpočet príspevku MultiSport podľa pravidiel pre daný šport.
6. **Transparentný rozpad:** Zákazník presne vidí, ako bola cena vypočítaná.

### 4.3. Telefónia a história hovorov (Telnyx)
- **Prepojenie na linku NTC:** Hovor od zákazníka prichádza cez modernú VoIP sieť operátora Telnyx.
- **Prehľad pre recepciu (`AdminCallHistory.tsx`):**
  - Identifikácia volajúceho (aj zmeškané hovory).
  - Presný čas a dĺžka trvania hovoru.
  - Účtované minúty a náklady linky.
- **AI asistent a zhrnutie:** Hovor je inteligentne zanalyzovaný a personál si môže prečítať rýchle textové zhrnutie požiadavky (napr. *„Zákazník sa pýtal na voľný tenisový kurt na nedeľu doobeda a cenu požičania rakiet“*).

---

## 📦 5. Zoznam softvérových závislostí (Dependencies z `package.json`)

Všetky balíčky používané projektom sú presne evidované a zabezpečené:

### 5.1. Produkčné závislosti (`dependencies`)

| Balíček / Knižnica | Verzia | Čo robí a na čo v NTC slúži |
|---|---|---|
| **`next`** | `16.1.6` | **Hlavný aplikačný rámec:** Serverový beh, správa adries (App Router), Server Actions (bezpečné transakcie na serveri) a optimalizácia rýchlosti. |
| **`react`** & **`react-dom`** | `19.2.3` | **Používateľské rozhranie:** Interaktívny kalendár kurtov, prepínanie týždňov, dialógy a prihlasovacie formuláre. |
| **`@supabase/supabase-js`** | `^2.98.0` | **Pripojenie k databáze:** Klient pre prácu s PostgreSQL v Supabase – číta dáta, ukladá rezervácie a volá transakčné funkcie peňaženky. |
| **`jose`** | `^6.2.3` | **Bezpečné prihlásenie (JWT):** Vytvára a overuje digitálne podpísané prihlasovacie tokeny v chránených `HTTP-only` cookies. |
| **`resend`** | `^6.10.0` | **E-maily:** Odosielanie overovacích kódov e-mailov pri registrácii do NTC a potvrdení rezervácií. |
| **`@azure/monitor-opentelemetry`** | `^1.20.1` | **Dohľad nad serverom:** Prepojenie na Microsoft Azure Application Insights na zber technických metrík a zaznamenávanie chýb. |
| **`@opentelemetry/api`** | `^1.9.1` | **Distribuované trasovanie:** Štandardizované rozhranie pre sledovanie rýchlosti odoziev servera v Azure. |
| **`@elevenlabs/client`** | `^1.1.0` | **Hlasová AI:** Spracováva prepisy a textové sumarizácie z telefonátov zákazníkov na recepciu. |
| **`@google/generative-ai`** | `^0.24.1` | **Google Gemini AI:** Interný asistent schopný zodpovedať otázky k pravidlám a prevádzke NTC. |
| **`@twilio/voice-sdk`** | `^2.18.0` | **Telekomunikačné rozhranie:** Doplnková VoIP knižnica pre hlasové hovory. |
| **`lucide-react`** | `^0.575.0` | **Ikony:** Vektorové ikony pre športy (rakety, lopty), telefóniu, navigáciu a tlačidlá. |
| **`framer-motion`** | `^12.34.3` | **Animácie:** Plynulé otváranie dialógových okien a vizuálne prechody v kalendári. |
| **`recharts`** | `^3.7.0` | **Grafy:** Prehľadné štatistické grafy vyťaženosti kurtov a obratu peňaženky pre vedenie NTC. |

---

### 5.2. Vývojové nástroje (`devDependencies`)

| Nástroj / Balíček | Verzia | Účel pri vývoji |
|---|---|---|
| **`typescript`** | `^5` | Typová kontrola kódu zabraňujúca chybám ešte pred nasadením do prevádzky. |
| **`tailwindcss`** & **`@tailwindcss/postcss`** | `^4` | CSS framework pre moderný, čistý a responzívny dizajn stránok. |
| **`eslint`** & **`eslint-config-next`** | `^9` / `16.1.6` | Nástroje na kontrolu kvality, čistoty a správnych praktík v Next.js kóde. |
| **`@types/node`**, **`@types/react`**, **`@types/react-dom`** | `^20` / `^19` | Typové definície pre Node.js a React komponenty. |

---

### 5.3. Životný cyklus závislostí: Ako vieme, kedy ich aktualizovať a ako to prebieha?

Balíčky v systéme nezostávajú fixné navždy. Tu je presný popis, ako sa sleduje ich stav a akým spôsobom sa vykonávajú aktualizácie:

#### A. Ako vieme, že je čas balíčky aktualizovať?
Systém a vývojári využívajú tri hlavné indikátory:

1. **Automatické bezpečnostné hlásenia (GitHub Dependabot & Security Advisories):**
   - Repozitár kódu je napojený na globálnu databázu bezpečnostných zraniteľností (CVE).
   - Ak niektorá knižnica obsahuje bezpečnostnú chybu, GitHub okamžite pošle notifikáciu a navrhne bezpečnú verziu.
   - Správca systému môže kedykoľvek spustiť príkaz:
     ```bash
     npm audit
     ```
     Tento príkaz preverí všetky balíčky a v priebehu sekundy oznámi, či existujú známe riziká a na akú verziu ich treba povýšiť.

2. **Pravidelná kontrola nových verzií (`npm outdated`):**
   - Spustením príkazu:
     ```bash
     npm outdated
     ```
     systém vypíše prehľadnú tabuľku: *aktuálna verzia vs. najnovšia dostupná verzia* pre každý balíček.
   - Používa sa medzinárodný štandard sémantického číslovania verzií (`MAJOR.MINOR.PATCH`):
     - **Patch (napr. 16.1.6 ➔ 16.1.7):** Rýchle opravy drobných chýb a vylepšenia stability. Aktualizujú sa priebežne bez rizika.
     - **Minor (napr. 16.1.6 ➔ 16.2.0):** Nové funkcie, ktoré zachovávajú spätnú kompatibilitu. Aktualizujú sa po bežnom otestovaní.
     - **Major (napr. 16.0.0 ➔ 17.0.0):** Veľké generačné skoky. Vyžadujú plánovanú kontrolu, či nová verzia nemení spôsob volania funkcií.

3. **Oznámenia od partnerov (Tatra banka / Telnyx API):**
   - Ak Tatra banka alebo Telnyx pripravuje novú verziu svojho API a plánuje vypnúť staršiu verziu, NTC a vývojári dostávajú technické oznámenie s predstihom (zvyčajne 6 až 12 mesiacov vopred).

---

#### B. Ako sa aktualizácia závislostí realizuje v praxi?
Aktualizácie sa nikdy nerobia „naslepo“ priamo na produkcii. Postupuje sa podľa osvedčeného štandardu:

1. **Lokálna aktualizácia a overenie integrity:**
   - Vývojár spustí bezpečné povýšenie kompatibilných balíčkov príkazom:
     ```bash
     npm update
     ```
     (alebo pre konkrétny balíček napr. `npm install @supabase/supabase-js@latest`).
   - Súbor `package-lock.json` automaticky zaznamená presné kontrolné súčty (checksums) nových verzií, aby sa zaručilo, že na serveri pobeží presne ten istý kód ako pri vývoji.

2. **Automatická kontrola a test kompilácie:**
   - Spustí sa test zostavenia aplikácie:
     ```bash
     npm run build
     ```
   - TypeScript a Next.js preveria celý kód. Ak by aktualizovaný balíček zmenil nejaký názov parametra alebo funkciu, systém chybu odhalí okamžite v termináli a nedovolí kód nasadiť.

3. **Overenie kľúčových funkcií:**
   - Otestuje sa vytvorenie rezervácie kurtu, prihlásenie, peňaženka a história hovorov na testovacom prostredí.

4. **Nasadenie do cloudu bez výpadku:**
   - Po schválení sa aktualizácia zapíše do Gitu a Google Cloud Run ju nasadí plynulým prepnutím prevádzky (Zero-Downtime Traffic Migration, popísané v sekcii 7). Hráči ani personál nepocítia žiadne prerušenie.

---

## ☁️ 6. Infraštruktúra a Hosting (Google Cloud Run)

Aplikácia beží na modernej cloudovej infraštruktúre **Google Cloud Run (GCP)** v európskom regióne.

### 6.1. Výhody Google Cloud Run v prevádzke NTC
- **Serverless kontajner:** Aplikácia beží v bezpečnom izolovanom kontajneri. NTC nemusí spravovať ani udržiavať žiadne vlastné fyzické servery.
- **Automatické škálovanie (Auto-scaling):**
  - Ak ráno o 8:00 alebo večer o 20:00 nastane masívny nápor stoviek hráčov hľadajúcich voľné kurty, Google Cloud Run v zlomku sekundy automaticky pridá ďalší výpočtový výkon (inštancie), aby stránka nesekala a nespadla.
  - V noci výkon automaticky utlmí, čo výrazne znižuje náklady.
- **Bezpečnosť a dostupnosť siete Google:**
  - Automatický manažovaný SSL/TLS certifikát (zelený zámok / https).
  - Vstavaná globálna ochrana pred preťažením a DDoS útokmi.
  - Bezpečnostné HTTP hlavičky (`X-Content-Type-Options: nosniff` a `Referrer-Policy`) definované v `next.config.ts`.

---

## 🔄 7. Spôsob realizácie aktualizácií systému (Update & Deployment proces)

Aktualizácie systému (nové funkcie, opravy, zmeny v rozhraní) sú navrhnuté tak, aby prebiehali **úplne bez výpadku pre hráčov aj personál recepcie (Zero-Downtime Deployment)**.

```
                           PROCES AKTUALIZÁCIE SYSTÉMU
                           
  [ 1. Git repozitár ]    --->  Vývojár nahrá otestovaný kód do hlavnej vetvy
            │
            ▼
  [ 2. Google Cloud ]     --->  Google automaticky zostaví nový produkčný kontajner
            │
            ▼
  [ 3. Nová revízia ]     --->  Cloud Run spustí novú verziu BOKOM popri starej verzii
            │                    Vykoná automatický test zdravia (/api/health)
            │
            ▼
  [ 4. Plynulé prepnutie] --->  Až keď nová verzia 100 % funguje, Google plynule
                                presmeruje sieťovú prevádzku na novú verziu.
                                Používatelia nezaznamenajú žiadne odhlásenie ani výpadok!
```

### 7.1. Princíp nasadzovania bez výpadku (Traffic Migration)
1. **Verziovanie v Gite:** Každá zmena v zdrojovom kóde je zapísaná a označená v privátnom Git repozitári.
2. **Paralelné spustenie kontajnera:** Google Cloud Run pri aktualizácii nikdy nevypína starú verziu predčasne. Namiesto toho naštartuje novú verziu (revíziu) vedľa bežiacej starej verzie.
3. **Kontrola funkčnosti (`Health Check`):** Google najprv overí, či nová verzia správne reaguje na požiadavky cez testovací bod `/api/health`.
4. **Plynulé prepnutie prevádzky:** Ak je všetko v poriadku, sieťová prevádzka sa v milisekunde presmeruje na novú verziu. Ak by nastala akákoľvek chyba pri štarte, prevádzka zostáva na pôvodnej funkčnej verzii.
5. **Okamžitý návrat (Rollback):** V prípade potreby je možné v Google Cloud konzole jedným kliknutím vrátiť prevádzku na predchádzajúcu verziu do 5 sekúnd.

### 7.2. Správa cenníkov a prevádzkových zmien bez zásahu do kódu
Veľkou výhodou systému je, že **bežné prevádzkové zmeny nevyžadujú žiadnu technickú aktualizáciu ani nasadzovanie kódu**:
- Zmena cien kurtov (napr. prechod zo zimnej na letnú sezónu).
- Nastavenie výšky zľavy pre MultiSport alebo trénerov.
- Zmena otváracích hodín alebo blokácia kurtov kvôli turnaju.
Všetky tieto zmeny robí recepcia alebo vedenie NTC **priamo cez administrátorský pult v reálnom čase** a prenesú sa okamžite do databázy v Supabase.

---

## 🔒 8. Bezpečnosť a spoľahlivosť

1. **Finančná integrita peňaženky:** Zostatok na účte sa mení výhradne cez atomické databázové funkcie (PostgreSQL RPC). Ani pri súbežných požiadavkách nemôže nastať prečerpanie či nesprávne zaúčtovanie.
2. **Serverové overovanie (Fail-Closed):** Server nikdy neverí údajom poslaným z prehliadača; pri každej akcii sa identita a rola volajúceho znova overí priamo z databázy v Supabase.
3. **Auditovateľnosť všetkých zásahov:** O každej zmene cenníka, storne rezervácie alebo manuálnom dobití kreditu personálom existuje trvalý záznam v `audit_logs` s presným časom a menom administrátora.
4. **Ochrana osobných údajov:** Mená a telefónne čísla hráčov sú pred verejnosťou skryté a monitorovacie nástroje nesmú ukladať osobné údaje do technických logov.

---

## 📋 9. Prehľad nastavení prostredia (.env)

Pre prepojenie systému s externými partnermi (Tatra banka, Telnyx, Supabase, Azure) slúžia tieto konfiguračné kľúče:

```env
# 1. Prístup k databáze Supabase (PostgreSQL Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://<ntc-projekt>.supabase.co
CORE_SUPABASE_SERVICE_ROLE_KEY=<tajny-databazovy-kluc-supabase>
NEXT_PUBLIC_TENANT_ID=595cbb6c-1019-41ae-b1c2-a60c13c8dcdf

# 2. Bezpečnostný kľúč prihlásenia (JWT token)
JWT_SECRET=<tajny-sifrovaci-kluc-pre-prihlasenie>

# 3. Prepojenie s platobným portálom Tatra banky (TatraPay+)
TATRABANKA_CLIENT_ID=<id-klienta-v-tatra-banke>
TATRABANKA_SHARED_SECRET=<tajny-podpisovy-kluc-hmac>
TATRABANKA_TOKEN_URL=https://api.tatrabanka.sk/.../token
TATRABANKA_API_BASE_URL=https://api.tatrabanka.sk/...
TATRABANKA_REDIRECT_URI=https://<ntc-adresa>/api/payments/tatrabanka/callback

# 4. Telefónia a linka recepcie (Telnyx)
TELNYX_API_KEY=<kluc-k-uctu-telnyx>

# 5. Odosielanie e-mailov (Resend)
RESEND_API_KEY=<kluc-resend>
RESEND_FROM=rezervacie@ntc.sk

# 6. Monitoring a cloudový archív záloh (Microsoft Azure)
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
AZURE_STORAGE_CONTAINER_SAS_URL=https://<azure-trezor>.blob.core.windows.net/...

# 7. Zabezpečenie automatických úloh (Cron)
CRON_SECRET=<ochranny-kod-pre-automaticke-ulohy>
```
