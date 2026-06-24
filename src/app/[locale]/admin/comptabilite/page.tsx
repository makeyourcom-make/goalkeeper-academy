import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrendingUp, TrendingDown, Scale, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TransactionForm } from "@/components/admin/transaction-form";
import { deleteTransaction } from "@/lib/admin/finance-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

type Transaction = {
  id: string;
  kind: "income" | "expense";
  category: string;
  label: string;
  amount: number;
  occurred_on: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.accounting" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminAccountingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.accounting");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, kind, category, label, amount, occurred_on")
    .order("occurred_on", { ascending: false })
    .returns<Transaction[]>();

  const list = data ?? [];
  const income = list
    .filter((x) => x.kind === "income")
    .reduce((s, x) => s + Number(x.amount), 0);
  const expense = list
    .filter((x) => x.kind === "expense")
    .reduce((s, x) => s + Number(x.amount), 0);
  const balance = income - expense;

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

  const CARDS = [
    {
      key: "income",
      value: income,
      Icon: TrendingUp,
      tone: "text-success",
    },
    {
      key: "expense",
      value: expense,
      Icon: TrendingDown,
      tone: "text-error",
    },
    {
      key: "balance",
      value: balance,
      Icon: Scale,
      tone: balance >= 0 ? "text-navy" : "text-error",
    },
  ] as const;

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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CARDS.map(({ key, value, Icon, tone }) => (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-2xl border border-grey-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-grey-500">
                {t(`cards.${key}`)}
              </span>
              <Icon className={`h-5 w-5 ${tone}`} />
            </div>
            <span className={`font-anton text-h2 ${tone}`}>
              {chf.format(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <TransactionForm mode="full" today={today} />

        <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("table.date")}</th>
                  <th className="px-4 py-3 font-semibold">{t("table.type")}</th>
                  <th className="px-4 py-3 font-semibold">
                    {t("table.category")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("table.label")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t("table.amount")}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {list.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-grey-500"
                    >
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  list.map((x) => (
                    <tr key={x.id} className="hover:bg-grey-100/40">
                      <td className="px-4 py-3 text-grey-500">
                        {dateFmt.format(new Date(x.occurred_on))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            x.kind === "income"
                              ? "inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success"
                              : "inline-flex rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error"
                          }
                        >
                          {t(`kind.${x.kind}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-grey-700">{x.category}</td>
                      <td className="px-4 py-3 text-navy">{x.label}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${x.kind === "income" ? "text-success" : "text-navy"}`}
                      >
                        {x.kind === "income" ? "+" : "−"}
                        {chf.format(Number(x.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
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
