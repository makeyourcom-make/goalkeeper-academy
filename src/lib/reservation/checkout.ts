"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { stripe } from "@/lib/stripe/client";
import { isViewingAs } from "@/lib/account/view-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import campsData from "@/data/camps.json";

type Camp = (typeof campsData)[number];

const SCHEMA = z.object({
  slug: z.string().min(1),
  locale: z.enum(["fr", "en"]),
  childId: z.string().uuid(),
  paymentMethod: z.enum(["card", "twint", "qr_bill"]),
});

function getCamp(slug: string): Camp | undefined {
  return (campsData as Camp[]).find((c) => c.slug === slug);
}

// Real checkout for a camp ("stage"): creates (or reuses) a camp registration
// and its invoice, then either opens a Stripe Checkout (card / TWINT) or, for
// the QR-bill, records a pending invoice and sends the parent to the
// confirmation page with the payment instructions.
export async function startCampCheckout(formData: FormData): Promise<void> {
  const parsed = SCHEMA.safeParse({
    slug: formData.get("slug"),
    locale: formData.get("locale"),
    childId: formData.get("childId"),
    paymentMethod: formData.get("paymentMethod"),
  });

  const locale = String(formData.get("locale") ?? "fr") === "en" ? "en" : "fr";
  const slug = String(formData.get("slug") ?? "");
  const back = `/${locale}/stages/${slug}/reservation`;

  if (!parsed.success) redirect(`${back}?error=invalid`);
  const { childId, paymentMethod } = parsed.data;

  // Admin preview must never trigger a real payment.
  if (await isViewingAs()) redirect(back);

  const camp = getCamp(parsed.data.slug);
  if (!camp) redirect(`${back}?error=invalid`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion?next=${encodeURIComponent(back)}`);

  const admin = createSupabaseAdminClient();

  // The child must belong to the signed-in parent.
  const { data: child } = await admin
    .from("children")
    .select("id, parent_id, first_name, last_name")
    .eq("id", childId)
    .maybeSingle<{
      id: string;
      parent_id: string;
      first_name: string | null;
      last_name: string | null;
    }>();
  if (!child || child.parent_id !== user.id) redirect(`${back}?error=child`);

  // Server-authoritative price (never trust the client).
  const amountCents = Math.round(camp.price * 100);

  // Mirror the camp into the DB (camps.json stays the source of truth). The
  // camp_registration FK needs a real camp row.
  const { data: campRow } = await admin
    .from("camps")
    .upsert(
      {
        slug: camp.slug,
        title: camp.title.fr,
        location: camp.location,
        starts_at: camp.startDate,
        ends_at: camp.endDate,
        price_cents: amountCents,
        status: "open",
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (!campRow) redirect(`${back}?error=server`);

  // Reuse an existing registration for this camp+child, or create one.
  const { data: existingReg } = await admin
    .from("camp_registrations")
    .select("id, status")
    .eq("camp_id", campRow.id)
    .eq("child_id", childId)
    .maybeSingle<{ id: string; status: string }>();

  if (existingReg && existingReg.status === "confirmed") {
    redirect(`${back}?error=already`);
  }

  let regId = existingReg?.id ?? "";
  if (!regId) {
    const { data: reg } = await admin
      .from("camp_registrations")
      .insert({
        camp_id: campRow.id,
        child_id: childId,
        parent_id: user.id,
        status: "pending",
        amount_cents: amountCents,
      })
      .select("id")
      .single();
    if (!reg) redirect(`${back}?error=server`);
    regId = reg.id;
  }

  // Reuse a pending invoice for this registration, or create one.
  const invoiceMethod = paymentMethod === "card" ? "stripe" : paymentMethod;
  const { data: existingInv } = await admin
    .from("invoices")
    .select("id, status")
    .eq("camp_registration_id", regId)
    .in("status", ["pending", "overdue"])
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  let invoiceId = existingInv?.id ?? "";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueStr = dueDate.toISOString().slice(0, 10);

  if (invoiceId) {
    await admin
      .from("invoices")
      .update({ payment_method: invoiceMethod, status: "pending" })
      .eq("id", invoiceId);
  } else {
    const { data: inv } = await admin
      .from("invoices")
      .insert({
        profile_id: user.id,
        child_id: childId,
        camp_registration_id: regId,
        type: "camp",
        amount_cents: amountCents,
        currency: "CHF",
        status: "pending",
        due_date: dueStr,
        payment_method: invoiceMethod,
      })
      .select("id")
      .single();
    if (!inv) redirect(`${back}?error=server`);
    invoiceId = inv.id;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmationUrl = `${siteUrl}/${locale}/stages/${camp.slug}/reservation/confirmation`;

  // QR-bill: no online payment — the parent pays by bank transfer. Leave the
  // invoice pending; the admin marks it paid when the money arrives.
  if (paymentMethod === "qr_bill") {
    redirect(`${confirmationUrl}?invoice=${invoiceId}`);
  }

  if (!stripe) redirect(`${back}?error=server`);

  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethod === "twint" ? ["twint"] : ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "chf",
            unit_amount: amountCents,
            product_data: { name: `The Last Line — ${camp.title.fr}` },
          },
        },
      ],
      customer_email: user.email || undefined,
      success_url: `${confirmationUrl}?invoice=${invoiceId}&paid=1`,
      cancel_url: `${siteUrl}${back}?canceled=1`,
      metadata: {
        invoiceId,
        campRegistrationId: regId,
        kind: "camp",
      },
    });
    url = session.url;
  } catch {
    url = null;
  }

  redirect(url ?? `${back}?error=server`);
}
