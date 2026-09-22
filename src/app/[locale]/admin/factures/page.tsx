import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Eye, FileDown, Undo2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  markInvoicePaid,
  refundInvoice,
  cancelInvoice,
} from "@/lib/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  type: "subscription" | "camp" | "particulier" | "club_contract";
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  issued_at: string;
  due_date: string | null;
  installment_number: number | null;
  payment_method: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  registrations: {
    formula: string;
    children: { first_name: string; last_name: string } | null;
  }[];
  payment_plan: {
    method: "card" | "twint" | "qr_bill";
    cadence: "annual" | "semiannual" | "quarterly" | "monthly";
    installments_total: number;
    registrations: {
      audience: "youth" | "adult";
      formula: string;
      children: { first_name: string; last_name: string } | null;
    }[];
  } | null;
  camp_registration: {
    children: { first_name: string; last_name: string } | null;
    camps: { title: string } | null;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.invoices" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const STATUSES: InvoiceRow["status"][] = [
  "pending",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
];
const TYPES: InvoiceRow["type"][] = [
  "subscription",
  "camp",
  "particulier",
  "club_contract",
];

const STATUS_STYLES: Record<InvoiceRow["status"], string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  overdue: "bg-error/15 text-error",
  cancelled: "bg-grey-100 text-grey-500",
  refunded: "bg-navy/10 text-navy",
};

export default async function AdminInvoicesPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { q = "", status = "", type = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.invoices");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, type, amount_cents, currency, status, issued_at, due_date, installment_number, payment_method, profile:profiles!invoices_profile_id_fkey(first_name, last_name, email), registrations(formula, children(first_name, last_name)), payment_plan:payment_plans(method, cadence, installments_total, registrations(audience, formula, children(first_name, last_name))), camp_registration:camp_registrations(children(first_name, last_name), camps(title))",
    )
    .order("issued_at", { ascending: false });
  if (STATUSES.includes(status as InvoiceRow["status"])) {
    query = query.eq("status", status);
  }
  if (TYPES.includes(type as InvoiceRow["type"])) {
    query = query.eq("type", type);
  }
  const { data: invoices } = await query.returns<InvoiceRow[]>();

  const all = invoices ?? [];
  const needle = q.trim().toLowerCase();
  const list = needle
    ? all.filter((i) => {
        const client = `${i.profile?.first_name ?? ""} ${i.profile?.last_name ?? ""} ${i.profile?.email ?? ""}`;
        return (
          i.invoice_number.toLowerCase().includes(needle) ||
          client.toLowerCase().includes(needle)
        );
      })
    : all;
  const filtered = Boolean(needle || status || type);
  const moneyFmt = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
      style: "currency",
      currency,
    }).format(cents / 100);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">
          {t("count", { count: list.length })}
        </p>
      </div>

      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-grey-100 bg-white p-4 shadow-sm"
      >
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="q"
            className="block text-xs font-medium uppercase tracking-wide text-grey-500"
          >
            {t("filters.search")}
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("filters.searchPlaceholder")}
            className="border-grey-200 mt-1 w-full rounded-lg border px-3 py-2 text-sm text-navy focus-visible:ring-orange"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-xs font-medium uppercase tracking-wide text-grey-500"
          >
            {t("table.status")}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="border-grey-200 mt-1 rounded-lg border px-3 py-2 text-sm text-navy"
          >
            <option value="">{t("filters.all")}</option>
            {STATUSES.map((v) => (
              <option key={v} value={v}>
                {t(`statuses.${v}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="type"
            className="block text-xs font-medium uppercase tracking-wide text-grey-500"
          >
            {t("table.type")}
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="border-grey-200 mt-1 rounded-lg border px-3 py-2 text-sm text-navy"
          >
            <option value="">{t("filters.all")}</option>
            {TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`types.${v}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          {t("filters.apply")}
        </Button>
        {filtered && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/factures">{t("filters.reset")}</Link>
          </Button>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.number")}</th>
                <th className="px-4 py-3 font-medium">{t("table.client")}</th>
                <th className="px-4 py-3 font-medium">{t("table.type")}</th>
                <th className="px-4 py-3 font-medium">{t("table.amount")}</th>
                <th className="px-4 py-3 font-medium">{t("table.payment")}</th>
                <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                <th className="px-4 py-3 font-medium">{t("table.issued")}</th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                list.map((invoice) => {
                  const plan = invoice.payment_plan;
                  const planRegs = plan?.registrations ?? [];
                  const kidNames = [
                    ...new Set(
                      (planRegs.length
                        ? planRegs.map((r) =>
                            `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim(),
                          )
                        : (invoice.registrations ?? []).map((r) =>
                            `${r.children?.first_name ?? ""} ${r.children?.last_name ?? ""}`.trim(),
                          )
                      ).filter(Boolean),
                    ),
                  ];
                  const abo = [
                    ...new Set(
                      planRegs.map(
                        (r) =>
                          `${t(`formulas.${r.formula}`)} · ${t(`audiences.${r.audience}`)}`,
                      ),
                    ),
                  ];
                  const method = invoice.payment_method ?? plan?.method ?? null;
                  return (
                    <tr key={invoice.id} className="hover:bg-grey-100/40">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-navy">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        <div>
                          {invoice.profile
                            ? `${invoice.profile.first_name ?? ""} ${invoice.profile.last_name ?? ""}`.trim() ||
                              invoice.profile.email
                            : "—"}
                        </div>
                        {kidNames.length > 0 && (
                          <div className="mt-0.5 text-xs text-grey-500">
                            {kidNames.join(", ")}
                          </div>
                        )}
                        {invoice.camp_registration?.children && (
                          <div className="mt-0.5 text-xs text-grey-500">
                            {`${invoice.camp_registration.children.first_name ?? ""} ${invoice.camp_registration.children.last_name ?? ""}`.trim()}
                            {invoice.camp_registration.camps?.title
                              ? ` · ${invoice.camp_registration.camps.title}`
                              : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        <div>{t(`types.${invoice.type}`)}</div>
                        {abo.length > 0 && (
                          <div className="mt-0.5 text-xs text-grey-500">
                            {abo.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        {moneyFmt(invoice.amount_cents, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        {method ? (
                          <div className="text-navy">
                            {t(`methods.${method}`)}
                          </div>
                        ) : (
                          <span className="text-grey-400">—</span>
                        )}
                        {plan && (
                          <div className="mt-0.5 text-xs text-grey-500">
                            {plan.installments_total > 1
                              ? t("split", {
                                  count: plan.installments_total,
                                  cadence: t(`cadences.${plan.cadence}`),
                                })
                              : t("oneOff")}
                          </div>
                        )}
                        {plan &&
                          plan.installments_total > 1 &&
                          invoice.installment_number && (
                            <div className="text-grey-400 text-xs">
                              {t("installment", {
                                n: invoice.installment_number,
                                total: plan.installments_total,
                              })}
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                        >
                          {t(`statuses.${invoice.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-grey-500">
                        <div>{dateFmt.format(new Date(invoice.issued_at))}</div>
                        {invoice.due_date && (
                          <div className="text-grey-400 mt-0.5 text-xs">
                            {t("due", {
                              date: dateFmt.format(new Date(invoice.due_date)),
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={`/api/invoices/${invoice.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileDown className="mr-1 h-4 w-4" />
                              PDF
                            </a>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              href={{
                                pathname: "/mon-compte/factures/[id]",
                                params: { id: invoice.id },
                              }}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              {t("view")}
                            </Link>
                          </Button>
                          {(invoice.status === "pending" ||
                            invoice.status === "overdue") && (
                            <>
                              <form action={markInvoicePaid}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={invoice.id}
                                />
                                <Button type="submit" variant="ghost" size="sm">
                                  <Check className="mr-1 h-4 w-4" />
                                  {t("markPaid")}
                                </Button>
                              </form>
                              <form action={cancelInvoice}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={invoice.id}
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="text-grey-500"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  {t("cancel")}
                                </Button>
                              </form>
                            </>
                          )}
                          {invoice.status === "paid" && (
                            <>
                              <form action={refundInvoice}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={invoice.id}
                                />
                                <input
                                  type="hidden"
                                  name="percent"
                                  value="50"
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="text-grey-500"
                                >
                                  {t("refundHalf")}
                                </Button>
                              </form>
                              <form action={refundInvoice}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={invoice.id}
                                />
                                <input
                                  type="hidden"
                                  name="percent"
                                  value="100"
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="text-error"
                                >
                                  <Undo2 className="mr-1 h-4 w-4" />
                                  {t("refund")}
                                </Button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
