"use server";

import { redirect } from "next/navigation";

import { stripe } from "@/lib/stripe/client";
import { isViewingAs } from "@/lib/account/view-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Invoice, PaymentPlan } from "@/types/database";

// Pay a single pending installment (TWINT, or a one-off card "annuel"). Card
// subscriptions charge automatically and never reach this action.
export async function payInstallment(formData: FormData): Promise<void> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const locale = String(formData.get("locale") ?? "fr") === "en" ? "en" : "fr";
  const backUrl = `/${locale}/mon-compte/factures`;

  if (!invoiceId) redirect(backUrl);
  // Admin preview must never trigger a real payment.
  if (await isViewingAs()) redirect(backUrl);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion`);

  const admin = createSupabaseAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle<Invoice>();
  if (
    !invoice ||
    invoice.profile_id !== user.id ||
    invoice.status !== "pending" ||
    !invoice.payment_plan_id
  ) {
    redirect(backUrl);
  }

  const { data: plan } = await admin
    .from("payment_plans")
    .select("*")
    .eq("id", invoice.payment_plan_id)
    .maybeSingle<PaymentPlan>();
  if (!plan) redirect(backUrl);

  const manual =
    plan.method === "twint" ||
    (plan.method === "card" && plan.installments_total === 1);
  if (!manual || !stripe) redirect(backUrl);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: plan.method === "twint" ? ["twint"] : ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "chf",
            unit_amount: invoice.amount_cents,
            product_data: {
              name: `The Last Line - versement ${invoice.installment_number ?? 1}/${plan.installments_total}`,
            },
          },
        },
      ],
      customer_email: user.email || undefined,
      success_url: `${siteUrl}${backUrl}?paid=1`,
      cancel_url: `${siteUrl}${backUrl}?canceled=1`,
      metadata: {
        planId: plan.id,
        invoiceId: invoice.id,
        kind: "onetime",
      },
    });
    url = session.url;
  } catch {
    url = null;
  }

  redirect(url ?? backUrl);
}
