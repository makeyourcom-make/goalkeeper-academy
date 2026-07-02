import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CADENCE_INTERVAL, type Cadence } from "@/lib/inscription/pricing";
import type { PaymentPlan } from "@/types/database";

type Body = { planId?: string; locale?: string };

export async function POST(req: NextRequest) {
  // Stripe not configured yet → tell the client to fall back to the "pending
  // payment" success screen (the plan + invoices are already saved).
  if (!stripe) {
    return NextResponse.json({ configured: false });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "fr";
  const planId = body.planId;
  if (!planId) {
    return NextResponse.json({ error: "missing planId" }, { status: 400 });
  }

  // Authenticate and load the plan the user is trying to pay — never trust
  // amounts from the client; everything comes from our own DB.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: plan } = await admin
    .from("payment_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle<PaymentPlan>();

  if (!plan || plan.profile_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // qr_bill is paid by bank transfer — no Stripe session.
  if (plan.method === "qr_bill") {
    return NextResponse.json({ configured: false });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const successUrl = `${siteUrl}/${locale}/reserver?paid=1`;
  const cancelUrl = `${siteUrl}/${locale}/reserver?canceled=1`;
  const per = plan.amount_per_installment_cents;

  try {
    // ---- Card, échelonné (>1 installment) → Stripe subscription (auto-charge)
    if (plan.method === "card" && plan.installments_total > 1) {
      const cadence = plan.cadence as Exclude<Cadence, "annual">;
      const interval = CADENCE_INTERVAL[cadence];
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "chf",
              unit_amount: per,
              recurring: {
                interval: interval.interval,
                interval_count: interval.interval_count,
              },
              product_data: {
                name: `The Last Line - inscription (${plan.installments_total} versements)`,
              },
            },
          },
        ],
        customer_email: user.email || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { planId: plan.id },
        subscription_data: { metadata: { planId: plan.id } },
      });
      return NextResponse.json({ url: session.url });
    }

    // ---- Card annuel OR TWINT → one-time payment of the first installment.
    const { data: firstInvoice } = await admin
      .from("invoices")
      .select("id")
      .eq("payment_plan_id", plan.id)
      .eq("installment_number", 1)
      .maybeSingle<{ id: string }>();

    const methodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
      plan.method === "twint" ? ["twint"] : ["card"];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: methodTypes,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "chf",
            unit_amount: per,
            product_data: {
              name:
                plan.installments_total > 1
                  ? `The Last Line - inscription (1er versement sur ${plan.installments_total})`
                  : `The Last Line - inscription`,
            },
          },
        },
      ],
      customer_email: user.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId: plan.id,
        invoiceId: firstInvoice?.id ?? "",
        kind: "onetime",
      },
    });
    return NextResponse.json({ url: session.url });
  } catch {
    // Placeholder/invalid key or Stripe unavailable: let the client fall back
    // to the "pending payment" success screen.
    return NextResponse.json({ configured: false });
  }
}
