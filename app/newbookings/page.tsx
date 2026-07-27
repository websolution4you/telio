import type { Metadata } from "next";
import NewBookingsCalendar from "@/components/newbookings/NewBookingsCalendar";
import { fetchBookingsAction } from "@/app/actions/bookings";
import { getSession } from "@/lib/auth/bookingAuth";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Booking } from "@/lib/bookings/mockBookings";
import { courts } from "@/lib/bookings/mockBookings";
import { getCoreDb } from "@/lib/server/supabase";

export const metadata: Metadata = {
  title: "Komplexný rezervačný systém Telio | NTC Bratislava",
  description: "Profesionálny rezervačný kalendár športovísk NTC s hlasovým asistentom Telio.",
};

export default async function NewBookingsPage() {
  const session = await getSession();
  let currentUser: BookingUser | null = null;

  if (session) {
    const db = getCoreDb();
    const { data } = await db
      .from("booking_users")
      .select("id, name, email, card_number, phone, role")
      .eq("id", session.userId)
      .single();

    currentUser = data ? {
      id: data.id,
      name: data.name,
      email: data.email,
      cardNumber: data.card_number,
      phone: data.phone,
      role: data.role,
    } : {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
  const initialBookings = result.success && result.bookings ? result.bookings as Booking[] : [];

  return <NewBookingsCalendar courts={courts} initialBookings={initialBookings} currentUser={currentUser} />;
}
