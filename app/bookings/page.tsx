import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import { courts } from "@/lib/bookings/mockBookings";
import { fetchBookingsAction } from "@/app/actions/bookings";
import { Sparkles } from "lucide-react";

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

export default async function BookingsPage() {
  // Fetch initial bookings on the server for a 4-day window (today + 3 days)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 4);
  end.setHours(23, 59, 59, 999);

  const res = await fetchBookingsAction(start.toISOString(), end.toISOString());
  const initialBookings = res.success && res.bookings ? res.bookings : [];

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
            <Sparkles className="h-4 w-4" /> Telio — Bookings
          </div>

          <h1
            className="mt-10 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl"
            style={{
              fontFamily: "var(--font-poppins), sans-serif",
              lineHeight: 1.2,
              textAlign: "center",
              width: "100%",
              maxWidth: "64rem",
              display: "block",
              textShadow: "0 0 25px rgba(123, 97, 255, 0.4), 0 0 50px rgba(123, 97, 255, 0.2)"
            }}
          >
            Rezervácia
          </h1>
        </div>
      </section>

      <BookingCalendar courts={courts} bookings={initialBookings} />

      <Footer />
    </main>
  );
}
