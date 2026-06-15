import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import { courts, mockBookings } from "@/lib/bookings/mockBookings";
import { Bot, CalendarCheck, MapPin, PhoneCall, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Telio Bookings — Rezervácia kurtov NTC Bratislava",
  description:
    "Ukážka rezervačného systému Telio pre tenisové a bedmintonové kurty Národného tenisového centra v Bratislave.",
};

const stats = [
  { value: "8", label: "indoor tenisových kurtov" },
  { value: "14", label: "bedmintonových kurtov" },
  { value: "24/7", label: "hlasové rezervácie cez Telio" },
];

const integrationSteps = [
  {
    icon: PhoneCall,
    title: "Hovor zákazníka",
    text: "Zákazník povie Telio asistentovi šport, dátum, čas, dĺžku hry a počet hráčov.",
  },
  {
    icon: CalendarCheck,
    title: "Kontrola dostupnosti",
    text: "Telio skontroluje voľné sloty v Google Calendar API pre konkrétny kurt alebo typ športu.",
  },
  {
    icon: Bot,
    title: "Zápis rezervácie",
    text: "Po potvrdení vytvorí udalosť v kalendári a uloží dôležité údaje pre recepciu.",
  },
];

export default function BookingsPage() {
  return (
    <main className="min-h-screen grid-bg overflow-hidden" style={{ background: "var(--bg)" }}>
      <Navbar />

      <section className="relative pb-16 md:pb-24" style={{ paddingTop: "170px" }}>
        <div
          className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[90px]"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,209,0.13), rgba(123,97,255,0.08), transparent 68%)" }}
        />
        <div className="relative z-10 mx-auto px-8 text-center" style={{ maxWidth: "76rem" }}>
          <div
            className="mx-auto inline-flex items-center gap-3 rounded-full border px-5 py-3 text-xs font-black uppercase tracking-[0.2em]"
            style={{ borderColor: "rgba(0,255,209,0.25)", background: "rgba(0,255,209,0.06)", color: "var(--cyan)" }}
          >
            <Sparkles className="h-4 w-4" /> Nová Telio sekcia — Bookings
          </div>

          <h1
            className="mx-auto mt-8 max-w-5xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl"
            style={{ fontFamily: "var(--font-poppins), sans-serif", lineHeight: 1.05 }}
          >
            Rezervačný systém pre <span className="text-gradient">NTC kurty</span>
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-base leading-8 md:text-lg" style={{ color: "var(--text-muted)" }}>
            Ukážka novej Telio rezervácie pre Národné tenisové centrum v Bratislave. Systém je pripravený pre 8 indoor tenisových kurtov a 14 bedmintonových kurtov — s budúcim napojením na Google Calendar API a hlasového asistenta Telio.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.03)" }}>
              <MapPin className="h-4 w-4" style={{ color: "var(--cyan)" }} /> Bratislava, Slovensko
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.03)" }}>
              Google Calendar ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.03)" }}>
              Voice assistant ready
            </span>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border p-6"
                style={{ background: "rgba(12,12,20,0.72)", borderColor: "var(--border)" }}
              >
                <div className="text-4xl font-black text-white">{item.value}</div>
                <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookingCalendar courts={courts} bookings={mockBookings} />

      <section className="relative mx-auto px-8 pb-24" style={{ maxWidth: "76rem" }}>
        <div className="rounded-[32px] border p-8 md:p-12 text-center" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, rgba(0,255,209,0.07), rgba(123,97,255,0.08))" }}>
          <div className="mx-auto mb-12 max-w-3xl flex flex-col items-center">
            <div className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: "var(--cyan)" }}>Architektúra pre ďalší krok</div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
              Ako to napojíme na Telio asistenta
            </h2>
            <p className="mt-5 text-sm leading-7 md:text-base" style={{ color: "var(--text-muted)" }}>
              Táto verzia používa bezpečné demo dáta. Následne doplníme serverové API routy pre Google Calendar: získanie dostupnosti, vytvorenie rezervácie, zmenu rezervácie a zrušenie rezervácie. Telio hlasový asistent bude volať rovnaké API ako frontend.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {integrationSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-3xl border p-6 text-left flex flex-col items-start" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(5,5,8,0.45)" }}>
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(0,255,209,0.1)", color: "var(--cyan)" }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
