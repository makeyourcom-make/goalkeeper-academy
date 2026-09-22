import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { LOGO_PNG_BASE64 } from "./logo-data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelastline.ch";

const NAVY = rgb(0.043, 0.145, 0.271);
const ORANGE = rgb(0.961, 0.486, 0);
const GREY = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.894, 0.91, 0.933);
const SOFT = rgb(0.969, 0.976, 0.984);
const GREEN = rgb(0.06, 0.72, 0.51);

const A4 = { w: 595.28, h: 841.89 };
const M = 56;

const ISSUER = {
  name: "Association The Last Line",
  tagline: "Goalkeeper Academy",
  ide: "CHE-235.374.703",
  address: "Torgon, commune de Vionnaz (VS)",
  email: "contact@thelastline.ch",
  phone: "+41 78 704 29 16",
  site: "www.thelastline.ch",
};

const TYPE_LABEL: Record<string, string> = {
  subscription: "Abonnement",
  camp: "Stage",
  particulier: "Cours particulier",
  club_contract: "Contrat club",
};
const FORMULA_LABEL: Record<string, string> = {
  single: "Seance decouverte",
  tour1: "Tour 1 (18 seances)",
  tour2: "Tour 2 (18 seances)",
  season: "Saison complete (36 seances)",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payee",
  overdue: "En retard",
  cancelled: "Annulee",
  refunded: "Remboursee",
};

// The standard PDF fonts encode WinAnsi only, and pdf-lib throws on anything
// outside it. A single curly quote in a keeper's name would break the whole
// document, so every string is folded to a safe subset first.
function wa(input: string): string {
  return input
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "");
}

function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function frDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Kid = { first_name: string; last_name: string } | null;
type Reg = { formula: string; children: Kid };

type InvoiceRow = {
  id: string;
  invoice_number: string;
  profile_id: string;
  type: string;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  issued_at: string;
  installment_number: number | null;
  registrations: Reg[];
  payment_plan: {
    installments_total: number;
    registrations: Reg[];
  } | null;
  camp_registration: {
    children: Kid;
    camps: { title: string } | null;
  } | null;
};

const SELECT =
  "id, invoice_number, profile_id, type, amount_cents, currency, status, due_date, paid_at, issued_at, installment_number, registrations(formula, children(first_name, last_name)), payment_plan:payment_plans(installments_total, registrations(formula, children(first_name, last_name))), camp_registration:camp_registrations(children(first_name, last_name), camps(title))";

// Builds the invoice as a real PDF. Runs with whichever client is passed, so
// RLS still scopes a parent to their own invoices when called from their space.
export async function buildInvoicePdf(
  db: SupabaseClient,
  invoiceId: string,
): Promise<{ bytes: Uint8Array; filename: string } | null> {
  if (!invoiceId) return null;

  const { data: invoice } = await db
    .from("invoices")
    .select(SELECT)
    .eq("id", invoiceId)
    .maybeSingle<InvoiceRow>();
  if (!invoice) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("first_name, last_name, email, phone")
    .eq("id", invoice.profile_id)
    .maybeSingle<{
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
    }>();

  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${invoice.invoice_number}`);
  doc.setAuthor(ISSUER.name);
  doc.setCreator(ISSUER.name);

  const page = doc.addPage([A4.w, A4.h]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  type Opts = {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
  };

  const text = (s: string, x: number, y: number, o: Opts = {}) =>
    page.drawText(wa(s), {
      x,
      y,
      size: o.size ?? 9.5,
      font: o.font ?? font,
      color: o.color ?? NAVY,
    });

  const rightText = (s: string, right: number, y: number, o: Opts = {}) => {
    const f = o.font ?? font;
    const size = o.size ?? 9.5;
    const clean = wa(s);
    text(clean, right - f.widthOfTextAtSize(clean, size), y, o);
  };

  let y = A4.h - M;

  // Header: logo on the left, invoice identity on the right.
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const logoW = 132;
  const logoH = (logo.height / logo.width) * logoW;
  page.drawImage(logo, { x: M, y: y - logoH, width: logoW, height: logoH });

  rightText("FACTURE", A4.w - M, y - 14, { size: 22, font: bold });
  rightText(invoice.invoice_number, A4.w - M, y - 32, {
    size: 11,
    font: bold,
    color: ORANGE,
  });
  rightText(
    `${TYPE_LABEL[invoice.type] ?? invoice.type} - ${STATUS_LABEL[invoice.status] ?? invoice.status}`,
    A4.w - M,
    y - 46,
    { size: 8.5, color: GREY },
  );

  y -= Math.max(logoH, 62) + 26;

  // Issuer and recipient, side by side.
  const colR = A4.w / 2 + 6;
  text("EMETTEUR", M, y, { size: 7.5, font: bold, color: GREY });
  text("FACTURE A", colR, y, { size: 7.5, font: bold, color: GREY });
  y -= 14;

  const issuerLines = [
    ISSUER.name,
    ISSUER.tagline,
    ISSUER.address,
    `IDE ${ISSUER.ide}`,
    ISSUER.email,
    ISSUER.phone,
  ];
  const clientName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    profile?.email ||
    "-";
  const clientLines = [clientName, profile?.email ?? "", profile?.phone ?? ""];

  let yl = y;
  for (const [i, line] of issuerLines.entries()) {
    text(line, M, yl, { size: 9, font: i === 0 ? bold : font });
    yl -= 12.5;
  }
  let yr = y;
  for (const [i, line] of clientLines.entries()) {
    if (!line) continue;
    text(line, colR, yr, { size: 9, font: i === 0 ? bold : font });
    yr -= 12.5;
  }
  y = Math.min(yl, yr) - 18;

  // Dates band.
  page.drawRectangle({
    x: M,
    y: y - 34,
    width: A4.w - 2 * M,
    height: 34,
    color: SOFT,
  });
  const dates: [string, string][] = [
    ["Date d'emission", frDate(invoice.issued_at)],
    ["Echeance", frDate(invoice.due_date)],
  ];
  if (invoice.paid_at) dates.push(["Payee le", frDate(invoice.paid_at)]);
  dates.forEach(([label, value], i) => {
    const x = M + 16 + i * ((A4.w - 2 * M - 32) / 3);
    text(label, x, y - 13, { size: 7.5, color: GREY });
    text(value, x, y - 26, { size: 9.5, font: bold });
  });
  y -= 58;

  // Line items.
  text("DESIGNATION", M, y, { size: 7.5, font: bold, color: GREY });
  rightText("MONTANT", A4.w - M, y, { size: 7.5, font: bold, color: GREY });
  y -= 8;
  page.drawLine({
    start: { x: M, y },
    end: { x: A4.w - M, y },
    thickness: 1,
    color: LINE,
  });
  y -= 18;

  // The keeper and formula live on the registrations, either straight on the
  // invoice or through its payment plan when this is one installment of many.
  const regs =
    invoice.registrations?.length > 0
      ? invoice.registrations
      : (invoice.payment_plan?.registrations ?? []);

  const lines: string[] = [];
  if (invoice.camp_registration) {
    const kid = invoice.camp_registration.children;
    lines.push(
      `${invoice.camp_registration.camps?.title ?? "Stage"}${
        kid ? ` - ${kid.first_name} ${kid.last_name}` : ""
      }`,
    );
  }
  for (const r of regs) {
    const kid = r.children;
    lines.push(
      `${FORMULA_LABEL[r.formula] ?? r.formula}${
        kid ? ` - ${kid.first_name} ${kid.last_name}` : ""
      }`,
    );
  }
  if (lines.length === 0) lines.push(TYPE_LABEL[invoice.type] ?? "Prestation");

  const amountY = y;
  for (const line of lines) {
    text(line, M, y, { size: 10 });
    y -= 15;
  }

  const installments = invoice.payment_plan?.installments_total ?? 1;
  if (invoice.installment_number && installments > 1) {
    text(`Versement ${invoice.installment_number} sur ${installments}`, M, y, {
      size: 8.5,
      color: GREY,
    });
    y -= 15;
  }

  rightText(money(invoice.amount_cents, invoice.currency), A4.w - M, amountY, {
    size: 10,
  });
  y -= 6;

  page.drawLine({
    start: { x: M, y },
    end: { x: A4.w - M, y },
    thickness: 1,
    color: LINE,
  });
  y -= 24;

  text("TOTAL", M, y, { size: 11, font: bold });
  rightText(money(invoice.amount_cents, invoice.currency), A4.w - M, y, {
    size: 14,
    font: bold,
    color: ORANGE,
  });
  y -= 16;
  text("Association sans but lucratif, non assujettie a la TVA.", M, y, {
    size: 7.5,
    color: GREY,
  });
  y -= 36;

  // How to pay, or the receipt stamp once settled.
  if (invoice.status === "pending" || invoice.status === "overdue") {
    page.drawRectangle({
      x: M,
      y: y - 54,
      width: A4.w - 2 * M,
      height: 54,
      color: SOFT,
    });
    page.drawRectangle({
      x: M,
      y: y - 54,
      width: 3,
      height: 54,
      color: ORANGE,
    });
    text("COMMENT PAYER", M + 16, y - 17, {
      size: 7.5,
      font: bold,
      color: ORANGE,
    });
    text("Paiement en ligne par carte bancaire ou TWINT :", M + 16, y - 31, {
      size: 9,
    });
    text(`${SITE}/fr/mon-compte/factures/${invoice.id}`, M + 16, y - 44, {
      size: 8.5,
      color: GREY,
    });
  } else if (invoice.status === "paid") {
    text("FACTURE ACQUITTEE - MERCI", M, y - 14, {
      size: 11,
      font: bold,
      color: GREEN,
    });
  }

  // Footer.
  page.drawLine({
    start: { x: M, y: M + 26 },
    end: { x: A4.w - M, y: M + 26 },
    thickness: 1,
    color: LINE,
  });
  text(`${ISSUER.name} - IDE ${ISSUER.ide} - ${ISSUER.address}`, M, M + 12, {
    size: 7.5,
    color: GREY,
  });
  rightText(`${ISSUER.email} - ${ISSUER.site}`, A4.w - M, M + 12, {
    size: 7.5,
    color: GREY,
  });

  return {
    bytes: await doc.save(),
    filename: `${invoice.invoice_number}.pdf`,
  };
}
