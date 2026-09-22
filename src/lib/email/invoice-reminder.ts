import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";
import { buildInvoicePdf } from "@/lib/invoices/pdf";

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
  // Lien direct vers la facture concernée, pas vers la liste: le bouton Payer
  // est sur la facture elle-même.
  const invoicesUrl = `${SITE}/${en ? "en/account/invoices" : "fr/mon-compte/factures"}/${invoiceId}`;

  const subject = en
    ? `Payment reminder — ${invoice.invoice_number}`
    : `Rappel de paiement — ${invoice.invoice_number}`;
  const text = en
    ? `${hello}

A payment is still due:

Invoice: ${invoice.invoice_number}
Amount: ${amount} ${invoice.currency}

Pay online (card or TWINT): ${invoicesUrl}

Thank you,
The Last Line team`
    : `${hello}

Un versement est toujours en attente :

Facture : ${invoice.invoice_number}
Montant : ${amount} ${invoice.currency}

Payer en ligne (carte ou TWINT) : ${invoicesUrl}

Merci,
L'équipe The Last Line`;

  // Best-effort: a PDF that fails to build must not hold back the e-mail.
  const pdf = await buildInvoicePdf(admin, invoiceId).catch(() => null);

  await sendMail({
    to: profile.email,
    subject,
    text,
    kind: "reminder",
    attachments: pdf
      ? [
          {
            filename: pdf.filename,
            content: Buffer.from(pdf.bytes),
            contentType: "application/pdf",
          },
        ]
      : undefined,
  });
}
