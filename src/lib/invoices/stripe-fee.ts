import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";

// Stripe keeps its commission before crediting the account: an invoice of
// 100.— leaves about 97.— on the balance. Recording only the gross amount made
// the books drift from the real balance (103.06 apart in October). The actual
// fee is read back from Stripe and booked as an expense, so the accounts match
// the bank to the centime.
//
// Best-effort throughout: a missing fee must never hold back a payment.

const CATEGORY = "frais";

type FeeSource =
  | { kind: "payment_intent"; id: string }
  | { kind: "charge"; id: string };

// Resolves the fee actually charged, in CHF.
async function readFee(source: FeeSource): Promise<number | null> {
  if (!stripe) return null;
  try {
    let charge: Stripe.Charge | null = null;

    if (source.kind === "charge") {
      charge = await stripe.charges.retrieve(source.id, {
        expand: ["balance_transaction"],
      });
    } else {
      const pi = await stripe.paymentIntents.retrieve(source.id, {
        expand: ["latest_charge.balance_transaction"],
      });
      const latest = pi.latest_charge;
      charge = typeof latest === "string" ? null : (latest ?? null);
    }
    if (!charge) return null;

    const bt = charge.balance_transaction;
    if (!bt || typeof bt === "string") return null;
    // `fee` is in the smallest currency unit, like every Stripe amount.
    return bt.fee / 100;
  } catch {
    return null;
  }
}

export async function recordStripeFee(
  admin: SupabaseClient,
  invoiceId: string,
  source: FeeSource,
): Promise<void> {
  if (!invoiceId) return;
  try {
    const { data: invoice } = await admin
      .from("invoices")
      .select("invoice_number, paid_at")
      .eq("id", invoiceId)
      .maybeSingle<{ invoice_number: string; paid_at: string | null }>();
    if (!invoice) return;

    // Keyed on the label rather than invoice_id: that column already carries
    // the income line, and recordIncomeFromInvoice expects a single row there.
    const label = `Frais Stripe · ${invoice.invoice_number}`;
    const { data: already } = await admin
      .from("transactions")
      .select("id")
      .eq("label", label)
      .limit(1);
    if ((already?.length ?? 0) > 0) return;

    const fee = await readFee(source);
    if (fee === null || fee <= 0) return;

    await admin.from("transactions").insert({
      kind: "expense",
      category: CATEGORY,
      label,
      amount: fee,
      occurred_on: (invoice.paid_at ?? new Date().toISOString()).slice(0, 10),
    });
  } catch {
    // Never break the payment flow over a bookkeeping detail.
  }
}
