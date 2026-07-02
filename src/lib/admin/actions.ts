"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { sendPaymentConfirmation } from "@/lib/email/payment-confirmation";
import { recordIncomeFromInvoice } from "@/lib/admin/record-income";

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

  // Only transition pending/overdue → paid; send the same confirmation email as
  // the Stripe flow so QR / bank-transfer payers are notified too.
  const { data: updated } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "overdue"])
    .select("id, camp_registration_id, payment_plan_id")
    .maybeSingle<{
      id: string;
      camp_registration_id: string | null;
      payment_plan_id: string | null;
    }>();

  if (updated) {
    await sendPaymentConfirmation(supabase, id);
    await recordIncomeFromInvoice(supabase, id);
    // Secure the seat, exactly like the Stripe webhook does on card/TWINT.
    const admin = createSupabaseAdminClient();
    if (updated.camp_registration_id) {
      await admin
        .from("camp_registrations")
        .update({ status: "confirmed" })
        .eq("id", updated.camp_registration_id)
        .eq("status", "pending");
    }
    if (updated.payment_plan_id) {
      await admin
        .from("registrations")
        .update({ status: "confirmed" })
        .eq("payment_plan_id", updated.payment_plan_id)
        .eq("status", "pending");
    }
  }

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
