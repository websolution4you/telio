import type { Metadata } from "next";
import NewBookingsCalendar from "@/components/newbookings/NewBookingsCalendar";
import { fetchBookingsAction } from "@/app/actions/bookings";
import { getSession } from "@/lib/auth/bookingAuth";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Booking } from "@/lib/bookings/mockBookings";
import type { RoleBookingPolicy } from "@/lib/bookings/rolePolicy";

import { courts } from "@/lib/bookings/mockBookings";
import { getCoreDb, getCoreServiceDb } from "@/lib/server/supabase";

export const metadata: Metadata = {
  title: "Komplexný rezervačný systém Telio | NTC Bratislava",
  description: "Profesionálny rezervačný kalendár športovísk NTC s hlasovým asistentom Telio.",
};

export default async function NewBookingsPage() {
    const session = await getSession();
  let currentUser: BookingUser | null = null;
  let rolePolicy: RoleBookingPolicy | null = null;

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

    const policyDb = getCoreServiceDb();
    const { data: policyUser, error: policyUserError } = await policyDb
      .from("booking_users")
      .select("role")
      .eq("id", session.userId)
      .maybeSingle();
    const role = policyUser?.role || currentUser.role || "user";
    currentUser.role = role;

    const { data: policy, error: policyError } = await policyDb
      .from("role_booking_policies")
            .select("role, max_booking_duration_minutes, booking_horizon_days, discount_eur_per_hour, cancellation_deadline_hours, is_active")
      .eq("role", role)
      .maybeSingle();
    if (policyUserError || policyError) {
      console.error("NewBookingsPage role policy lookup failed:", policyUserError || policyError);
    }
    if (policy) {
      rolePolicy = {
        role: policy.role,
        maxBookingDurationMinutes: Number(policy.max_booking_duration_minutes),
        bookingHorizonDays: Number(policy.booking_horizon_days),
        discountEurPerHour: Number(policy.discount_eur_per_hour),
        cancellationDeadlineHours: Number(policy.cancellation_deadline_hours),
        isActive: Boolean(policy.is_active),
      };
    }
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
  const initialBookings = result.success && result.bookings ? result.bookings as Booking[] : [];

  return <NewBookingsCalendar courts={courts} initialBookings={initialBookings} currentUser={currentUser} rolePolicy={rolePolicy} />;
}
