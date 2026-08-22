"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { createTatraPayment, getTatraPaymentStatus } from "@/lib/server/tatrabanka";
import { walletEnabledForUser } from "@/lib/server/wallet";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export async function getWalletAction() {
  const session = await getSession();
  if (!session) return { success: false as const, enabled: false, error: "Not logged in" };

  const enabled = walletEnabledForUser(session.userId);
  if (!enabled) return { success: true as const, enabled: false, balanceEur: null };

  const db = getCoreServiceDb();
  const { data, error } = await db.rpc("wallet_get_balance", {
    p_tenant_id: TENANT_ID,
    p_user_id: session.userId,
  });

  if (error) {
    console.error("getWalletAction failed:", error);
    return { success: false as const, enabled: true, error: "Zostatok sa nepodarilo načítať." };
  }

  return {
    success: true as const,
    enabled: true,
    balanceEur: data?.[0] ? Number(data[0].balance_eur) : 0,
  };
}

export async function getWalletHistoryAction() {
  const session = await getSession();
  if (!session) return { success: false as const, enabled: false, error: "Not logged in" };
  if (!walletEnabledForUser(session.userId)) {
    return { success: true as const, enabled: false, balanceEur: null, transactions: [] };
  }

  const db = getCoreServiceDb();
  const { data: pendingPayments, error: pendingError } = await db
    .from("payments")
    .select("id, provider_payment_id")
    .eq("tenant_id", TENANT_ID)
    .eq("user_id", session.userId)
    .eq("provider", "tatrabanka")
    .eq("status", "processing")
    .not("provider_payment_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (pendingError) {
    console.error("getWalletHistoryAction pending payment lookup failed:", pendingError);
  } else {
    for (const payment of pendingPayments || []) {
      try {
        const status = await getTatraPaymentStatus(payment.provider_payment_id);
        if (status.state === "successful") {
          const { error: processError } = await db.rpc("wallet_process_successful_payment", {
            p_payment_id: payment.id,
            p_provider_payment_id: payment.provider_payment_id,
            p_provider_metadata: {
              provider: "tatrabanka",
              verified_status: status.data,
              source: "wallet_history_refresh",
            },
          });
          if (processError) throw processError;
        } else if (status.state === "failed") {
          const { error: updateError } = await db
            .from("payments")
            .update({ status: "failed", error_message: "TatraPayPlus payment failed" })
            .eq("id", payment.id);
          if (updateError) throw updateError;
        }
      } catch (paymentError) {
        console.error(`Pending TatraPayPlus verification failed for payment ${payment.id}:`, paymentError);
      }
    }
  }

  const [{ data: balanceData, error: balanceError }, { data: rows, error: historyError }] = await Promise.all([
    db.rpc("wallet_get_balance", {
      p_tenant_id: TENANT_ID,
      p_user_id: session.userId,
    }),
    db
      .from("wallet_transactions")
      .select("id, amount_eur, type, booking_id, created_at, metadata")
      .eq("tenant_id", TENANT_ID)
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (balanceError || historyError) {
    console.error("getWalletHistoryAction failed:", balanceError || historyError);
    return { success: false as const, enabled: true, error: "Históriu kreditu sa nepodarilo načítať." };
  }

  const bookingIds = [...new Set((rows || []).map((row) => row.booking_id).filter(Boolean))];
  const bookingsById = new Map<string, { startAt: string; courtId: string | null }>();
  if (bookingIds.length) {
    const { data: bookings, error: bookingsError } = await db
      .from("bookings")
      .select("id, start_at, court_id, notes")
      .eq("tenant_id", TENANT_ID)
      .in("id", bookingIds);

    if (bookingsError) {
      console.error("getWalletHistoryAction booking lookup failed:", bookingsError);
    } else {
      for (const booking of bookings || []) {
        let courtId = booking.court_id as string | null;
        if (!courtId && booking.notes) {
          try {
            const notes = typeof booking.notes === "string" ? JSON.parse(booking.notes) : booking.notes;
            courtId = notes?.courtId || null;
          } catch {}
        }
        bookingsById.set(booking.id, { startAt: booking.start_at, courtId });
      }
    }
  }

  const balanceEur = balanceData?.[0] ? Number(balanceData[0].balance_eur) : 0;
  let runningBalance = balanceEur;
  const transactions = (rows || []).map((row) => {
    const amountEur = Number(row.amount_eur);
    const balanceAfterEur = runningBalance;
    runningBalance -= amountEur;
    return {
      id: row.id,
      type: row.type as "payment" | "booking_charge" | "refund" | "manual_adjustment" | "bonus",
      amountEur,
      balanceAfterEur,
      createdAt: row.created_at,
      booking: row.booking_id ? bookingsById.get(row.booking_id) || null : null,
      reason: typeof row.metadata?.reason === "string" ? row.metadata.reason : null,
    };
  });

      return { success: true as const, enabled: true, balanceEur, transactions };
}

/** @deprecated Stripe return reconciliation was replaced by the TatraPayPlus callback. */
export async function reconcileWalletCheckoutAction(checkoutSessionId: string) {
  void checkoutSessionId;
  return { success: false as const, error: "Táto platobná relácia už nie je podporovaná." };
}

export async function createWalletCheckoutAction(amountEur: number, operationId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre dobitie sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Dobíjanie kreditu nie je pre tento účet povolené." };
  }
  if (![10, 20, 50].includes(amountEur)) {
    return { success: false as const, error: "Nepovolená suma dobitia." };
  }
  if (!operationId || operationId.length > 100) {
    return { success: false as const, error: "Neplatný identifikátor operácie." };
  }

    const db = getCoreServiceDb();
  const idempotencyKey = `tatrabanka-checkout:${session.userId}:${operationId}`;
  const { data: payment, error: paymentError } = await db
    .from("payments")
    .insert({
      tenant_id: TENANT_ID,
      user_id: session.userId,
      amount_eur: amountEur,
      provider: "tatrabanka",
      idempotency_key: idempotencyKey,
      status: "pending",
      metadata: { source: "wallet_checkout", environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown" },
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    console.error("createWalletCheckoutAction payment insert failed:", paymentError);
    return { success: false as const, error: "Platbu sa nepodarilo pripraviť." };
  }

  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipAddress = forwardedFor || requestHeaders.get("x-real-ip") || "127.0.0.1";
    const redirectUri = process.env.TATRABANKA_REDIRECT_URI;
    if (!redirectUri) throw new Error("TATRABANKA_REDIRECT_URI is not configured");

    const checkout = await createTatraPayment({ amountEur, redirectUri, ipAddress, requestId: crypto.randomUUID() });
    const { error: updateError } = await db
      .from("payments")
      .update({ provider_payment_id: checkout.paymentId, status: "processing" })
      .eq("id", payment.id);
    if (updateError) throw updateError;

    return { success: true as const, url: checkout.url };
  } catch (error) {
    console.error("createWalletCheckoutAction TatraPayPlus failed:", error);
    await db.from("payments").update({ status: "failed", error_message: "TatraPayPlus payment creation failed" }).eq("id", payment.id);
    return { success: false as const, error: "Platobnú stránku sa nepodarilo vytvoriť." };
  }
}

export async function addTestWalletCreditAction(amountEur: number, operationId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre dobitie sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Testovacie dobíjanie nie je pre tento účet povolené." };
  }
  if (![10, 20, 50].includes(amountEur)) {
    return { success: false as const, error: "Nepovolená suma dobitia." };
  }
  if (!operationId || operationId.length > 100) {
    return { success: false as const, error: "Neplatný identifikátor operácie." };
  }

  const db = getCoreServiceDb();
  const { data, error } = await db.rpc("wallet_manual_adjustment", {
    p_tenant_id: TENANT_ID,
    p_user_id: session.userId,
    p_amount_eur: amountEur,
    p_reason: "Pilotné testovacie dobitie kreditu",
    p_idempotency_key: `frontend-pilot-topup:${operationId}`,
    p_metadata: {
      source: "frontend_pilot",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    },
  });

  if (error) {
    console.error("addTestWalletCreditAction failed:", error);
    return { success: false as const, error: "Testovací kredit sa nepodarilo pridať." };
  }

  const result = data?.[0];
  if (!result) return { success: false as const, error: "Databáza nevrátila výsledok dobitia." };

  return {
    success: true as const,
    balanceEur: Number(result.balance_eur),
    created: Boolean(result.created),
    amountEur,
  };
}




