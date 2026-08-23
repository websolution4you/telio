"use server";

import { revalidatePath } from "next/cache";
import { getSession, type BookingRole } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { isAllowedBookingDuration } from "@/lib/bookings/rolePolicy";

const ALLOWED_ROLES: BookingRole[] = ["admin", "user", "trainer"];
const USERS_PAGE_SIZE = 7;

export type RoleBookingPolicyInput = {
  role: BookingRole;
  maxBookingDurationMinutes: number;
  bookingHorizonDays: number;
  discountEurPerHour: number;
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

export async function fetchAdminUsersAction(page = 1, query = "") {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie spravovať používateľov." };

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeQuery = query.trim().slice(0, 100).replace(/[,%()]/g, " ");
  const from = (safePage - 1) * USERS_PAGE_SIZE;
  const to = from + USERS_PAGE_SIZE - 1;
  let usersQuery = context.db
    .from("booking_users")
    .select("id, name, email, phone, card_number, role, created_at", { count: "exact" });
  if (safeQuery) {
    const term = `%${safeQuery}%`;
    usersQuery = usersQuery.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},card_number.ilike.${term},role.ilike.${term}`);
  }

  const [{ data, error, count }, { data: policies, error: policiesError }] = await Promise.all([
    usersQuery.order("name", { ascending: true }).range(from, to),
    context.db
      .from("role_booking_policies")
      .select("role, max_booking_duration_minutes, booking_horizon_days, discount_eur_per_hour, cancellation_deadline_hours, is_active")
      .order("role", { ascending: true }),
  ]);

  if (error || policiesError) {
    console.error("fetchAdminUsersAction failed:", error || policiesError);
    return { success: false as const, error: "Používateľov sa nepodarilo načítať." };
  }

  return {
    success: true as const,
    currentUserId: context.session.userId,
    page: safePage,
    pageSize: USERS_PAGE_SIZE,
    totalUsers: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / USERS_PAGE_SIZE)),
    users: (data || []).map((user) => ({
      ...user,
      role: ALLOWED_ROLES.includes(user.role as BookingRole) ? user.role as BookingRole : "user" as const,
    })),
    policies: (policies || []).map((policy) => ({
      role: policy.role as BookingRole,
      maxBookingDurationMinutes: Number(policy.max_booking_duration_minutes),
      bookingHorizonDays: Number(policy.booking_horizon_days),
      discountEurPerHour: Number(policy.discount_eur_per_hour),
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
  revalidatePath("/dashboard/users-roles");
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
  if (input.maxBookingDurationMinutes < 30 || input.maxBookingDurationMinutes > 1440 || !isAllowedBookingDuration(input.maxBookingDurationMinutes, input.maxBookingDurationMinutes)) {
    return { success: false as const, error: "Povolené limity sú 30, 60, 90, 120 minút a potom celé hodiny." };
  }
  if (input.bookingHorizonDays < 0 || input.bookingHorizonDays > 730) {
    return { success: false as const, error: "Rezervačný horizont musí byť od 0 do 730 dní." };
  }
  if (!Number.isFinite(input.discountEurPerHour) || input.discountEurPerHour < 0 || input.discountEurPerHour > 100) {
    return { success: false as const, error: "Zľava musí byť od 0 do 100 € za hodinu." };
  }
  if (input.cancellationDeadlineHours < 0 || input.cancellationDeadlineHours > 8760) {
    return { success: false as const, error: "Storno lehota musí byť od 0 do 8760 hodín." };
  }

  const { data: policy, error } = await context.db
    .from("role_booking_policies")
    .update({
      max_booking_duration_minutes: input.maxBookingDurationMinutes,
      booking_horizon_days: input.bookingHorizonDays,
      discount_eur_per_hour: input.discountEurPerHour,
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
  revalidatePath("/dashboard/users-roles");
  return { success: true as const };
}
