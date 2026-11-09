# 🎾 NTC Rezervačný a telefonický systém (NTC Bookings & Telnyx)

Moderný online rezervačný systém, správa kurtov a evidencia telefonátov recepcie pre **Národné tenisové centrum (NTC Bratislava)** s integrovanou digitálnou peňaženkou a platobnou bránou **Tatra banka (TatraPay+)**.

## 📖 Dokumentácia

Prehľadnú technickú špecifikáciu, architektúru, zoznam služieb a mapu ukladania dát nájdete v dokumente:
- 👉 **[Technická dokumentácia a architektúra NTC (TECHNICAL_DOCUMENTATION.md)](./TECHNICAL_DOCUMENTATION.md)**
- 👉 **[Autentifikácia a autorizácia (BOOKING_AUTH_README.md)](./BOOKING_AUTH_README.md)**

---

## 🚀 Rýchle spustenie (Getting Started)

1. Nainštalujte potrebné balíčky:
```bash
npm install
```

2. Skontrolujte a vyplňte premenné v `.env.local` (viď prehľad v [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)).

3. Spustite aplikáciu:
```bash
npm run dev
```

Aplikácia beží na adrese [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Hlavné technologické piliere
- **Hosting & Beh aplikácie:** Google Cloud Run (kontajnerový serverless hosting s auto-scalingom)
- **Webová aplikácia:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS v4
- **Telefónia recepcie:** Telnyx (linka recepcie, evidencia minút a AI prehľad hovorov)
- **Databáza:** Supabase (PostgreSQL, bezpečná ochrana dát, okamžité overenie dostupnosti kurtov)
- **Platby a Peňaženka:** Tatra banka (TatraPay+ s okamžitým dobitím a automatickou kontrolou platieb)
- **Dohľad a Zálohovanie:** Azure Application Insights (monitoring prevádzky), Azure Blob Storage (denný archív auditov)
- **Notifikácie:** Resend (overovacie a informačné e-maily)
