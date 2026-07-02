import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

const FORMULA_FR: Record<string, string> = {
  single: "Séance découverte",
  tour1: "Tour 1",
  tour2: "Tour 2",
  season: "Saison complète",
};
const FORMULA_EN: Record<string, string> = {
  single: "Discovery session",
  tour1: "Tour 1",
  tour2: "Tour 2",
  season: "Full season",
};

type InvoiceRow = {
  invoice_number: string;
  amount_cents: number;
  currency: string;
  installment_number: number | null;
  payment_plan_id: string | null;
  profile_id: string;
};
type RegRow = {
  formula: string;
  children: { first_name: string | null; last_name: string | null } | null;
};

// Emails a payment receipt to the payer after an invoice is marked paid.
// Best-effort: silently no-ops when SMTP isn't configured or data is missing.
export async function sendPaymentConfirmation(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  if (!isEmailConfigured() || !invoiceId) return;

  const { data: invoice } = await admin
    .from("invoices")
    .select(
      "invoice_number, amount_cents, currency, installment_number, payment_plan_id, profile_id",
    )
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

  let installmentsTotal = 1;
  let regs: RegRow[] = [];
  if (invoice.payment_plan_id) {
    const [{ data: plan }, { data: r }] = await Promise.all([
      admin
        .from("payment_plans")
        .select("installments_total")
        .eq("id", invoice.payment_plan_id)
        .maybeSingle<{ installments_total: number }>(),
      admin
        .from("registrations")
        .select("formula, children(first_name, last_name)")
        .eq("payment_plan_id", invoice.payment_plan_id)
        .returns<RegRow[]>(),
    ]);
    installmentsTotal = plan?.installments_total ?? 1;
    regs = r ?? [];
  }

  const en = profile.language === "en";
  const FORMULA = en ? FORMULA_EN : FORMULA_FR;
  const amount = (invoice.amount_cents / 100).toFixed(
    invoice.amount_cents % 100 === 0 ? 0 : 2,
  );
  const details = regs
    .map((r) => {
      const name =
        `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim();
      return `- ${FORMULA[r.formula] ?? r.formula}${name ? ` — ${name}` : ""}`;
    })
    .join("\n");

  const installmentLine =
    installmentsTotal > 1 && invoice.installment_number
      ? en
        ? `Instalment: ${invoice.installment_number}/${installmentsTotal}\n`
        : `Versement : ${invoice.installment_number}/${installmentsTotal}\n`
      : "";

  const hello = profile.first_name
    ? en
      ? `Hi ${profile.first_name},`
      : `Bonjour ${profile.first_name},`
    : en
      ? "Hello,"
      : "Bonjour,";
  const invoicesUrl = `${SITE}/${en ? "en/account/invoices" : "fr/mon-compte/factures"}`;

  const subject = en
    ? "Payment confirmed — The Last Line"
    : "Paiement confirmé — The Last Line";

  const text = en
    ? `${hello}

We confirm we received your payment.

Invoice: ${invoice.invoice_number}
Amount: ${amount} ${invoice.currency}
${installmentLine}${details ? `\nDetails:\n${details}\n` : ""}
Your invoices: ${invoicesUrl}

See you on the pitch!
The Last Line team`
    : `${hello}

Nous confirmons la bonne réception de votre paiement.

Facture : ${invoice.invoice_number}
Montant : ${amount} ${invoice.currency}
${installmentLine}${details ? `\nDétail :\n${details}\n` : ""}
Vos factures : ${invoicesUrl}

À très vite sur le terrain !
L'équipe The Last Line`;

  await sendMail({ to: profile.email, subject, text });
}
