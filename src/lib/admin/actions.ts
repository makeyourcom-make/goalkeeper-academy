"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { sendPaymentConfirmation } from "@/lib/email/payment-confirmation";

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

  // Only transition pending → paid; send the same confirmation email as the
  // Stripe flow so QR / bank-transfer payers are notified too.
  const { data: updated } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if ((updated?.length ?? 0) > 0) {
    await sendPaymentConfirmation(supabase, id);
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
    .select("stripe_session_id, payment_method, amount_cents, status")
    .eq("id", id)
    .maybeSingle<{
      stripe_session_id: string | null;
      payment_method: string | null;
      amount_cents: number;
      status: string;
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
  revalidatePath("/", "layout");
}

// Cancel an unpaid invoice (pending / overdue).
export async function cancelInvoice(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["pending", "overdue"]);
  revalidatePath("/", "layout");
}
