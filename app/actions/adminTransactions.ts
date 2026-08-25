"use server";

import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";
const PAGE_SIZE = 20;

export type AdminTransactionItem = {
  id: string;
  amountEur: number;
  type: "payment" | "booking_charge" | "refund" | "manual_adjustment" | "bonus";
  category: "booking_charge" | "refund" | "cardpay" | "stripe" | "test_topup" | "other";
  categoryLabel: string;
  createdAt: string;
  bookingId: string | null;
  bookingDetails: {
    courtId: string | null;
    courtName: string | null;
    sport: string | null;
    startAt: string | null;
    endAt: string | null;
    notes: string | null;
  } | null;
  paymentId: string | null;
  provider: "tatrabanka" | "stripe" | "manual" | null;
  providerPaymentId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    cardNumber: string | null;
    role: string;
  } | null;
};

export type FetchAdminTransactionsResponse =
  | {
      success: true;
      transactions: AdminTransactionItem[];
      totalCount: number;
      totalPages: number;
      page: number;
      categoryCounts: {
        all: number;
        charges: number;
        refunds: number;
        cardpay: number;
        stripe: number;
        test: number;
      };
    }
  | {
      success: false;
      error: string;
    };

export async function fetchAdminTransactionsAction(
  page = 1,
  query = "",
  category = "all"
): Promise<FetchAdminTransactionsResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Nemáte oprávnenie prehliadať transakcie." };
  }

  const db = getCoreServiceDb();

  const [{ data: rawTransactions, error: txError }, { data: paymentsList, error: payError }] =
    await Promise.all([
      db
        .from("wallet_transactions")
        .select("id, tenant_id, user_id, amount_eur, type, booking_id, metadata, created_at")
        .eq("tenant_id", TENANT_ID)
        .order("created_at", { ascending: false }),
      db
        .from("payments")
        .select("id, user_id, provider, provider_payment_id, status, amount_eur, metadata, created_at")
        .eq("tenant_id", TENANT_ID),
    ]);

  if (txError) {
    console.error("fetchAdminTransactionsAction tx query failed:", txError);
    return { success: false, error: "Nepodarilo sa načítať transakcie z databázy." };
  }

  const rows = rawTransactions || [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const bookingIds = [...new Set(rows.map((row) => row.booking_id).filter(Boolean))];

  const [{ data: usersList }, { data: bookingsList }] = await Promise.all([
    userIds.length > 0
      ? db
          .from("booking_users")
          .select("id, name, email, phone, card_number, role")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length > 0
      ? db
          .from("bookings")
          .select("id, start_at, end_at, court_id, sport, notes, customer_name")
          .in("id", bookingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const usersMap = new Map((usersList || []).map((u) => [u.id, u]));
  const bookingsMap = new Map((bookingsList || []).map((b) => [b.id, b]));
  const paymentsById = new Map((paymentsList || []).map((p) => [p.id, p]));

  // Build enriched list
  const allItems: AdminTransactionItem[] = rows.map((row) => {
    const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});
    const paymentId = meta.payment_id || meta.paymentId || meta.id || null;
    const payment = paymentId ? paymentsById.get(paymentId) : null;

    let category: AdminTransactionItem["category"] = "other";
    let categoryLabel = "Iné";
    let provider: AdminTransactionItem["provider"] = null;

    if (row.type === "booking_charge") {
      category = "booking_charge";
      categoryLabel = "Platba za rezerváciu";
    } else if (row.type === "refund") {
      category = "refund";
      categoryLabel = "Vrátenie za rezerváciu";
    } else if (meta.type === "test_topup" || meta.source === "test_topup" || row.type === "manual_adjustment") {
      category = "test_topup";
      categoryLabel = "Testovacie dobitie";
      provider = "manual";
    } else if (meta.type === "cardpay" || meta.source === "cardpay" || payment?.provider === "tatrabanka") {
      category = "cardpay";
      categoryLabel = "Dobitie CardPay (TB)";
      provider = "tatrabanka";
    } else if (meta.type === "stripe" || meta.source === "stripe" || payment?.provider === "stripe") {
      category = "stripe";
      categoryLabel = "Dobitie Stripe";
      provider = "stripe";
    } else if (row.type === "payment") {
      category = "cardpay";
      categoryLabel = "Dobitie kreditu";
      provider = (payment?.provider as any) || null;
    }

    const userRecord = row.user_id ? usersMap.get(row.user_id) : null;
    const bookingRecord = row.booking_id ? bookingsMap.get(row.booking_id) : null;

    let bookingDetails: AdminTransactionItem["bookingDetails"] = null;
    if (bookingRecord) {
      let parsedCourt = bookingRecord.court_id;
      let parsedNotes = "";
      if (bookingRecord.notes) {
        try {
          const notesObj = typeof bookingRecord.notes === "string" ? JSON.parse(bookingRecord.notes) : bookingRecord.notes;
          parsedCourt = parsedCourt || notesObj.courtId;
          parsedNotes = notesObj.notes || "";
        } catch {
          parsedNotes = String(bookingRecord.notes);
        }
      }
      bookingDetails = {
        courtId: parsedCourt || null,
        courtName: parsedCourt || "Kurt",
        sport: bookingRecord.sport || null,
        startAt: bookingRecord.start_at || null,
        endAt: bookingRecord.end_at || null,
        notes: parsedNotes || null,
      };
    }

    return {
      id: row.id,
      amountEur: Number(row.amount_eur),
      type: row.type,
      category,
      categoryLabel,
      createdAt: row.created_at,
      bookingId: row.booking_id || null,
      bookingDetails,
      paymentId: paymentId || payment?.id || null,
      provider: provider || (payment?.provider as any) || null,
      providerPaymentId:
        payment?.provider_payment_id ||
        meta.provider_payment_id ||
        meta.stripe_session_id ||
        meta.card_pay_approval ||
        null,
      user: userRecord
        ? {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
            phone: userRecord.phone || null,
            cardNumber: userRecord.card_number || null,
            role: userRecord.role,
          }
        : null,
    };
  });

  const categoryCounts = {
    all: allItems.length,
    charges: allItems.filter((item) => item.category === "booking_charge").length,
    refunds: allItems.filter((item) => item.category === "refund").length,
    cardpay: allItems.filter((item) => item.category === "cardpay").length,
    stripe: allItems.filter((item) => item.category === "stripe").length,
    test: allItems.filter((item) => item.category === "test_topup").length,
  };

  // Filter by category
  let filtered = allItems;
  if (category !== "all") {
    if (category === "charges") filtered = filtered.filter((i) => i.category === "booking_charge");
    else if (category === "refunds") filtered = filtered.filter((i) => i.category === "refund");
    else if (category === "cardpay") filtered = filtered.filter((i) => i.category === "cardpay");
    else if (category === "stripe") filtered = filtered.filter((i) => i.category === "stripe");
    else if (category === "test") filtered = filtered.filter((i) => i.category === "test_topup");
    else if (category === "topups")
      filtered = filtered.filter(
        (i) => i.category === "cardpay" || i.category === "stripe" || i.category === "test_topup"
      );
  }

  // Filter by search query
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      const matchUser =
        item.user?.name.toLowerCase().includes(q) ||
        item.user?.email.toLowerCase().includes(q) ||
        item.user?.phone?.toLowerCase().includes(q) ||
        item.user?.cardNumber?.toLowerCase().includes(q);
      const matchTxId = item.id.toLowerCase().includes(q);
      const matchPaymentId =
        item.paymentId?.toLowerCase().includes(q) ||
        item.providerPaymentId?.toLowerCase().includes(q);
      const matchBooking =
        item.bookingId?.toLowerCase().includes(q) ||
        item.bookingDetails?.courtName?.toLowerCase().includes(q) ||
        item.bookingDetails?.notes?.toLowerCase().includes(q);
      const matchAmount = item.amountEur.toFixed(2).includes(q);
      return matchUser || matchTxId || matchPaymentId || matchBooking || matchAmount;
    });
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    success: true,
    transactions: paginated,
    totalCount,
    totalPages,
    page: safePage,
    categoryCounts,
  };
}
