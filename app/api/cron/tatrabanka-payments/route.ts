import { NextResponse } from "next/server";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { getTatraPaymentStatus } from "@/lib/server/tatrabanka";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getCoreServiceDb();
  const { data: payments, error } = await db
    .from("payments")
    .select("id, provider_payment_id")
    .eq("tenant_id", TENANT_ID)
    .eq("provider", "tatrabanka")
    .eq("status", "processing")
    .not("provider_payment_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("TatraPayPlus cron lookup failed:", error);
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  const summary = { checked: 0, successful: 0, failed: 0, pending: 0, errors: 0 };
  for (const payment of payments || []) {
    summary.checked += 1;
    try {
      const status = await getTatraPaymentStatus(payment.provider_payment_id);
      if (status.state === "successful") {
        const { error: processError } = await db.rpc("wallet_process_successful_payment", {
          p_payment_id: payment.id,
          p_provider_payment_id: payment.provider_payment_id,
          p_provider_metadata: {
            provider: "tatrabanka",
            verified_status: status.data,
            source: "status_polling",
          },
        });
        if (processError) throw processError;
        summary.successful += 1;
      } else if (status.state === "failed") {
        const { error: updateError } = await db
          .from("payments")
          .update({ status: "failed", error_message: "TatraPayPlus payment failed" })
          .eq("id", payment.id);
        if (updateError) throw updateError;
        summary.failed += 1;
      } else {
        summary.pending += 1;
      }
    } catch (paymentError) {
      summary.errors += 1;
      console.error(`TatraPayPlus cron failed for payment ${payment.id}:`, paymentError);
    }
  }

  return NextResponse.json(summary);
}
