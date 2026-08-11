import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/invoices/print-button";
import { getAccountContext } from "@/lib/account/view-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { creditorConfigured } from "@/lib/invoices/qr-bill";
import { BUSINESS } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

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
  payment_method: string | null;
  installment_number: number | null;
  registrations: {
    formula: string;
    children: { first_name: string | null; last_name: string | null } | null;
  }[];
  camp_registration: {
    children: { first_name: string | null; last_name: string | null } | null;
    camps: { title: string } | null;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.invoices" });
  return { title: t("receiptTitle"), robots: { index: false, follow: false } };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.invoices");

  const ctx = await getAccountContext();
  if (!ctx) redirect(`/${locale}/connexion`);

  const SELECT =
    "id, invoice_number, profile_id, type, amount_cents, currency, status, due_date, paid_at, issued_at, payment_method, installment_number, registrations(formula, children(first_name, last_name)), camp_registration:camp_registrations(children(first_name, last_name), camps(title))";

  let { data: invoice } = await ctx.db
    .from("invoices")
    .select(SELECT)
    .eq("id", id)
    .eq("profile_id", ctx.userId)
    .maybeSingle<InvoiceRow>();

  // Admins may open any client's invoice (to print it or chase a payment).
  // The invoices RLS policy itself only returns the row to admins, so this
  // fallback grants nothing to regular users.
  if (!invoice) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (me?.role === "admin") {
        const res = await supabase
          .from("invoices")
          .select(SELECT)
          .eq("id", id)
          .maybeSingle<InvoiceRow>();
        invoice = res.data;
      }
    }
  }

  if (!invoice) redirect(`/${locale}/mon-compte/factures`);

  const { data: payer } = await ctx.db
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", invoice.profile_id)
    .maybeSingle<{
      first_name: string | null;
      last_name: string | null;
      email: string;
    }>();

  const money = (cents: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
      style: "currency",
      currency: invoice.currency || "CHF",
    }).format(cents / 100);
  const fmtDate = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale === "en" ? "en-CH" : "fr-CH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(iso))
      : "—";

  // Human line description (camp title, or formula + child names).
  const lines: string[] = [];
  if (invoice.camp_registration?.camps?.title) {
    const child = invoice.camp_registration.children;
    const who = `${child?.first_name ?? ""} ${child?.last_name ?? ""}`.trim();
    lines.push(
      `${invoice.camp_registration.camps.title}${who ? ` — ${who}` : ""}`,
    );
  }
  for (const r of invoice.registrations ?? []) {
    const who =
      `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim();
    lines.push(
      `${t(`type.${invoice.type}`)}${who ? ` — ${who}` : ""}${
        invoice.installment_number
          ? ` · ${t("installmentShort", { n: invoice.installment_number })}`
          : ""
      }`,
    );
  }
  if (lines.length === 0) lines.push(t(`type.${invoice.type}`));

  const payerName =
    `${payer?.first_name ?? ""} ${payer?.last_name ?? ""}`.trim();

  // Payment details printed on the document itself, so a family can pay straight
  // from the PDF. Shown while the invoice is still open (pending OR overdue) and
  // settled by transfer / QR-bill — card and TWINT are paid online instead.
  const isOpen = invoice.status === "pending" || invoice.status === "overdue";
  const byTransfer =
    invoice.payment_method === "qr_bill" ||
    invoice.payment_method === "bank_transfer";
  const showPaymentBlock = isOpen && byTransfer && creditorConfigured();
  const ibanPretty = (process.env.CREDITOR_IBAN ?? "")
    .replace(/\s/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
  const creditorName = process.env.CREDITOR_NAME ?? BUSINESS.legal.entity;

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container flex max-w-3xl flex-col gap-6">
        {/* Actions (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button asChild variant="ghost">
            <Link href="/mon-compte/factures">{t("backToInvoices")}</Link>
          </Button>
          <div className="flex gap-2">
            {(invoice.status === "pending" || invoice.status === "overdue") &&
              invoice.payment_method === "qr_bill" && (
                <Button asChild variant="outline">
                  <Link
                    href={{
                      pathname: "/mon-compte/factures/[id]/qr",
                      params: { id: invoice.id },
                    }}
                  >
                    {t("qrBill")}
                  </Link>
                </Button>
              )}
            <PrintButton label={t("downloadPdf")} />
          </div>
        </div>

        {/* The document */}
        <div className="rounded-2xl border border-grey-100 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="flex flex-col gap-1 border-b border-grey-100 pb-6">
            <p className="font-anton text-2xl uppercase text-navy">
              {BUSINESS.name}
            </p>
            <p className="text-sm text-grey-500">{BUSINESS.legal.entity}</p>
            <p className="text-sm text-grey-500">
              {t("seat")} : {BUSINESS.legal.seat}
            </p>
            <p className="text-sm text-grey-500">
              IDE : {BUSINESS.legal.ide} · {BUSINESS.email}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-grey-500">
                {t("billedTo")}
              </p>
              <p className="font-medium text-navy">{payerName || "—"}</p>
              <p className="text-sm text-grey-500">{payer?.email}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-navy">
                {invoice.invoice_number}
              </p>
              <p className="text-sm text-grey-500">
                {t("issuedOn")} {fmtDate(invoice.issued_at)}
              </p>
              <Badge
                variant={invoice.status === "paid" ? "orange" : "muted"}
                className="mt-1"
              >
                {t(`status.${invoice.status}`)}
              </Badge>
            </div>
          </div>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-grey-100 text-left text-xs uppercase tracking-wide text-grey-500">
                <th className="pb-2 font-medium">{t("descriptionCol")}</th>
                <th className="pb-2 text-right font-medium">
                  {t("amountCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b border-grey-100">
                  <td className="py-3 text-grey-700">{line}</td>
                  <td className="py-3 text-right font-medium text-navy">
                    {i === 0 ? money(invoice.amount_cents) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-navy px-5 py-4 text-white">
            <span className="text-sm uppercase tracking-wide opacity-80">
              {t("total")}
            </span>
            <span className="font-anton text-2xl">
              {money(invoice.amount_cents)}
            </span>
          </div>

          <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            {invoice.payment_method && (
              <div className="flex justify-between gap-3 sm:justify-start sm:gap-2">
                <dt className="text-grey-500">{t("paymentMethod")}</dt>
                <dd className="font-medium text-navy">
                  {t(`methods.${invoice.payment_method}`)}
                </dd>
              </div>
            )}
            {invoice.paid_at ? (
              <div className="flex justify-between gap-3 sm:justify-start sm:gap-2">
                <dt className="text-grey-500">{t("paidOn")}</dt>
                <dd className="font-medium text-navy">
                  {fmtDate(invoice.paid_at)}
                </dd>
              </div>
            ) : (
              invoice.due_date && (
                <div className="flex justify-between gap-3 sm:justify-start sm:gap-2">
                  <dt className="text-grey-500">{t("dueOn")}</dt>
                  <dd className="font-medium text-navy">
                    {fmtDate(invoice.due_date)}
                  </dd>
                </div>
              )
            )}
          </dl>

          {showPaymentBlock && (
            <div className="mt-6 rounded-xl border border-grey-100 bg-grey-100/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                {t("payTitle")}
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-grey-500">{t("payBeneficiary")}</dt>
                  <dd className="font-medium text-navy">{creditorName}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-grey-500">IBAN</dt>
                  <dd className="font-mono font-medium text-navy">
                    {ibanPretty}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-grey-500">{t("payReference")}</dt>
                  <dd className="font-mono font-medium text-navy">
                    {invoice.invoice_number}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-grey-500">{t("payAmount")}</dt>
                  <dd className="font-medium text-navy">
                    {money(invoice.amount_cents)}
                  </dd>
                </div>
              </dl>
              {invoice.payment_method === "qr_bill" && (
                <p className="mt-3 text-xs text-grey-500 print:hidden">
                  {t("payQrHint")}
                </p>
              )}
            </div>
          )}

          <p className="mt-8 border-t border-grey-100 pt-4 text-xs text-grey-500">
            {t("receiptFooter")}
          </p>
        </div>
      </div>
    </section>
  );
}
