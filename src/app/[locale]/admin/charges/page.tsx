import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trash2, Paperclip, Check, RotateCcw, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { TransactionForm } from "@/components/admin/transaction-form";
import { deleteTransaction, setReimbursed } from "@/lib/admin/finance-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

type Transaction = {
  id: string;
  category: string;
  label: string;
  amount: number;
  occurred_on: string;
  notes: string | null;
  paid_by: string | null;
  reimbursed: boolean;
  receipt_url: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.expenses" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminExpensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.expenses");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("transactions")
    .select(
      "id, category, label, amount, occurred_on, notes, paid_by, reimbursed, receipt_url",
    )
    .eq("kind", "expense")
    .order("occurred_on", { ascending: false })
    .returns<Transaction[]>();

  const list = data ?? [];

  // Short-lived signed URLs for the private receipt files.
  const receiptUrls = await Promise.all(
    list.map((x) =>
      x.receipt_url
        ? supabase.storage
            .from("receipts")
            .createSignedUrl(x.receipt_url, 600)
            .then((r) => r.data?.signedUrl ?? null)
        : Promise.resolve(null),
    ),
  );

  const total = list.reduce((s, x) => s + Number(x.amount), 0);
  const toReimburse = list.reduce(
    (s, x) => (x.paid_by && !x.reimbursed ? s + Number(x.amount) : s),
    0,
  );
  const chf = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  });
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tf = await getTranslations("Admin.finance");

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">{t("subtitle")}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="inline-flex flex-col rounded-2xl border border-grey-100 bg-white p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wide text-grey-500">
            {t("total")}
          </span>
          <span className="font-anton text-h2 text-navy">
            {chf.format(total)}
          </span>
        </div>
        {toReimburse > 0 && (
          <div className="inline-flex flex-col rounded-2xl border border-orange/30 bg-orange/5 p-5 shadow-sm">
            <span className="text-xs uppercase tracking-wide text-orange">
              {t("toReimburse")}
            </span>
            <span className="font-anton text-h2 text-orange">
              {chf.format(toReimburse)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <TransactionForm mode="expense" today={today} />

        <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.date")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("table.category")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("table.label")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.paidBy")}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("table.amount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("table.reimbursed")}
                  </th>
                  <th className="px-4 py-3" />
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
                  list.map((x, i) => (
                    <tr key={x.id} className="hover:bg-grey-100/40">
                      <td className="whitespace-nowrap px-4 py-3 text-grey-500">
                        {dateFmt.format(new Date(x.occurred_on))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
                          {x.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy">
                        {x.label}
                        {receiptUrls[i] && (
                          <a
                            href={receiptUrls[i] as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 flex items-center gap-1 text-xs font-medium text-orange hover:underline"
                          >
                            <Paperclip className="h-3 w-3" /> {t("viewReceipt")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        {x.paid_by || t("noValue")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-navy">
                        {chf.format(Number(x.amount))}
                      </td>
                      <td className="px-4 py-3">
                        {x.paid_by ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                x.reimbursed
                                  ? "inline-flex whitespace-nowrap rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                                  : "inline-flex whitespace-nowrap rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange"
                              }
                            >
                              {x.reimbursed
                                ? t("reimburseDone")
                                : t("reimbursePending")}
                            </span>
                            <form action={setReimbursed}>
                              <input type="hidden" name="id" value={x.id} />
                              <input
                                type="hidden"
                                name="reimbursed"
                                value={x.reimbursed ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                title={
                                  x.reimbursed
                                    ? t("unmarkReimbursed")
                                    : t("markReimbursed")
                                }
                                aria-label={
                                  x.reimbursed
                                    ? t("unmarkReimbursed")
                                    : t("markReimbursed")
                                }
                                className="text-grey-400 transition-colors hover:text-navy"
                              >
                                {x.reimbursed ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-grey-400">{t("noValue")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={{
                              pathname: "/admin/charges/[id]/edit",
                              params: { id: x.id },
                            }}
                            aria-label={t("edit")}
                            title={t("edit")}
                            className="text-grey-400 transition-colors hover:text-navy"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <form action={deleteTransaction}>
                            <input type="hidden" name="id" value={x.id} />
                            <button
                              type="submit"
                              aria-label={tf("delete")}
                              title={tf("delete")}
                              className="text-grey-400 transition-colors hover:text-error"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
