import { isEmailConfigured, sendMail } from "@/lib/email/smtp";
import { paymentInstructions } from "@/lib/invoices/qr-bill";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

const METHOD_LABEL: Record<string, string> = {
  card: "Carte",
  twint: "TWINT",
  qr_bill: "Virement / QR-facture",
};
const CADENCE_LABEL: Record<string, string> = {
  annual: "en une fois",
  semiannual: "en 2 versements (semestriels)",
  quarterly: "en 4 versements (trimestriels)",
  monthly: "en 10 versements (mensuels)",
};

function money(cents: number): string {
  return `${(cents / 100).toFixed(2)} CHF`;
}

type Opts = {
  to: string;
  keeperNames: string[];
  total: number; // CHF
  method: string;
  cadence: string;
  installments: number;
  invoiceNumber: string;
  installmentCents: number;
  dueDate?: string | null;
};

// Sent to the family right after the registration wizard is submitted. Without
// it a QR-bill subscriber never learns how or where to pay, and their invoice
// silently goes overdue.
export async function sendRegistrationConfirmation(opts: Opts): Promise<void> {
  if (!isEmailConfigured() || !opts.to) return;

  const keepers = opts.keeperNames.filter(Boolean).join(", ") || "—";
  const cadence = CADENCE_LABEL[opts.cadence] ?? opts.cadence;
  const method = METHOD_LABEL[opts.method] ?? opts.method;
  const online = opts.method === "card" || opts.method === "twint";

  const firstPart =
    opts.installments > 1
      ? `Premier versement (${opts.invoiceNumber}) : ${money(opts.installmentCents)}`
      : `Facture ${opts.invoiceNumber} : ${money(opts.installmentCents)}`;

  const howToPay = online
    ? `Votre paiement s'effectue en ligne (${method}). Si le paiement n'a pas abouti, vous pouvez le relancer depuis votre espace :
${SITE}/fr/mon-compte/factures`
    : `${paymentInstructions(opts.invoiceNumber, opts.installmentCents) ?? "Nous vous transmettons les coordonnées de paiement séparément."}

Vous retrouvez votre facture (et son QR, si vous préférez scanner) dans votre espace :
${SITE}/fr/mon-compte/factures`;

  const text = `Bonjour,

Merci pour votre inscription à The Last Line — Goalkeeper Academy.

RÉCAPITULATIF
Gardien(s) : ${keepers}
Montant total : ${opts.total} CHF
Paiement : ${method}, ${cadence}
${firstPart}${opts.dueDate ? `\nÉchéance : ${opts.dueDate}` : ""}

${howToPay}

Une question ? Répondez simplement à cet e-mail.

À bientôt sur le terrain,
Gianluca & Arthur
The Last Line — Goalkeeper Academy`;

  await sendMail({
    to: opts.to,
    subject: `Votre inscription — ${opts.invoiceNumber}`,
    text,
    kind: "registration",
  });
}
