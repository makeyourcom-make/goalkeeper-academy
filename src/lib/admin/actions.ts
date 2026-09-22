"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { settleInvoicePaid } from "@/lib/invoices/settle";
import { sendInvoiceDueNotice } from "@/lib/email/invoice-due-notice";

type SupabaseAny = ReturnType<typeof createSupabaseAdminClient>;

// Free the seat(s) tied to an invoice when it is refunded or cancelled: a camp
// registration (via camp_registration_id) and/or season registrations (via the
// shared payment_plan_id). Best-effort, service-role.
async function releaseSeats(
  admin: SupabaseAny,
  inv: { camp_registration_id: string | null; payment_plan_id: string | null },
  status: "refunded" | "cancelled",
): Promise<void> {
  if (inv.camp_registration_id) {
    await admin
      .from("camp_registrations")
      .update({ status })
      .eq("id", inv.camp_registration_id);
  }
  if (inv.payment_plan_id) {
    await admin
      .from("registrations")
      .update({ status })
      .eq("payment_plan_id", inv.payment_plan_id);
  }
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return supabase;
}

export async function markInvoicePaid(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await requireAdmin();
  if (!supabase) return;

  // Same transition and side effects as the Stripe webhook, so QR / bank
  // transfer payers are notified and booked exactly like card payers.
  await settleInvoicePaid(supabase, createSupabaseAdminClient(), id);

  revalidatePath("/", "layout");
}

// Resolve a Stripe payment reference (payment_intent or charge) from the id we
// stored on the invoice — a Checkout session (cs_), an invoice (in_) or a PI.
async function resolvePaymentRef(
  ref: string,
): Promise<{ payment_intent: string } | { charge: string } | null> {
  if (!stripe) return null;
  try {
    if (ref.startsWith("pi_")) return { payment_intent: ref };
    if (ref.startsWith("cs_")) {
      const s = await stripe.checkout.sessions.retrieve(ref);
      const pi =
        typeof s.payment_intent === "string"
          ? s.payment_intent
          : (s.payment_intent?.id ?? null);
      return pi ? { payment_intent: pi } : null;
    }
    if (ref.startsWith("in_")) {
      const inv = (await stripe.invoices.retrieve(ref)) as unknown as {
        payment_intent?: string | { id: string } | null;
        charge?: string | { id: string } | null;
      };
      const pi =
        typeof inv.payment_intent === "string"
          ? inv.payment_intent
          : (inv.payment_intent?.id ?? null);
      if (pi) return { payment_intent: pi };
      const ch =
        typeof inv.charge === "string" ? inv.charge : (inv.charge?.id ?? null);
      return ch ? { charge: ch } : null;
    }
  } catch {
    return null;
  }
  return null;
}

// Refund a PAID invoice (full or 50% per the CGV). Refunds via Stripe when the
// payment went through Stripe; for QR/bank it just flips the status (the admin
// makes the bank refund). Only marks refunded once the money actually moved.
export async function refundInvoice(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const percent = String(formData.get("percent")) === "50" ? 50 : 100;

  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "invoice_number, stripe_session_id, payment_method, amount_cents, status, camp_registration_id, payment_plan_id",
    )
    .eq("id", id)
    .maybeSingle<{
      invoice_number: string;
      stripe_session_id: string | null;
      payment_method: string | null;
      amount_cents: number;
      status: string;
      camp_registration_id: string | null;
      payment_plan_id: string | null;
    }>();
  if (!inv || inv.status !== "paid") return;

  const viaStripe =
    inv.payment_method === "stripe" || inv.payment_method === "twint";
  if (stripe && viaStripe && inv.stripe_session_id) {
    const ref = await resolvePaymentRef(inv.stripe_session_id);
    if (ref) {
      const amount = Math.round((inv.amount_cents * percent) / 100);
      try {
        await stripe.refunds.create({ ...ref, amount });
      } catch {
        // Money did not move → leave the invoice paid so the admin can retry.
        return;
      }
    }
  }

  await supabase.from("invoices").update({ status: "refunded" }).eq("id", id);

  const admin = createSupabaseAdminClient();
  // Free the seat and reverse the accounting entry. The reversal is a separate
  // expense line (invoice_id left null so it doesn't clash with the income
  // ledger's per-invoice unique index) for the refunded amount.
  await releaseSeats(admin, inv, "refunded");
  await admin.from("transactions").insert({
    kind: "expense",
    category: "remboursement",
    label: `Remboursement ${inv.invoice_number}${percent === 50 ? " (50%)" : ""}`,
    amount: Math.round((inv.amount_cents * percent) / 100) / 100,
    occurred_on: new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/", "layout");
}

// Cancel an unpaid invoice (pending / overdue).
export async function cancelInvoice(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: updated } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["pending", "overdue"])
    .select("camp_registration_id, payment_plan_id")
    .maybeSingle<{
      camp_registration_id: string | null;
      payment_plan_id: string | null;
    }>();

  // Free the seat that was held while the invoice was awaiting payment.
  if (updated) {
    await releaseSeats(createSupabaseAdminClient(), updated, "cancelled");
  }
  revalidatePath("/", "layout");
}

export type CreateInvoiceState = {
  status: "idle" | "ok" | "error";
  message: string;
  invoiceNumber?: string;
};

// Issue a one-off invoice from the admin console: a make-up session, an agreed
// arrangement, anything that did not come through the registration wizard.
// Without it the only way to bill such a thing was to raise the invoice
// straight in Stripe, where it existed neither in the tracking, nor in the
// accounts, nor in the family's own space.
export async function createInvoice(
  _prev: CreateInvoiceState,
  formData: FormData,
): Promise<CreateInvoiceState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: "errorAuth" };

  const profileId = String(formData.get("profileId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").replace(",", ".");
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const method = String(formData.get("method") ?? "twint");
  const notify = formData.get("notify") === "1";

  if (!profileId || !description) {
    return { status: "error", message: "errorMissing" };
  }
  // Swiss francs in, centimes stored: parse then round, never trust a float.
  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "errorAmount" };
  }
  const amountCents = Math.round(amount * 100);
  if (method !== "twint" && method !== "stripe") {
    return { status: "error", message: "errorMethod" };
  }

  const admin = createSupabaseAdminClient();
  const { data: payer } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle<{ id: string }>();
  if (!payer) return { status: "error", message: "errorClient" };

  // invoice_number carries a DEFAULT backed by a sequence: never set it here,
  // or two invoices could collide.
  const { data: created, error } = await admin
    .from("invoices")
    .insert({
      profile_id: profileId,
      type: "particulier",
      description,
      amount_cents: amountCents,
      currency: "CHF",
      status: "pending",
      due_date: dueDate || null,
      payment_method: method,
    })
    .select("id, invoice_number")
    .single<{ id: string; invoice_number: string }>();

  if (error || !created) return { status: "error", message: "errorGeneric" };

  if (notify) {
    // Same notice as an upcoming instalment: amount, due date, a direct link to
    // the Pay button, and the PDF attached.
    await sendInvoiceDueNotice(admin, created.id);
  }

  revalidatePath("/", "layout");
  return {
    status: "ok",
    message: "created",
    invoiceNumber: created.invoice_number,
  };
}
