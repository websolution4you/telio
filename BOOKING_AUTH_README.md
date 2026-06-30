# Booking Authentication System

Implementácia prihlasovacieho systému pre NTC Booking Calendar.

## 📋 Implementované funkcie

### 1. **Databázová tabuľka** (`booking_users`)
- `id` - UUID
- `name` - Meno používateľa
- `email` - Email (unique)
- `password_hash` - Zahashované heslo (SHA-256)
- `card_number` - Číslo karty (voliteľné)
- `created_at` / `updated_at` - Časové značky

### 2. **Autentifikačné funkcie**
- JWT-based session management
- Cookie-based authentication
- Secure password hashing (SHA-256)
- Session verification & management

### 3. **Stránky**
- `/bookings/login` - Prihlásenie
- `/bookings/register` - Registrácia
- `/bookings` - Chránená stránka (vyžaduje prihlásenie)

### 4. **UI komponenty**
- Login formulár s error handling
- Registračný formulár s validáciou
- UserMenu dropdown s profilom a logout
- Login button v Navbar (desktop + mobile)

### 5. **Auth Middleware**
- Automatické presmerovanie na `/bookings/login` pre neprihlásených
- Session check na server side
- Protected routes

## 🚀 Inštalácia

### Krok 1: Spustiť SQL migráciu v Supabase

1. Otvor Supabase Dashboard
2. Prejdi do **SQL Editor**
3. Otvor súbor: `supabase_booking_users_migration.sql`
4. Spusti SQL query

### Krok 2: Overiť .env.local

Uisti sa, že `.env.local` obsahuje:

```env
JWT_SECRET=telio-booking-jwt-secret-change-in-production-2025
CORE_SUPABASE_URL=<tvoj-url>
CORE_SUPABASE_SERVICE_ROLE_KEY=<tvoj-key>
```

### Krok 3: Reštartovať Next.js server

```bash
npm run dev
```

## 🔐 Testovanie

### Predvolený admin účet

Po spustení SQL migrácie máš k dispozícii testovací účet:

```
Email: admin@ntc.sk
Heslo: admin123
```

**⚠️ DÔLEŽITÉ:** Zmeň toto heslo v produkcii!

### Manuálna registrácia

1. Otvor `http://localhost:3000/bookings/login`
2. Klikni na "Zaregistrujte sa"
3. Vyplň formulár:
   - Celé meno
   - Email
   - Číslo karty (voliteľné)
   - Heslo (min. 6 znakov)
4. Klikni "Zaregistrovať sa"

### Test flow

1. **Bez prihlásenia:**
   - Návštev `/bookings`
   - Automaticky ťa presmeruje na `/bookings/login`

2. **Po prihlásení:**
   - Uvidíš booking kalendár
   - V headeri sa zobrazí tvoje meno
   - Klikni na meno → dropdown menu
   - Klikni "Odhlásiť sa" → presmeruje späť na login

## 📁 Súborová štruktúra

```
├── app/
│   ├── actions/
│   │   └── auth.ts                    # Server actions (login, register, logout)
│   └── bookings/
│       ├── page.tsx                   # Protected bookings page
│       ├── login/
│       │   └── page.tsx               # Login page
│       └── register/
│           └── page.tsx               # Registration page
├── components/
│   ├── Navbar.tsx                     # Updated with Login button
│   └── bookings/
│       └── UserMenu.tsx               # User dropdown menu
├── lib/
│   └── auth/
│       └── bookingAuth.ts             # Auth utilities (JWT, cookies)
└── supabase_booking_users_migration.sql  # DB migration
```

## 🔧 Konfigurácia

### JWT Secret

V produkcii **MUSÍŠ** zmeniť `JWT_SECRET` na silnejší:

```bash
# Generuj nový secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Session Expiration

Defaultne: **7 dní**

Zmeň v `lib/auth/bookingAuth.ts`:

```typescript
exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
```

## 📝 Poznámky

### Hashing algoritmus

Momentálne používame **SHA-256** pre jednoduchost. V produkcii zvážte upgrade na:
- **bcrypt** (vyžaduje Node.js addon)
- **Argon2** (modernejší, bezpečnejší)

### RLS Policies

Supabase Row Level Security je nakonfigurovaný:
- SELECT: Používatelia vidia len svoje dáta
- INSERT: Ktokoľvek môže registrovať (public registration)
- UPDATE: Používatelia môžu meniť len svoje dáta

### CORS & Cookies

Pre production deploy zabezpeč:
- HTTPS (cookies s `secure: true`)
- Správnu domain konfiguráciu
- SameSite cookies policy

## 🐛 Troubleshooting

### "Unauthorized" error
- Over, či je `JWT_SECRET` nastavený v `.env.local`
- Restartuj Next.js server
- Skontroluj cookie v DevTools

### "Database error" pri registrácii
- Over Supabase credentials v `.env.local`
- Skontroluj, či tabuľka `booking_users` existuje
- Over RLS policies

### Redirect loop
- Vymaž cookies v browseri
- Skontroluj `/bookings/login` routing
- Over `getSession()` funkciu

## 🎯 Ďalšie možnosti

- [ ] Email verification
- [ ] Password reset
- [ ] 2FA authentication
- [ ] OAuth providers (Google, Facebook)
- [ ] Admin role & permissions
- [ ] Booking history per user
- [ ] Profile edit page

## 📞 Support

Pre otázky alebo issues kontaktujte vývojový tím.
