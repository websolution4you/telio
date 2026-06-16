import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import { courts, mockBookings } from "@/lib/bookings/mockBookings";
import { MapPin, Sparkles } from "lucide-react";

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

export default function BookingsPage() {
  return (
    <main className="min-h-screen grid-bg overflow-hidden" style={{ background: "var(--bg)" }}>
      <Navbar />

      <section className="relative pb-16 md:pb-24 w-full flex flex-col items-center justify-center" style={{ paddingTop: "170px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <div
          className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[90px]"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,209,0.13), rgba(123,97,255,0.08), transparent 68%)" }}
        />
        <div className="relative z-10 w-full flex flex-col items-center justify-center px-8 text-center" style={{ maxWidth: "76rem", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div
            className="inline-flex items-center gap-3 rounded-full border px-5 py-3 text-xs font-black uppercase tracking-[0.2em]"
            style={{ borderColor: "rgba(0,255,209,0.25)", background: "rgba(0,255,209,0.06)", color: "var(--cyan)", display: "inline-flex", justifyContent: "center" }}
          >
            <Sparkles className="h-4 w-4" /> Nová Telio sekcia — Bookings
          </div>

          <h1
            className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl"
            style={{ fontFamily: "var(--font-poppins), sans-serif", lineHeight: 1.05, textAlign: "center", width: "100%", maxWidth: "64rem", display: "block" }}
          >
            Rezervačný systém pre <span className="text-gradient">NTC kurty</span>
          </h1>

          <p className="mt-7 text-base leading-8 md:text-lg" style={{ color: "var(--text-muted)", textAlign: "center", width: "100%", maxWidth: "48rem", display: "block" }}>
            Ukážka novej Telio rezervácie pre Národné tenisové centrum v Bratislave. Systém je pripravený pre 8 indoor tenisových kurtov a 14 bedmintonových kurtov — s budúcim napojením na Google Calendar API a hlasového asistenta Telio.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm w-full" style={{ color: "var(--text-muted)", display: "flex", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
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

          <div className="mt-12 grid gap-4 md:grid-cols-3 w-full" style={{ width: "100%", maxWidth: "56rem", display: "grid" }}>
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border p-6"
                style={{ background: "rgba(12,12,20,0.72)", borderColor: "var(--border)", textAlign: "center" }}
              >
                <div className="text-4xl font-black text-white">{item.value}</div>
                <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookingCalendar courts={courts} bookings={mockBookings} />

      <Footer />
    </main>
  );
}
