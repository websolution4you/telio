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

function popupResponse(request: Request, result: "success" | "failed" | "pending" | "error") {
  const origin = new URL(request.url).origin;
  const pending = result === "pending";
  const message = pending
    ? "Overujeme platbu v banke..."
    : result === "success"
      ? "Platba bola potvrdená. Toto okno sa zatvorí."
      : result === "failed"
        ? "Platba nebola úspešná. Toto okno sa zatvorí."
        : "Platbu sa nepodarilo overiť. Toto okno sa zatvorí.";
  const script = pending
    ? "setTimeout(function(){ location.reload(); }, 1000);"
    : `if (window.opener) window.opener.postMessage({ type: "telio-cardpay", result: "${result}" }, ${JSON.stringify(origin)}); setTimeout(function(){ window.close(); }, 100);`;

  return new NextResponse(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CardPay</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f5;font-family:Arial,sans-serif;color:#0f172a"><main style="max-width:360px;padding:32px;text-align:center"><h1 style="font-size:20px">${message}</h1>${pending ? "<p>Prosím, nezatvárajte toto okno.</p>" : ""}</main><script>${script}</script></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function paymentResponse(request: Request, result: "success" | "failed" | "pending" | "error", popup: boolean) {
  return popup ? popupResponse(request, result) : dashboardRedirect(request, result);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const popup = url.searchParams.get("popup") === "1";
  const providerPaymentId = url.searchParams.get("paymentId");
  const internalPaymentId = url.searchParams.get("internalPaymentId");
  const paymentMethod = url.searchParams.get("paymentMethod");
  const callbackError = url.searchParams.get("error");
  const callbackErrorId = url.searchParams.get("errorId");

    const hasProviderId = Boolean(providerPaymentId && PAYMENT_ID_PATTERN.test(providerPaymentId));
  const hasInternalId = Boolean(internalPaymentId && PAYMENT_ID_PATTERN.test(internalPaymentId));
  if (!hasProviderId && !hasInternalId) return paymentResponse(request, "error", popup);

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
    return paymentResponse(request, "error", popup);
  }

  const paymentId = payment.provider_payment_id;
  if (!paymentId || !PAYMENT_ID_PATTERN.test(paymentId)) return paymentResponse(request, "error", popup);

  if (callbackError) {
    await db.from("payments").update({
      status: "failed",
      error_message: `TatraPayPlus callback error: ${callbackError}${callbackErrorId ? ` (${callbackErrorId})` : ""}`,
    }).eq("id", payment.id);
    return paymentResponse(request, "failed", popup);
  }

    try {
    let status = await getTatraPaymentStatus(paymentId);
    for (let attempt = 0; status.state === "pending" && attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      status = await getTatraPaymentStatus(paymentId);
    }
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
        return paymentResponse(request, "error", popup);
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
      return paymentResponse(request, "success", popup);
    }

    if (status.state === "failed") {
      await db.from("payments").update({ status: "failed", error_message: "TatraPayPlus payment failed" }).eq("id", payment.id);
      return paymentResponse(request, "failed", popup);
    }

    return paymentResponse(request, "pending", popup);
  } catch (error) {
    console.error("TatraPayPlus callback verification failed:", error);
    return paymentResponse(request, "error", popup);
  }
}
