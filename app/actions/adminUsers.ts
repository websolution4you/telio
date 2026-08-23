"use server";

import { revalidatePath } from "next/cache";
import { getSession, type BookingRole } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";

const ALLOWED_ROLES: BookingRole[] = ["admin", "user", "trainer"];

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

  const { data, error } = await context.db
    .from("booking_users")
    .select("id, name, email, phone, role, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("fetchAdminUsersAction failed:", error);
    return { success: false as const, error: "Používateľov sa nepodarilo načítať." };
  }

  return {
    success: true as const,
    currentUserId: context.session.userId,
    users: (data || []).map((user) => ({
      ...user,
      role: ALLOWED_ROLES.includes(user.role as BookingRole) ? user.role as BookingRole : "user" as const,
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
