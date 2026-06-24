import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw request body to verify the signature.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId) {
      // The registration was already saved (pending) when the wizard was
      // submitted; mark its invoice paid and confirm its registrations.
      const admin = createSupabaseAdminClient();
      await admin
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "stripe",
          stripe_session_id: session.id,
        })
        .eq("id", invoiceId);
      await admin
        .from("registrations")
        .update({ status: "confirmed", stripe_session_id: session.id })
        .eq("invoice_id", invoiceId);
    }
    // TODO: confirmation email + PDF invoice (Resend) once the domain mail is ready.
  }

  return NextResponse.json({ received: true });
}
