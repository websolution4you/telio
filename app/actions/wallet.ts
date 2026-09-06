"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { getAppUrl, getStripe } from "@/lib/server/stripe";
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

export async function reconcileWalletCardPayAction(internalPaymentId?: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre overenie platby sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Dobíjanie kreditu nie je pre tento účet povolené." };
  }

    if (internalPaymentId && !/^[0-9a-f-]{36}$/i.test(internalPaymentId)) {
    return { success: false as const, error: "Neplatný identifikátor CardPay platby." };
  }

  const db = getCoreServiceDb();
    let paymentQuery = db
    .from("payments")
    .select("id, provider_payment_id, amount_eur, status")
    .eq("tenant_id", TENANT_ID)
    .eq("user_id", session.userId)
    .eq("provider", "tatrabanka")
    .not("provider_payment_id", "is", null);
  paymentQuery = internalPaymentId
    ? paymentQuery.eq("id", internalPaymentId)
    : paymentQuery.in("status", ["processing", "pending"]);
  const { data: payments, error } = await paymentQuery
    .order("created_at", { ascending: false })
    .limit(internalPaymentId ? 1 : 10);

  if (error) {
    console.error("reconcileWalletCardPayAction lookup failed:", error);
    return { success: false as const, error: "CardPay platby sa nepodarilo overiť." };
  }

    let successful = 0;
  let failed = 0;
  let pending = 0;
  for (const payment of payments || []) {
    if (payment.status === "paid") {
      successful += 1;
      continue;
    }
    if (payment.status === "failed") {
      failed += 1;
      continue;
    }
    try {
      const result = await getTatraPaymentStatus(payment.provider_payment_id);
      if (result.state === "successful") {
        if (result.amount !== null && result.amount !== Number(payment.amount_eur)) {
          console.error("CardPay reconciliation amount mismatch:", { paymentId: payment.id, paidAmount: result.amount, expected: payment.amount_eur });
          pending += 1;
          continue;
        }
        const { error: processError } = await db.rpc("wallet_process_successful_payment", {
          p_payment_id: payment.id,
          p_provider_payment_id: payment.provider_payment_id,
          p_provider_metadata: {
            provider: "tatrabanka",
            payment_method: "CARD_PAY",
            verified_status: result.data,
            source: "user_return_reconciliation",
          },
        });
        if (processError) throw processError;
        successful += 1;
      } else if (result.state === "failed") {
        const { error: updateError } = await db
          .from("payments")
          .update({ status: "failed", error_message: "TatraPayPlus CardPay payment failed" })
          .eq("id", payment.id);
        if (updateError) throw updateError;
        failed += 1;
      } else {
        pending += 1;
      }
    } catch (paymentError) {
      console.error(`CardPay reconciliation failed for ${payment.id}:`, paymentError);
      pending += 1;
    }
  }

  return { success: true as const, successful, failed, pending };
}

export async function reconcileWalletCheckoutAction(checkoutSessionId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre overenie platby sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Dobíjanie kreditu nie je pre tento účet povolené." };
  }
  if (!/^cs_[A-Za-z0-9_]+$/.test(checkoutSessionId)) {
    return { success: false as const, error: "Neplatná Stripe session." };
  }

  try {
    const checkout = await getStripe().checkout.sessions.retrieve(checkoutSessionId);
    if (checkout.payment_status !== "paid" || checkout.status !== "complete") {
      return { success: false as const, pending: true, error: "Platba ešte čaká na potvrdenie." };
    }
    if (checkout.metadata?.userId !== session.userId || checkout.metadata?.tenantId !== TENANT_ID) {
      return { success: false as const, error: "Platba nepatrí k tomuto účtu." };
    }

    const paymentId = checkout.metadata?.paymentId;
    if (!paymentId) return { success: false as const, error: "Platba nemá interný identifikátor." };

    const db = getCoreServiceDb();
    const { data: payment, error: paymentError } = await db
      .from("payments")
      .select("id, amount_eur, provider")
      .eq("id", paymentId)
      .eq("tenant_id", TENANT_ID)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (paymentError || !payment) return { success: false as const, error: "Internú platbu sa nepodarilo nájsť." };

    const stripeAmount = checkout.amount_total ? checkout.amount_total / 100 : 0;
    if (payment.provider !== "stripe" || Number(payment.amount_eur) !== stripeAmount) {
      return { success: false as const, error: "Suma platby sa nezhoduje." };
    }

    const { data, error } = await db.rpc("wallet_process_successful_payment", {
      p_payment_id: payment.id,
      p_provider_payment_id: checkout.id,
      p_provider_metadata: {
        stripe_checkout_session_id: checkout.id,
        stripe_payment_status: checkout.payment_status,
        source: "verified_success_return",
      },
    });
    if (error) throw error;

    return { success: true as const, balanceEur: data?.[0] ? Number(data[0].balance_eur) : null };
  } catch (error) {
    console.error("reconcileWalletCheckoutAction failed:", error);
    return { success: false as const, error: "Platbu sa nepodarilo potvrdiť." };
  }
}

export async function createWalletCheckoutAction(amountEur: number, operationId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre dobitie sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Dobíjanie kreditu nie je pre tento účet povolené." };
  }
  if (typeof amountEur !== "number" || isNaN(amountEur) || amountEur < 5 || amountEur > 1000) {
    return { success: false as const, error: "Nepovolená suma dobitia (min. 5 €)." };
  }
  if (!operationId || operationId.length > 100) {
    return { success: false as const, error: "Neplatný identifikátor operácie." };
  }

      const db = getCoreServiceDb();
  const idempotencyKey = `stripe-checkout:${session.userId}:${operationId}`;
  const { data: payment, error: paymentError } = await db
    .from("payments")
    .insert({
      tenant_id: TENANT_ID,
      user_id: session.userId,
      amount_eur: amountEur,
      provider: "stripe",
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
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Dobitie Telio kreditu (${amountEur} €)` },
          unit_amount: amountEur * 100,
        },
        quantity: 1,
      }],
      customer_email: session.email,
      metadata: { paymentId: payment.id, userId: session.userId, tenantId: TENANT_ID },
      payment_intent_data: { metadata: { paymentId: payment.id, userId: session.userId, tenantId: TENANT_ID } },
      success_url: `${getAppUrl()}/newbookings?wallet=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/newbookings?wallet=cancelled`,
    }, { idempotencyKey });

    const { error: updateError } = await db
      .from("payments")
      .update({ provider_payment_id: checkout.id, status: "processing" })
      .eq("id", payment.id);
    if (updateError) throw updateError;

    return { success: true as const, url: checkout.url };
  } catch (error) {
    console.error("createWalletCheckoutAction Stripe failed:", error);
    await db.from("payments").update({ status: "failed", error_message: "Stripe Checkout creation failed" }).eq("id", payment.id);
    return { success: false as const, error: "Platobnú stránku sa nepodarilo vytvoriť." };
  }
}

export async function createWalletCardPayAction(amountEur: number, operationId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre dobitie sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Dobíjanie kreditu nie je pre tento účet povolené." };
  }
  if (typeof amountEur !== "number" || isNaN(amountEur) || amountEur < 5 || amountEur > 1000) {
    return { success: false as const, error: "Nepovolená suma dobitia (min. 5 €)." };
  }
  if (!operationId || operationId.length > 100) {
    return { success: false as const, error: "Neplatný identifikátor operácie." };
  }

  const db = getCoreServiceDb();
  const idempotencyKey = `tatrabanka-cardpay:${session.userId}:${operationId}`;
  const { data: payment, error: paymentError } = await db
    .from("payments")
    .insert({
      tenant_id: TENANT_ID,
      user_id: session.userId,
      amount_eur: amountEur,
      provider: "tatrabanka",
      idempotency_key: idempotencyKey,
      status: "pending",
      metadata: {
        source: "wallet_cardpay",
        payment_method: "CARD_PAY",
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      },
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    console.error("createWalletCardPayAction payment insert failed:", paymentError);
    return { success: false as const, error: "Platbu sa nepodarilo pripraviť." };
  }

  try {
    const requestHeaders = await headers();
    const forwardedIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
        const ipAddress = forwardedIp || requestHeaders.get("x-real-ip") || "127.0.0.1";
    const nameParts = session.name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "Zakaznik";
    const lastName = nameParts.join(" ") || "Telio";
    const tatraPayment = await createTatraPayment({
      amountEur,
      redirectUri: `${getAppUrl()}/api/payments/tatrabanka/callback?internalPaymentId=${encodeURIComponent(payment.id)}`,
      ipAddress,
      requestId: payment.id,
      method: "CARD_PAY",
      user: {
        firstName,
        lastName,
        email: session.email,
        phone: session.phone,
      },
    });

    const { error: updateError } = await db
      .from("payments")
      .update({
        provider_payment_id: tatraPayment.paymentId,
        status: "processing",
        metadata: {
          source: "wallet_cardpay",
          payment_method: "CARD_PAY",
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        },
      })
      .eq("id", payment.id);
    if (updateError) throw updateError;

    return { success: true as const, url: tatraPayment.url, paymentId: payment.id };
  } catch (error) {
    console.error("createWalletCardPayAction failed:", error);
    await db.from("payments").update({ status: "failed", error_message: "TatraPayPlus CardPay creation failed" }).eq("id", payment.id);
    return { success: false as const, error: "CardPay platobnú stránku sa nepodarilo vytvoriť." };
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




