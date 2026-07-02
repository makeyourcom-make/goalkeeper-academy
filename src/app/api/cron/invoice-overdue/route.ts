import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendInvoiceDueReminder } from "@/lib/email/invoice-reminder";

// Runs daily (Vercel Cron) — flags past-due invoices as "overdue" and sends a
// payment reminder for the manual methods (TWINT / QR / bank transfer). Card
// installments are handled by Stripe's own dunning, so we leave them alone.
export const dynamic = "force-dynamic";

// Payers who must act themselves (no automatic retry).
const MANUAL_METHODS = ["twint", "qr_bill", "bank_transfer"];

function todayStr(): string {
  const d = new Date();
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
  const today = todayStr();

  // Manual, still-unpaid invoices whose due date has passed.
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

  return NextResponse.json({ ok: true, day: today, flagged, reminded });
}
