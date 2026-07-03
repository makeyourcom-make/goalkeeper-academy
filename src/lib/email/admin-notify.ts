import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

const METHOD_LABEL: Record<string, string> = {
  card: "Carte",
  twint: "TWINT",
  qr_bill: "QR-facture",
};
const CADENCE_LABEL: Record<string, string> = {
  annual: "annuel",
  semiannual: "semestriel",
  quarterly: "trimestriel",
  monthly: "mensuel",
};

// Business inbox that receives admin notifications. Decoupled from the admin's
// login email (which is a personal/agency address) — set ADMIN_EMAIL on Vercel
// to override, or a comma-separated list for several recipients.
const NOTIFY_TO = (process.env.ADMIN_EMAIL || "contact@thelastline.ch")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Alerts the admin when a new registration is submitted.
export async function notifyAdminNewRegistration(
  _admin: SupabaseClient,
  opts: {
    invoiceNumber: string;
    total: number;
    method: string;
    cadence: string;
    keeperNames: string[];
    contactEmail: string;
  },
): Promise<void> {
  if (!isEmailConfigured()) return;
  const to = NOTIFY_TO;
  if (to.length === 0) return;

  const keepers = opts.keeperNames.filter(Boolean).join(", ") || "—";
  const text = `Nouvelle inscription sur The Last Line.

Contact : ${opts.contactEmail}
Gardien(s) : ${keepers}
Montant : ${opts.total} CHF
Paiement : ${METHOD_LABEL[opts.method] ?? opts.method} (${CADENCE_LABEL[opts.cadence] ?? opts.cadence})
Facture : ${opts.invoiceNumber}

Détails : ${SITE}/fr/admin/parents`;

  await sendMail({
    to: to.join(", "),
    subject: `Nouvelle inscription — ${keepers}`,
    text,
  });
}

// Alerts the admin when a payment is received (Stripe card/TWINT).
export async function notifyAdminPayment(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  if (!isEmailConfigured() || !invoiceId) return;
  const to = NOTIFY_TO;
  if (to.length === 0) return;

  const { data: invoice } = await admin
    .from("invoices")
    .select(
      "invoice_number, amount_cents, currency, payment_method, profile_id",
    )
    .eq("id", invoiceId)
    .maybeSingle<{
      invoice_number: string;
      amount_cents: number;
      currency: string;
      payment_method: string | null;
      profile_id: string;
    }>();
  if (!invoice) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", invoice.profile_id)
    .maybeSingle<{
      email: string;
      first_name: string | null;
      last_name: string | null;
    }>();

  const who =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    profile?.email ||
    "—";
  const amount = (invoice.amount_cents / 100).toFixed(
    invoice.amount_cents % 100 === 0 ? 0 : 2,
  );

  const text = `Paiement reçu sur The Last Line.

De : ${who}${profile?.email ? ` (${profile.email})` : ""}
Montant : ${amount} ${invoice.currency}
Moyen : ${invoice.payment_method ?? "—"}
Facture : ${invoice.invoice_number}

Factures : ${SITE}/fr/admin/factures`;

  await sendMail({
    to: to.join(", "),
    subject: `Paiement reçu — ${amount} ${invoice.currency}`,
    text,
  });
}
