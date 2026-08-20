import type { SupabaseClient } from "@supabase/supabase-js";

import { sendPaymentConfirmation } from "@/lib/email/payment-confirmation";
import { recordIncomeFromInvoice } from "@/lib/admin/record-income";

type Extras = {
  // Stripe's own hosted PDF, so the parent can download a real document.
  pdfUrl?: string | null;
  // Stripe reference (invoice / session id) kept for reconciliation.
  stripeRef?: string | null;
  paymentMethod?: string | null;
};

// Mark an invoice paid and run every side effect that must follow: receipt
// e-mail, accounting entry, and securing the seat of the linked registrations.
// Shared by the admin "mark as paid" button and the Stripe webhook so the two
// paths can never drift apart. Returns true when THIS call did the transition
// (it is a no-op on an invoice already paid, which keeps webhooks idempotent).
export async function settleInvoicePaid(
  db: SupabaseClient,
  admin: SupabaseClient,
  invoiceId: string,
  extras: Extras = {},
): Promise<boolean> {
  if (!invoiceId) return false;

  const patch: Record<string, unknown> = {
    status: "paid",
    paid_at: new Date().toISOString(),
  };
  if (extras.pdfUrl) patch.pdf_url = extras.pdfUrl;
  if (extras.stripeRef) patch.stripe_session_id = extras.stripeRef;
  if (extras.paymentMethod) patch.payment_method = extras.paymentMethod;

  // The status filter is what makes this idempotent: a replayed webhook finds
  // no pending/overdue row and returns without re-sending anything.
  const { data: updated } = await db
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId)
    .in("status", ["pending", "overdue"])
    .select("id, camp_registration_id, payment_plan_id")
    .maybeSingle<{
      id: string;
      camp_registration_id: string | null;
      payment_plan_id: string | null;
    }>();

  if (!updated) return false;

  await sendPaymentConfirmation(db, invoiceId);
  await recordIncomeFromInvoice(db, invoiceId);

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
  return true;
}
