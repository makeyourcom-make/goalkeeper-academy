import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

type InvoiceRow = {
  invoice_number: string;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  profile_id: string;
};

// Reminder that an installment (TWINT / QR) invoice is due / overdue.
export async function sendInvoiceDueReminder(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  if (!isEmailConfigured() || !invoiceId) return;

  const { data: invoice } = await admin
    .from("invoices")
    .select("invoice_number, amount_cents, currency, due_date, profile_id")
    .eq("id", invoiceId)
    .maybeSingle<InvoiceRow>();
  if (!invoice) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, first_name, language")
    .eq("id", invoice.profile_id)
    .maybeSingle<{
      email: string;
      first_name: string | null;
      language: string | null;
    }>();
  if (!profile?.email) return;

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
  const invoicesUrl = `${SITE}/${en ? "en/account/invoices" : "fr/mon-compte/factures"}`;

  const subject = en
    ? `Payment reminder — ${invoice.invoice_number}`
    : `Rappel de paiement — ${invoice.invoice_number}`;
  const text = en
    ? `${hello}

A payment is still due:

Invoice: ${invoice.invoice_number}
Amount: ${amount} ${invoice.currency}

Please settle it from My invoices: ${invoicesUrl}

Thank you,
The Last Line team`
    : `${hello}

Un versement est toujours en attente :

Facture : ${invoice.invoice_number}
Montant : ${amount} ${invoice.currency}

Merci de le régler depuis Mes factures : ${invoicesUrl}

Merci,
L'équipe The Last Line`;

  await sendMail({ to: profile.email, subject, text });
}
