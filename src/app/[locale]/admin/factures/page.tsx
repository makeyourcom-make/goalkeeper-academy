import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markInvoicePaid } from "@/lib/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  type: "subscription" | "camp" | "particulier" | "club_contract";
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  issued_at: string;
  payment_method: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.invoices" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const STATUS_STYLES: Record<InvoiceRow["status"], string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  overdue: "bg-error/15 text-error",
  cancelled: "bg-grey-100 text-grey-500",
  refunded: "bg-navy/10 text-navy",
};

export default async function AdminInvoicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.invoices");

  const supabase = await createSupabaseServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, type, amount_cents, currency, status, issued_at, payment_method, profile:profiles!invoices_profile_id_fkey(first_name, last_name, email)",
    )
    .order("issued_at", { ascending: false })
    .returns<InvoiceRow[]>();

  const list = invoices ?? [];
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

      <div className="mt-8 overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("table.number")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.client")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.type")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.amount")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.issued")}</th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                list.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-grey-100/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-grey-700">
                      {invoice.profile
                        ? `${invoice.profile.first_name ?? ""} ${invoice.profile.last_name ?? ""}`.trim() ||
                          invoice.profile.email
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-grey-700">
                      {t(`types.${invoice.type}`)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">
                      {moneyFmt(invoice.amount_cents, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[invoice.status]}`}
                      >
                        {t(`statuses.${invoice.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-grey-500">
                      {dateFmt.format(new Date(invoice.issued_at))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.status === "pending" && (
                        <form action={markInvoicePaid}>
                          <input type="hidden" name="id" value={invoice.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            <Check className="mr-1 h-4 w-4" />
                            {t("markPaid")}
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
