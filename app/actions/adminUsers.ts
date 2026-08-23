"use server";

import { revalidatePath } from "next/cache";
import { getSession, type BookingRole } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";

const ALLOWED_ROLES: BookingRole[] = ["admin", "user", "trainer"];

export type RoleBookingPolicyInput = {
  role: BookingRole;
  maxBookingDurationMinutes: number;
  bookingHorizonDays: number;
  discountPercent: number;
  cancellationDeadlineHours: number;
  isActive: boolean;
};

async function requireCurrentAdmin() {
  const session = await getSession();
  if (!session) return null;

  const db = getCoreServiceDb();
  const { data: actor, error } = await db
    .from("booking_users")
    .select("id, role")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || actor?.role !== "admin") return null;
  return { session, db };
}

export async function fetchAdminUsersAction() {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie spravovať používateľov." };

  const [{ data, error }, { data: policies, error: policiesError }] = await Promise.all([
    context.db
      .from("booking_users")
      .select("id, name, email, phone, card_number, role, created_at")
      .order("name", { ascending: true }),
    context.db
      .from("role_booking_policies")
      .select("role, max_booking_duration_minutes, booking_horizon_days, discount_percent, cancellation_deadline_hours, is_active")
      .order("role", { ascending: true }),
  ]);

  if (error || policiesError) {
    console.error("fetchAdminUsersAction failed:", error || policiesError);
    return { success: false as const, error: "Používateľov sa nepodarilo načítať." };
  }

  return {
    success: true as const,
    currentUserId: context.session.userId,
    users: (data || []).map((user) => ({
      ...user,
      role: ALLOWED_ROLES.includes(user.role as BookingRole) ? user.role as BookingRole : "user" as const,
    })),
    policies: (policies || []).map((policy) => ({
      role: policy.role as BookingRole,
      maxBookingDurationMinutes: Number(policy.max_booking_duration_minutes),
      bookingHorizonDays: Number(policy.booking_horizon_days),
      discountPercent: Number(policy.discount_percent),
      cancellationDeadlineHours: Number(policy.cancellation_deadline_hours),
      isActive: Boolean(policy.is_active),
    })),
  };
}

export async function updateBookingUserRoleAction(userId: string, role: BookingRole) {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie meniť roly." };
  if (!ALLOWED_ROLES.includes(role)) return { success: false as const, error: "Neplatná rola." };
  if (userId === context.session.userId) {
    return { success: false as const, error: "Vlastnú administrátorskú rolu nie je možné zmeniť." };
  }

  const { data: user, error } = await context.db
    .from("booking_users")
    .update({ role })
    .eq("id", userId)
    .select("id, role")
    .maybeSingle();

  if (error || !user) {
    console.error("updateBookingUserRoleAction failed:", error);
    return { success: false as const, error: "Rolu používateľa sa nepodarilo uložiť." };
  }

  revalidatePath("/dashboard/newbookings");
  return { success: true as const, userId: user.id, role: user.role as BookingRole };
}

export async function updateRoleBookingPolicyAction(input: RoleBookingPolicyInput) {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie meniť privilégiá." };
  if (!ALLOWED_ROLES.includes(input.role)) return { success: false as const, error: "Neplatná rola." };

  const integerFields = [input.maxBookingDurationMinutes, input.bookingHorizonDays, input.cancellationDeadlineHours];
  if (!integerFields.every(Number.isInteger)) {
    return { success: false as const, error: "Dĺžka rezervácie, počet dní a storno lehota musia byť celé čísla." };
  }
  if (input.maxBookingDurationMinutes < 15 || input.maxBookingDurationMinutes > 1440) {
    return { success: false as const, error: "Maximálna dĺžka rezervácie musí byť od 15 do 1440 minút." };
  }
  if (input.bookingHorizonDays < 0 || input.bookingHorizonDays > 730) {
    return { success: false as const, error: "Rezervačný horizont musí byť od 0 do 730 dní." };
  }
  if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
    return { success: false as const, error: "Zľava musí byť od 0 do 100 %." };
  }
  if (input.cancellationDeadlineHours < 0 || input.cancellationDeadlineHours > 8760) {
    return { success: false as const, error: "Storno lehota musí byť od 0 do 8760 hodín." };
  }

  const { data: policy, error } = await context.db
    .from("role_booking_policies")
    .update({
      max_booking_duration_minutes: input.maxBookingDurationMinutes,
      booking_horizon_days: input.bookingHorizonDays,
      discount_percent: input.discountPercent,
      cancellation_deadline_hours: input.cancellationDeadlineHours,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("role", input.role)
    .select("role")
    .maybeSingle();

  if (error || !policy) {
    console.error("updateRoleBookingPolicyAction failed:", error);
    return { success: false as const, error: "Privilégiá roly sa nepodarilo uložiť." };
  }

  revalidatePath("/dashboard/newbookings");
  return { success: true as const };
}
