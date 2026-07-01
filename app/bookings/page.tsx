import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import BookingAuthWrapper from "@/components/bookings/BookingAuthWrapper";
import { courts } from "@/lib/bookings/mockBookings";
import { fetchBookingsAction } from "@/app/actions/bookings";
import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreDb } from "@/lib/server/supabase";
import { Sparkles } from "lucide-react";
import type { BookingUser } from "@/lib/auth/bookingAuth";

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
  // Check authentication
  const session = await getSession();

  let user: BookingUser | null = null;
  let initialBookings: any[] = [];

  // Fetch initial bookings (publicly visible)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 4);
  end.setHours(23, 59, 59, 999);

  const res = await fetchBookingsAction(start.toISOString(), end.toISOString());
  
  let fetchError = null;
  // Len reálne dáta, žiadne vymyslené (mock) záložné riešenie
  if (res.success && res.bookings && res.bookings.length > 0) {
    initialBookings = res.bookings;
  } else if (!res.success || res.bookings?.length === 0) {
    // Ak sa vráti chyba alebo je to úplne prázdne (napríklad pre chýbajúce Google API kľúče)
    fetchError = "Nepodarilo sa načítať rezervácie z Google Kalendára. Skontrolujte konfiguráciu API kľúčov.";
    initialBookings = [];
  }

  if (session) {
    // Get user data
    const db = getCoreDb();
    const { data: userData } = await db
      .from("booking_users")
      .select("id, name, email, card_number")
      .eq("id", session.userId)
      .single();

    user = userData
      ? {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          cardNumber: userData.card_number,
        }
      : {
          id: session.userId,
          name: session.name,
          email: session.email,
        };
  }

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
            Rezervačný systém NTC
          </h1>
        </div>
      </section>

      {fetchError && (
        <div className="w-full max-w-4xl mx-auto mb-8 px-6 relative z-10">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-semibold backdrop-blur-md">
            {fetchError}
          </div>
        </div>
      )}

      <BookingAuthWrapper user={user} courts={courts} bookings={initialBookings} />

      <Footer />
    </main>
  );
}
