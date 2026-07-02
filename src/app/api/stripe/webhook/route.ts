import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw request body to verify the signature.
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

// How many installment invoices of a plan are marked paid.
async function paidCount(admin: Admin, planId: string): Promise<number> {
  const { count } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("payment_plan_id", planId)
    .eq("status", "paid");
  return count ?? 0;
}

// Confirm every still-pending registration of a plan (place secured).
async function confirmRegistrations(admin: Admin, planId: string) {
  await admin
    .from("registrations")
    .update({ status: "confirmed" })
    .eq("payment_plan_id", planId)
    .eq("status", "pending");
}

// One-time payment completed (card "annuel" or the first TWINT installment).
async function handleOneTime(admin: Admin, session: Stripe.Checkout.Session) {
  const planId = session.metadata?.planId ?? "";
  const invoiceId = session.metadata?.invoiceId ?? "";
  const method =
    session.payment_method_types?.[0] === "twint" ? "twint" : "stripe";

  if (invoiceId) {
    await admin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: method,
        stripe_session_id: session.id,
      })
      .eq("id", invoiceId)
      .eq("status", "pending"); // idempotent: only the first time
  }

  if (planId) {
    const { data: plan } = await admin
      .from("payment_plans")
      .select("installments_total")
      .eq("id", planId)
      .maybeSingle<{ installments_total: number }>();
    const paid = await paidCount(admin, planId);
    await admin
      .from("payment_plans")
      .update({
        installments_paid: paid,
        status:
          paid >= (plan?.installments_total ?? 1) ? "completed" : "active",
      })
      .eq("id", planId);
    await confirmRegistrations(admin, planId);
  }
}

// Subscription checkout completed → attach the subscription to its plan.
// Installment counting happens in invoice.paid (fires for every charge).
async function handleSubscriptionStart(
  admin: Admin,
  session: Stripe.Checkout.Session,
) {
  const planId = session.metadata?.planId ?? "";
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  if (!planId) return;
  await admin
    .from("payment_plans")
    .update({
      stripe_subscription_id: subId,
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : null,
      status: "active",
    })
    .eq("id", planId);
}

// A subscription invoice was paid → mark the next installment paid, and cancel
// the subscription once the last installment has been collected.
async function handleInvoicePaid(admin: Admin, invoice: Stripe.Invoice) {
  const rawSub = (
    invoice as unknown as { subscription?: string | { id: string } | null }
  ).subscription;
  const subId = typeof rawSub === "string" ? rawSub : (rawSub?.id ?? null);
  if (!subId || !stripe) return;

  // Only count real charges (first charge + each renewal).
  const reason = invoice.billing_reason ?? "";
  if (reason !== "subscription_create" && reason !== "subscription_cycle") {
    return;
  }

  // Find the plan by subscription id, or via the subscription metadata (the
  // subscription-start webhook may not have run yet).
  let { data: plan } = await admin
    .from("payment_plans")
    .select("id, installments_total")
    .eq("stripe_subscription_id", subId)
    .maybeSingle<{ id: string; installments_total: number }>();

  if (!plan) {
    const sub = await stripe.subscriptions.retrieve(subId);
    const pid = sub.metadata?.planId;
    if (!pid) return;
    const res = await admin
      .from("payment_plans")
      .select("id, installments_total")
      .eq("id", pid)
      .maybeSingle<{ id: string; installments_total: number }>();
    plan = res.data;
    if (!plan) return;
    await admin
      .from("payment_plans")
      .update({
        stripe_subscription_id: subId,
        stripe_customer_id:
          typeof invoice.customer === "string" ? invoice.customer : null,
      })
      .eq("id", plan.id);
  }

  // Idempotency: skip if this Stripe invoice was already recorded.
  const { data: seen } = await admin
    .from("invoices")
    .select("id")
    .eq("payment_plan_id", plan.id)
    .eq("stripe_session_id", invoice.id)
    .maybeSingle();
  if (seen) return;

  // Mark the lowest still-pending installment paid.
  const { data: nextInv } = await admin
    .from("invoices")
    .select("id")
    .eq("payment_plan_id", plan.id)
    .eq("status", "pending")
    .order("installment_number", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (nextInv) {
    await admin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "stripe",
        stripe_session_id: invoice.id,
      })
      .eq("id", nextInv.id);
  }

  const paid = await paidCount(admin, plan.id);
  const done = paid >= plan.installments_total;
  await admin
    .from("payment_plans")
    .update({
      installments_paid: paid,
      status: done ? "completed" : "active",
    })
    .eq("id", plan.id);

  await confirmRegistrations(admin, plan.id);

  // Last installment collected → stop the subscription so it never rebills.
  if (done) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch {
      // already cancelled / gone — nothing to do
    }
  }
}

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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription") {
      await handleSubscriptionStart(admin, session);
    } else {
      await handleOneTime(admin, session);
    }
  } else if (event.type === "invoice.paid") {
    await handleInvoicePaid(admin, event.data.object as Stripe.Invoice);
  }

  // TODO: confirmation email + PDF invoice (Resend) once the domain mail is ready.
  return NextResponse.json({ received: true });
}
