import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceDueReminder } from "@/lib/email/invoice-reminder";
import { sendInvoiceDueNotice } from "@/lib/email/invoice-due-notice";

// Runs daily (Vercel Cron) — flags past-due invoices as "overdue" and sends a
// payment reminder for the manual methods (TWINT / QR / bank transfer). Card
// installments are handled by Stripe's own dunning, so we leave them alone.
export const dynamic = "force-dynamic";

// Payers who must act themselves (no automatic retry).
const MANUAL_METHODS = ["twint", "qr_bill", "bank_transfer"];

// Card is normally left to Stripe's own dunning. But when the checkout never
// completed, no subscription exists and nothing will ever be charged: the
// family then hears nothing at all, as happened over five weeks in September.
// Such invoices are fetched too, and filtered below.
const RELANCE_METHODS = [...MANUAL_METHODS, "stripe"];

// How many days ahead the "upcoming payment" notice goes out.
const NOTICE_DAYS = 3;

function dayStr(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

type InvoiceRow = {
  id: string;
  payment_method: string | null;
  // PostgREST returns an embed as an object or an array depending on how it
  // resolves the relation: accept both rather than trust one shape.
  payment_plan:
    | { stripe_subscription_id: string | null }
    | { stripe_subscription_id: string | null }[]
    | null;
};

// A card invoice is ours to chase only when no Stripe subscription charges it.
function needsChasing(inv: InvoiceRow): boolean {
  if (inv.payment_method !== "stripe") return true;
  const plan = Array.isArray(inv.payment_plan)
    ? inv.payment_plan[0]
    : inv.payment_plan;
  return !plan?.stripe_subscription_id;
}

export async function GET(req: NextRequest) {
  // Fail closed: refuse unless the Bearer secret matches (never public).
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const today = dayStr();

  // 1. Upcoming: warn a few days BEFORE the deadline, with a direct link to
  //    the invoice and its Pay button. Without this the first word a family
  //    hears about an installment is an overdue reminder. The window is a range
  //    (not just D-3) so a day the cron did not run is caught up; the e-mail log
  //    makes each notice send at most once.
  const { data: upcoming } = await admin
    .from("invoices")
    .select(
      "id, payment_method, payment_plan:payment_plans(stripe_subscription_id)",
    )
    .eq("status", "pending")
    .in("payment_method", RELANCE_METHODS)
    .gte("due_date", today)
    .lte("due_date", dayStr(NOTICE_DAYS))
    .returns<InvoiceRow[]>();

  let noticed = 0;
  for (const inv of upcoming ?? []) {
    if (!needsChasing(inv)) continue;
    if (await sendInvoiceDueNotice(admin, inv.id)) noticed += 1;
  }

  // 2. Manual, still-unpaid invoices whose due date has passed.
  const { data: due } = await admin
    .from("invoices")
    .select(
      "id, payment_method, payment_plan:payment_plans(stripe_subscription_id)",
    )
    .eq("status", "pending")
    .in("payment_method", RELANCE_METHODS)
    .lt("due_date", today)
    .returns<InvoiceRow[]>();

  let flagged = 0;
  let reminded = 0;
  for (const inv of due ?? []) {
    if (!needsChasing(inv)) continue;
    const { data: updated } = await admin
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", inv.id)
      .eq("status", "pending")
      .select("id");
    if ((updated?.length ?? 0) === 0) continue;
    flagged += 1;
    await sendInvoiceDueReminder(admin, inv.id);
    reminded += 1;
  }

  return NextResponse.json({
    ok: true,
    day: today,
    noticed,
    flagged,
    reminded,
  });
}
