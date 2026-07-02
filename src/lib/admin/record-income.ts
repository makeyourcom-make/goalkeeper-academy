import type { SupabaseClient } from "@supabase/supabase-js";

type InvoiceRow = {
  invoice_number: string;
  amount_cents: number;
  type: string;
  paid_at: string | null;
};

// Mirror a paid invoice as an income line in the accounting ledger so revenue
// from Stripe/manual payments shows up automatically. Idempotent via
// transactions.invoice_id. Best-effort: never breaks the payment flow (e.g.
// if the migration adding invoice_id has not been applied yet).
export async function recordIncomeFromInvoice(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  if (!invoiceId) return;
  try {
    const { data: existing } = await admin
      .from("transactions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (existing) return;

    const { data: inv } = await admin
      .from("invoices")
      .select("invoice_number, amount_cents, type, paid_at")
      .eq("id", invoiceId)
      .maybeSingle<InvoiceRow>();
    if (!inv) return;

    const category =
      inv.type === "camp"
        ? "stage"
        : inv.type === "club_contract"
          ? "club"
          : "cotisation";

    await admin.from("transactions").insert({
      kind: "income",
      category,
      label: inv.invoice_number,
      amount: inv.amount_cents / 100,
      occurred_on: (inv.paid_at ?? new Date().toISOString()).slice(0, 10),
      invoice_id: invoiceId,
    });
  } catch {
    // invoice_id column not present yet (migration pending) — ignore.
  }
}
