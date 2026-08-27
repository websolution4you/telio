import { NextResponse } from "next/server";

import { getCoreServiceDb } from "@/lib/server/supabase";
import { getTatraPaymentStatus } from "@/lib/server/tatrabanka";
import { createSession } from "@/lib/auth/bookingAuth";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";
const PAYMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createRedirectWithSession(
  request: Request,
  result: "success" | "failed" | "pending" | "error",
  userId?: string | null,
  amountEur?: number | null
) {
  const url = new URL("/newbookings", request.url);
  url.searchParams.set("wallet", result);
  if (amountEur) url.searchParams.set("amount", String(amountEur));

  const response = NextResponse.redirect(url);

  if (userId) {
    try {
      const db = getCoreServiceDb();
      const { data: user } = await db
        .from("booking_users")
        .select("id, name, email, phone, role, card_number")
        .eq("id", userId)
        .maybeSingle();

      if (user) {
        const token = await createSession({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          cardNumber: user.card_number,
        });

        response.cookies.set("booking_session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });
      }
    } catch (e) {
      console.error("Failed to restore session in payment callback:", e);
    }
  }

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const providerPaymentId = url.searchParams.get("paymentId");
  const internalPaymentId = url.searchParams.get("internalPaymentId");
  const paymentMethod = url.searchParams.get("paymentMethod");
  const callbackError = url.searchParams.get("error");
  const callbackErrorId = url.searchParams.get("errorId");

  const hasProviderId = Boolean(providerPaymentId && PAYMENT_ID_PATTERN.test(providerPaymentId));
  const hasInternalId = Boolean(internalPaymentId && PAYMENT_ID_PATTERN.test(internalPaymentId));
  if (!hasProviderId && !hasInternalId) return createRedirectWithSession(request, "error");

  const db = getCoreServiceDb();
  let paymentQuery = db
    .from("payments")
    .select("id, user_id, amount_eur, provider, status, provider_payment_id")
    .eq("tenant_id", TENANT_ID)
    .eq("provider", "tatrabanka");
  paymentQuery = hasInternalId
    ? paymentQuery.eq("id", internalPaymentId as string)
    : paymentQuery.eq("provider_payment_id", providerPaymentId as string);
  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

  if (paymentError || !payment) {
    console.error("TatraPayPlus callback payment lookup failed:", paymentError);
    return createRedirectWithSession(request, "error");
  }

  const paymentId = payment.provider_payment_id;
  if (!paymentId || !PAYMENT_ID_PATTERN.test(paymentId)) {
    return createRedirectWithSession(request, "error", payment.user_id, Number(payment.amount_eur));
  }

  if (callbackError) {
    await db.from("payments").update({
      status: "failed",
      error_message: `TatraPayPlus callback error: ${callbackError}${callbackErrorId ? ` (${callbackErrorId})` : ""}`,
    }).eq("id", payment.id);
    return createRedirectWithSession(request, "failed", payment.user_id, Number(payment.amount_eur));
  }

  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 600));
      }
      const status = await getTatraPaymentStatus(paymentId);
      if (status.state === "successful") {
        const providerStatus = status.data.status;
        const paidAmount = providerStatus && typeof providerStatus === "object" && "amount" in providerStatus
          ? Number(providerStatus.amount)
          : NaN;
        const currency = providerStatus && typeof providerStatus === "object" && "currency" in providerStatus
          ? providerStatus.currency
          : null;
        if (paidAmount !== Number(payment.amount_eur) || currency !== "EUR") {
          console.error("TatraPayPlus callback amount mismatch:", { paymentId, paidAmount, currency });
          return createRedirectWithSession(request, "error", payment.user_id, Number(payment.amount_eur));
        }

        const { error } = await db.rpc("wallet_process_successful_payment", {
          p_payment_id: payment.id,
          p_provider_payment_id: paymentId,
          p_provider_metadata: {
            provider: "tatrabanka",
            payment_method: paymentMethod,
            verified_status: status.data,
            source: "verified_callback",
          },
        });
        if (error) throw error;
        return createRedirectWithSession(request, "success", payment.user_id, Number(payment.amount_eur));
      }

      if (status.state === "failed") {
        await db.from("payments").update({ status: "failed", error_message: "TatraPayPlus payment failed" }).eq("id", payment.id);
        return createRedirectWithSession(request, "failed", payment.user_id, Number(payment.amount_eur));
      }
    }

    return createRedirectWithSession(request, "pending", payment.user_id, Number(payment.amount_eur));
  } catch (error) {
    console.error("TatraPayPlus callback verification failed:", error);
    return createRedirectWithSession(request, "error", payment?.user_id, payment ? Number(payment.amount_eur) : null);
  }
}
