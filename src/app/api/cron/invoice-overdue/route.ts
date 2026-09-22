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
};

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
    .select("id, payment_method")
    .eq("status", "pending")
    .in("payment_method", MANUAL_METHODS)
    .gte("due_date", today)
    .lte("due_date", dayStr(NOTICE_DAYS))
    .returns<InvoiceRow[]>();

  let noticed = 0;
  for (const inv of upcoming ?? []) {
    if (await sendInvoiceDueNotice(admin, inv.id)) noticed += 1;
  }

  // 2. Manual, still-unpaid invoices whose due date has passed.
  const { data: due } = await admin
    .from("invoices")
    .select("id, payment_method")
    .eq("status", "pending")
    .in("payment_method", MANUAL_METHODS)
    .lt("due_date", today)
    .returns<InvoiceRow[]>();

  let flagged = 0;
  let reminded = 0;
  for (const inv of due ?? []) {
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
