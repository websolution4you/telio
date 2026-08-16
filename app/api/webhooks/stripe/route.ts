import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const checkout = event.data.object as Stripe.Checkout.Session;
  const paymentId = checkout.metadata?.paymentId;
  const providerPaymentId = checkout.id;
  if (!paymentId || checkout.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const db = getCoreServiceDb();
  const { data, error } = await db.rpc("wallet_process_successful_payment", {
    p_payment_id: paymentId,
    p_provider_payment_id: providerPaymentId,
    p_provider_metadata: {
      stripe_event_id: event.id,
      stripe_checkout_session_id: checkout.id,
      stripe_payment_status: checkout.payment_status,
    },
  });

  if (error) {
    console.error("Stripe wallet posting failed:", error);
    return NextResponse.json({ error: "Wallet posting failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, posted: Boolean(data?.[0]?.posted) });
}
