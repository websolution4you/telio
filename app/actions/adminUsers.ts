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

export type AdminUserDirectoryItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cardNumber: string | null;
  role: BookingRole;
  createdAt: string;
  walletBalanceEur: number;
  bookingsCount: number;
};

export async function fetchAdminUsersDirectoryAction(
  page = 1,
  query = "",
  roleFilter: "all" | BookingRole = "all"
) {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie spravovať používateľov." };

  const pageSize = 15;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeQuery = query.trim().slice(0, 100).replace(/[,%()]/g, " ");
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let usersQuery = context.db
    .from("booking_users")
    .select("id, name, email, phone, card_number, role, created_at", { count: "exact" });

  if (roleFilter !== "all" && ALLOWED_ROLES.includes(roleFilter)) {
    usersQuery = usersQuery.eq("role", roleFilter);
  }

  if (safeQuery) {
    const term = `%${safeQuery}%`;
    usersQuery = usersQuery.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},card_number.ilike.${term}`);
  }

  const { data: users, error, count } = await usersQuery
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("fetchAdminUsersDirectoryAction failed:", error);
    return { success: false as const, error: "Používateľov sa nepodarilo načítať." };
  }

  const userList = users || [];
  const userIds = userList.map((u) => u.id);

  let walletMap = new Map<string, number>();
  let bookingCountMap = new Map<string, number>();

  if (userIds.length > 0) {
    const [{ data: walletsData }, { data: bookingsData }] = await Promise.all([
      context.db
        .from("wallets")
        .select("user_id, balance_eur")
        .in("user_id", userIds),
      context.db
        .from("bookings")
        .select("user_id")
        .in("user_id", userIds),
    ]);

    if (walletsData) {
      for (const w of walletsData) {
        walletMap.set(w.user_id, Number(w.balance_eur || 0));
      }
    }

    if (bookingsData) {
      for (const b of bookingsData) {
        if (b.user_id) {
          bookingCountMap.set(b.user_id, (bookingCountMap.get(b.user_id) || 0) + 1);
        }
      }
    }
  }

  const items: AdminUserDirectoryItem[] = userList.map((u) => ({
    id: u.id,
    name: u.name || "Bez mena",
    email: u.email,
    phone: u.phone || null,
    cardNumber: u.card_number || null,
    role: ALLOWED_ROLES.includes(u.role as BookingRole) ? (u.role as BookingRole) : "user",
    createdAt: u.created_at,
    walletBalanceEur: walletMap.get(u.id) ?? 0,
    bookingsCount: bookingCountMap.get(u.id) ?? 0,
  }));

  return {
    success: true as const,
    page: safePage,
    pageSize,
    totalCount: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    users: items,
  };
}

export type AdminUserDetailData = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cardNumber: string | null;
    role: BookingRole;
    createdAt: string;
    walletBalanceEur: number;
  };
  bookings: Array<{
    id: string;
    courtId: string;
    sport: string;
    startAt: string;
    endAt: string;
    status: string;
    priceEur: number;
    notes: string | null;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amountEur: number;
    createdAt: string;
    metadata: Record<string, any> | null;
  }>;
};

export async function fetchAdminUserDetailAction(userId: string) {
  const context = await requireCurrentAdmin();
  if (!context) return { success: false as const, error: "Nemáte oprávnenie zobraziť detail." };

  const [
    { data: user, error: userError },
    { data: wallet },
    { data: bookings, error: bookingsError },
    { data: txs, error: txsError },
  ] = await Promise.all([
    context.db
      .from("booking_users")
      .select("id, name, email, phone, card_number, role, created_at")
      .eq("id", userId)
      .maybeSingle(),
    context.db
      .from("wallets")
      .select("balance_eur")
      .eq("user_id", userId)
      .maybeSingle(),
    context.db
      .from("bookings")
      .select("id, court_id, sport, start_at, end_at, status, price_eur, notes, created_at")
      .eq("user_id", userId)
      .order("start_at", { ascending: false })
      .limit(50),
    context.db
      .from("wallet_transactions")
      .select("id, type, amount_eur, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (userError || !user) {
    return { success: false as const, error: "Používateľ sa nenašiel." };
  }

  const detail: AdminUserDetailData = {
    user: {
      id: user.id,
      name: user.name || "Bez mena",
      email: user.email,
      phone: user.phone || null,
      cardNumber: user.card_number || null,
      role: ALLOWED_ROLES.includes(user.role as BookingRole) ? (user.role as BookingRole) : "user",
      createdAt: user.created_at,
      walletBalanceEur: wallet ? Number(wallet.balance_eur || 0) : 0,
    },
    bookings: (bookings || []).map((b) => ({
      id: b.id,
      courtId: b.court_id,
      sport: b.sport,
      startAt: b.start_at,
      endAt: b.end_at,
      status: b.status,
      priceEur: Number(b.price_eur || 0),
      notes: b.notes,
      createdAt: b.created_at,
    })),
    transactions: (txs || []).map((t) => ({
      id: t.id,
      type: t.type,
      amountEur: Number(t.amount_eur || 0),
      createdAt: t.created_at,
      metadata: t.metadata || null,
    })),
  };

  return { success: true as const, detail };
}
