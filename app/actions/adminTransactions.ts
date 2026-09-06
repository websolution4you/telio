"use server";

import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";
import { getTatraPaymentStatus } from "@/lib/server/tatrabanka";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";
const PAGE_SIZE = 20;

export type PaymentStatusType = "paid" | "processing" | "failed" | "cancelled" | "confirmed";

export type AdminTransactionItem = {
  id: string;
  sourceTable: "payments" | "wallet_transactions";
  amountEur: number;
  type: "payment" | "booking_charge" | "refund" | "manual_adjustment" | "bonus";
  category: "booking_charge" | "refund" | "cardpay" | "stripe" | "test_topup" | "other";
  categoryLabel: string;
  status: PaymentStatusType;
  statusLabel: string;
  errorMessage?: string | null;
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
      statusCounts: {
        all: number;
        paid: number;
        processing: number;
        failed: number;
      };
    }
  | {
      success: false;
      error: string;
    };

export async function fetchAdminTransactionsAction(
  page = 1,
  query = "",
  category = "all",
  statusFilter = "all"
): Promise<FetchAdminTransactionsResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Nemáte oprávnenie prehliadať transakcie." };
  }

  const db = getCoreServiceDb();

  // 1. Fetch all payments from public.payments (all card and bank topups with true bank IDs and statuses)
  // 2. Fetch all wallet_transactions for non-payment events (booking charges, refunds, manual test topups)
  const [{ data: paymentsList, error: payError }, { data: walletList, error: walletError }] =
    await Promise.all([
      db
        .from("payments")
        .select("id, user_id, amount_eur, provider, provider_payment_id, idempotency_key, status, metadata, error_message, created_at")
        .eq("tenant_id", TENANT_ID)
        .order("created_at", { ascending: false }),
      db
        .from("wallet_transactions")
        .select("id, tenant_id, user_id, amount_eur, type, booking_id, metadata, created_at")
        .eq("tenant_id", TENANT_ID)
        .neq("type", "payment") // Exclude payment type because payments table is the primary source of truth for bank payments
        .order("created_at", { ascending: false }),
    ]);

  if (payError || walletError) {
    console.error("fetchAdminTransactionsAction failed:", payError || walletError);
    return { success: false, error: "Nepodarilo sa načítať platby a transakcie z databázy." };
  }

  const payments = paymentsList || [];
  const walletRows = walletList || [];

  // Also include any manual test topups that might have been recorded in wallet_transactions
  const userIds = [
    ...new Set([
      ...payments.map((p) => p.user_id),
      ...walletRows.map((w) => w.user_id),
    ].filter(Boolean)),
  ];

  const bookingIds = [
    ...new Set(walletRows.map((w) => w.booking_id).filter(Boolean)),
  ];

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

  const allItems: AdminTransactionItem[] = [];

  // Add all bank / card payments from public.payments table
  for (const pay of payments) {
    const userRecord = pay.user_id ? usersMap.get(pay.user_id) : null;
    const provider = pay.provider === "tatrabanka" ? "tatrabanka" : pay.provider === "stripe" ? "stripe" : null;
    const isTB = pay.provider === "tatrabanka";
    const category: AdminTransactionItem["category"] = isTB ? "cardpay" : "stripe";
    const categoryLabel = isTB ? "Dobitie CardPay (TB)" : "Dobitie Stripe";

    let status: PaymentStatusType = "processing";
    let statusLabel = "Spracováva sa";
    const rawStatus = (pay.status || "").toLowerCase();

    if (rawStatus === "paid" || rawStatus === "completed" || rawStatus === "success") {
      status = "paid";
      statusLabel = "Úspešná (Zaplatené)";
    } else if (rawStatus === "failed" || rawStatus === "error" || rawStatus === "declined") {
      status = "failed";
      statusLabel = "Neúspešná";
    } else if (rawStatus === "cancelled") {
      status = "cancelled";
      statusLabel = "Zrušená";
    } else {
      status = "processing";
      statusLabel = "Spracováva sa";
    }

    allItems.push({
      id: pay.id,
      sourceTable: "payments",
      amountEur: Number(pay.amount_eur),
      type: "payment",
      category,
      categoryLabel,
      status,
      statusLabel,
      errorMessage: pay.error_message || null,
      createdAt: pay.created_at,
      bookingId: null,
      bookingDetails: null,
      paymentId: pay.id,
      provider,
      providerPaymentId: pay.provider_payment_id || null,
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
    });
  }

  // Add all non-payment wallet operations from wallet_transactions (charges, refunds, manual adjustments)
  for (const row of walletRows) {
    const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});
    const userRecord = row.user_id ? usersMap.get(row.user_id) : null;
    const bookingRecord = row.booking_id ? bookingsMap.get(row.booking_id) : null;

    let category: AdminTransactionItem["category"] = "other";
    let categoryLabel = "Iné";
    let provider: AdminTransactionItem["provider"] = null;

    if (row.type === "booking_charge") {
      category = "booking_charge";
      categoryLabel = "Platba za rezerváciu";
    } else if (row.type === "refund") {
      category = "refund";
      categoryLabel = "Vrátenie za rezerváciu";
    } else if (row.type === "manual_adjustment" || meta.type === "test_topup" || meta.source === "test_topup") {
      category = "test_topup";
      categoryLabel = "Testovacie dobitie";
      provider = "manual";
    }

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

    allItems.push({
      id: row.id,
      sourceTable: "wallet_transactions",
      amountEur: Number(row.amount_eur),
      type: row.type,
      category,
      categoryLabel,
      status: "confirmed",
      statusLabel: "Zrealizované",
      createdAt: row.created_at,
      bookingId: row.booking_id || null,
      bookingDetails,
      paymentId: null,
      provider,
      providerPaymentId: null,
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
    });
  }

  // Sort all items chronologically (newest first)
  allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate live counts
  const categoryCounts = {
    all: allItems.length,
    charges: allItems.filter((i) => i.category === "booking_charge").length,
    refunds: allItems.filter((i) => i.category === "refund").length,
    cardpay: allItems.filter((i) => i.category === "cardpay").length,
    stripe: allItems.filter((i) => i.category === "stripe").length,
    test: allItems.filter((i) => i.category === "test_topup").length,
  };

  const statusCounts = {
    all: allItems.length,
    paid: allItems.filter((i) => i.status === "paid" || i.status === "confirmed").length,
    processing: allItems.filter((i) => i.status === "processing").length,
    failed: allItems.filter((i) => i.status === "failed" || i.status === "cancelled").length,
  };

  // Filter by category
  let filtered = allItems;
  if (category !== "all") {
    if (category === "charges") filtered = filtered.filter((i) => i.category === "booking_charge");
    else if (category === "refunds") filtered = filtered.filter((i) => i.category === "refund");
    else if (category === "cardpay") filtered = filtered.filter((i) => i.category === "cardpay");
    else if (category === "stripe") filtered = filtered.filter((i) => i.category === "stripe");
    else if (category === "test") filtered = filtered.filter((i) => i.category === "test_topup");
  }

  // Filter by status
  if (statusFilter !== "all") {
    if (statusFilter === "paid") {
      filtered = filtered.filter((i) => i.status === "paid" || i.status === "confirmed");
    } else if (statusFilter === "processing") {
      filtered = filtered.filter((i) => i.status === "processing");
    } else if (statusFilter === "failed") {
      filtered = filtered.filter((i) => i.status === "failed" || i.status === "cancelled");
    }
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
    statusCounts,
  };
}

export type ReconcileAdminPaymentsResponse =
  | {
      success: true;
      checked: number;
      successful: number;
      failed: number;
      pending: number;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

export async function reconcileAdminPendingPaymentsAction(): Promise<ReconcileAdminPaymentsResponse> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Nemáte oprávnenie na overovanie platieb." };
  }

  const db = getCoreServiceDb();

  const { data: payments, error } = await db
    .from("payments")
    .select("id, user_id, amount_eur, provider, provider_payment_id, status, metadata, created_at")
    .eq("tenant_id", TENANT_ID)
    .in("status", ["processing", "pending"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("reconcileAdminPendingPaymentsAction lookup failed:", error);
    return { success: false, error: "Nepodarilo sa načítať čakajúce platby." };
  }

  let checked = 0;
  let successful = 0;
  let failed = 0;
  let pending = 0;

  for (const payment of payments || []) {
    checked += 1;
    const createdAtMs = new Date(payment.created_at).getTime();
    const ageMinutes = (Date.now() - createdAtMs) / (1000 * 60);

    // 1. TATRA BANKA CARDPAY
    if (payment.provider === "tatrabanka") {
      if (!payment.provider_payment_id) {
        if (ageMinutes > 30) {
          await db
            .from("payments")
            .update({
              status: "failed",
              error_message: "Platba nebola inicializovaná v Tatra banke (chýba provider_payment_id).",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          failed += 1;
        } else {
          pending += 1;
        }
        continue;
      }

      try {
        const result = await getTatraPaymentStatus(payment.provider_payment_id);
        if (result.state === "successful") {
          const { error: processError } = await db.rpc("wallet_process_successful_payment", {
            p_payment_id: payment.id,
            p_provider_payment_id: payment.provider_payment_id,
            p_provider_metadata: {
              provider: "tatrabanka",
              payment_method: "CARD_PAY",
              verified_status: result.data,
              verified_by_bank: true,
              pending_bank_confirmation: false,
              source: "admin_manual_reconciliation",
            },
          });
          if (processError) {
            console.error(`wallet_process_successful_payment failed for ${payment.id}:`, processError);
            pending += 1;
          } else {
            successful += 1;
          }
        } else if (result.state === "failed") {
          await db
            .from("payments")
            .update({
              status: "failed",
              error_message: "TatraPayPlus CardPay platba vypršala alebo bola zamietnutá bankou.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          failed += 1;
        } else {
          // If TB still returns pending/auth_required but session is older than 2 hours:
          if (ageMinutes > 120) {
            await db
              .from("payments")
              .update({
                status: "failed",
                error_message: "Platobná relácia Tatra banky vypršala z dôvodu neaktivity.",
                updated_at: new Date().toISOString(),
              })
              .eq("id", payment.id);
            failed += 1;
          } else {
            pending += 1;
          }
        }
      } catch (err) {
        console.error(`Tatra banka reconciliation error for payment ${payment.id}:`, err);
        pending += 1;
      }
      continue;
    }

    // 2. STRIPE CHECKOUT
    if (payment.provider === "stripe") {
      if (!payment.provider_payment_id) {
        if (ageMinutes > 30) {
          await db
            .from("payments")
            .update({
              status: "failed",
              error_message: "Stripe relácia nebola inicializovaná.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          failed += 1;
        } else {
          pending += 1;
        }
        continue;
      }

      try {
        const stripe = getStripe();
        const checkout = await stripe.checkout.sessions.retrieve(payment.provider_payment_id);

        if (checkout.payment_status === "paid" && checkout.status === "complete") {
          const { error: processError } = await db.rpc("wallet_process_successful_payment", {
            p_payment_id: payment.id,
            p_provider_payment_id: checkout.id,
            p_provider_metadata: {
              stripe_checkout_session_id: checkout.id,
              stripe_payment_status: checkout.payment_status,
              source: "admin_manual_reconciliation",
            },
          });
          if (processError) {
            console.error(`wallet_process_successful_payment failed for Stripe ${payment.id}:`, processError);
            pending += 1;
          } else {
            successful += 1;
          }
        } else if (checkout.status === "expired" || (checkout.status === "open" && ageMinutes > 1440)) {
          await db
            .from("payments")
            .update({
              status: "failed",
              error_message: "Stripe relácia vypršala bez úhrady.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
          failed += 1;
        } else {
          pending += 1;
        }
      } catch (err) {
        console.error(`Stripe reconciliation error for payment ${payment.id}:`, err);
        pending += 1;
      }
      continue;
    }

    // Other providers
    if (ageMinutes > 1440) {
      await db
        .from("payments")
        .update({
          status: "failed",
          error_message: "Čakajúca platba expirovala.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      failed += 1;
    } else {
      pending += 1;
    }
  }

  let message = `Skontrolovaných ${checked} čakajúcich platieb.`;
  if (successful > 0 || failed > 0) {
    message += ` (${successful} úspešných a pripísaných, ${failed} neúspešných / vypršaných)`;
  } else if (checked === 0) {
    message = "Žiadne čakajúce platby na overenie.";
  } else {
    message += " Všetky platby sú stále v procese overovania.";
  }

  return {
    success: true,
    checked,
    successful,
    failed,
    pending,
    message,
  };
}

