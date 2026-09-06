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
    let dbUser: any = null;
    const { data, error } = await (db.from("booking_users") as any)
      .select("id, name, email, card_number, phone, role, has_multisport")
      .eq("id", session.userId)
      .maybeSingle();

    if (error && error.message?.includes("has_multisport")) {
      const fallback = await db
        .from("booking_users")
        .select("id, name, email, card_number, phone, role")
        .eq("id", session.userId)
        .maybeSingle();
      dbUser = fallback.data ? { ...fallback.data, has_multisport: false } : null;
    } else {
      dbUser = data;
    }

    currentUser = dbUser ? {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      cardNumber: dbUser.card_number,
      phone: dbUser.phone,
      role: dbUser.role,
      hasMultisport: Boolean(dbUser.has_multisport ?? session.hasMultisport),
    } : {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      hasMultisport: Boolean(session.hasMultisport),
    };

    if (session) {
      const policyDb = getCoreServiceDb();
      const { data: policyUser } = await policyDb
        .from("booking_users")
        .select("role")
        .eq("id", session.userId)
        .maybeSingle();
      if (policyUser?.role) {
        currentUser.role = policyUser.role;
      }
    }
  }

  const role = currentUser?.role || "user";
  const policyDb = getCoreServiceDb();
  const { data: policy, error: policyError } = await policyDb
    .from("role_booking_policies")
    .select("role, max_booking_duration_minutes, booking_horizon_days, discount_eur_per_hour, cancellation_deadline_hours, is_active")
    .eq("role", role)
    .maybeSingle();

  if (policyError) {
    console.error("NewBookingsPage role policy lookup failed:", policyError);
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
  } else {
    rolePolicy = {
      role: role as any,
      maxBookingDurationMinutes: 120,
      bookingHorizonDays: 14,
      discountEurPerHour: 0,
      cancellationDeadlineHours: 24,
      isActive: true,
    };
  }

  let initialWalletBalance: number | null = null;
  if (session && currentUser && currentUser.role !== "admin") {
    const serviceDb = getCoreServiceDb();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [{ data: walletData }, { data: pendingPayments }] = await Promise.all([
      serviceDb
        .from("wallets")
        .select("balance_eur")
        .eq("tenant_id", "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf")
        .eq("user_id", session.userId)
        .maybeSingle(),
      serviceDb
        .from("payments")
        .select("amount_eur")
        .eq("tenant_id", "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf")
        .eq("user_id", session.userId)
        .eq("provider", "tatrabanka")
        .in("status", ["processing", "pending"])
        .gte("created_at", fifteenMinutesAgo),
    ]);
    const confirmed = walletData ? Number(walletData.balance_eur) : 0;
    const pending = (pendingPayments || []).reduce((sum, p) => sum + Number(p.amount_eur || 0), 0);
    initialWalletBalance = Math.round((confirmed + pending) * 100) / 100;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const result = await fetchBookingsAction(start.toISOString(), end.toISOString());
  const initialBookings = result.success && result.bookings ? result.bookings as Booking[] : [];

  return (
    <NewBookingsCalendar
      courts={courts}
      initialBookings={initialBookings}
      currentUser={currentUser}
      rolePolicy={rolePolicy}
      initialWalletBalance={initialWalletBalance}
    />
  );
}
