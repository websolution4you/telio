import { NextResponse } from "next/server";

import { getCoreServiceDb } from "@/lib/server/supabase";
import { getTatraPaymentStatus } from "@/lib/server/tatrabanka";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";
const PAYMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dashboardRedirect(request: Request, result: string) {
  const url = new URL("/dashboard/transactions", request.url);
  url.searchParams.set("wallet", result);
  return NextResponse.redirect(url);
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
  if (!hasProviderId && !hasInternalId) return dashboardRedirect(request, "error");

  const db = getCoreServiceDb();
  let paymentQuery = db
    .from("payments")
    .select("id, amount_eur, provider, status, provider_payment_id")
    .eq("tenant_id", TENANT_ID)
    .eq("provider", "tatrabanka");
  paymentQuery = hasInternalId
    ? paymentQuery.eq("id", internalPaymentId as string)
    : paymentQuery.eq("provider_payment_id", providerPaymentId as string);
  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

  if (paymentError || !payment) {
    console.error("TatraPayPlus callback payment lookup failed:", paymentError);
    return dashboardRedirect(request, "error");
  }

  const paymentId = payment.provider_payment_id;
  if (!paymentId || !PAYMENT_ID_PATTERN.test(paymentId)) return dashboardRedirect(request, "error");

  if (callbackError) {
    await db.from("payments").update({
      status: "failed",
      error_message: `TatraPayPlus callback error: ${callbackError}${callbackErrorId ? ` (${callbackErrorId})` : ""}`,
    }).eq("id", payment.id);
    return dashboardRedirect(request, "failed");
  }

      try {
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
        return dashboardRedirect(request, "error");
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
      return dashboardRedirect(request, "success");
    }

    if (status.state === "failed") {
      await db.from("payments").update({ status: "failed", error_message: "TatraPayPlus payment failed" }).eq("id", payment.id);
      return dashboardRedirect(request, "failed");
    }

    return dashboardRedirect(request, "pending");
  } catch (error) {
    console.error("TatraPayPlus callback verification failed:", error);
    return dashboardRedirect(request, "error");
  }
}
