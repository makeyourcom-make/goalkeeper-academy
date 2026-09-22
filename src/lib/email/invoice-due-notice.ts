import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

export const DUE_NOTICE_KIND = "invoice-due";

type InvoiceRow = {
  invoice_number: string;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  profile_id: string;
};

// Has this notice already gone out? The e-mail log is the source of truth, so
// no extra column is needed and a replayed cron never double-sends. Only
// successful sends count: a failed attempt must be retried the next day.
export async function dueNoticeAlreadySent(
  admin: SupabaseClient,
  invoiceNumber: string,
): Promise<boolean> {
  const { data } = await admin
    .from("email_log")
    .select("id")
    .eq("kind", DUE_NOTICE_KIND)
    .eq("status", "sent")
    .ilike("subject", `%${invoiceNumber}%`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// Sent a few days BEFORE the due date, with a direct link to the invoice and
// its Pay button. Until now the first (and only) message about an installment
// was the overdue reminder, which reaches the family once the deadline has
// already passed.
export async function sendInvoiceDueNotice(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<boolean> {
  if (!isEmailConfigured() || !invoiceId) return false;

  const { data: invoice } = await admin
    .from("invoices")
    .select("invoice_number, amount_cents, currency, due_date, profile_id")
    .eq("id", invoiceId)
    .maybeSingle<InvoiceRow>();
  if (!invoice) return false;

  if (await dueNoticeAlreadySent(admin, invoice.invoice_number)) return false;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, first_name, language")
    .eq("id", invoice.profile_id)
    .maybeSingle<{
      email: string;
      first_name: string | null;
      language: string | null;
    }>();
  if (!profile?.email) return false;

  const en = profile.language === "en";
  const amount = (invoice.amount_cents / 100).toFixed(
    invoice.amount_cents % 100 === 0 ? 0 : 2,
  );
  const hello = profile.first_name
    ? en
      ? `Hi ${profile.first_name},`
      : `Bonjour ${profile.first_name},`
    : en
      ? "Hello,"
      : "Bonjour,";
  const url = `${SITE}/${en ? "en/account/invoices" : "fr/mon-compte/factures"}/${invoiceId}`;
  const due = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString(en ? "en-GB" : "fr-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const subject = en
    ? `Upcoming payment — ${invoice.invoice_number}`
    : `Prochain versement — ${invoice.invoice_number}`;

  const text = en
    ? `${hello}

Your next installment is coming up.

Invoice: ${invoice.invoice_number}
Amount: ${amount} ${invoice.currency}${due ? `\nDue: ${due}` : ""}

Pay online (card or TWINT) in one click:
${url}

Nothing to do if you have already paid.

Thank you,
The Last Line team`
    : `${hello}

Votre prochain versement arrive à échéance.

Facture : ${invoice.invoice_number}
Montant : ${amount} ${invoice.currency}${due ? `\nÉchéance : ${due}` : ""}

Payer en ligne (carte ou TWINT), en un clic :
${url}

Si vous avez déjà réglé, ce message ne vous concerne pas.

Merci,
L'équipe The Last Line`;

  await sendMail({
    to: profile.email,
    subject,
    text,
    kind: DUE_NOTICE_KIND,
  });
  return true;
}
