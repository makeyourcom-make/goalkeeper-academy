import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Trash2,
  Users,
  CalendarClock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TransactionForm } from "@/components/admin/transaction-form";
import { deleteTransaction } from "@/lib/admin/finance-actions";
import { getCoachOptions } from "@/lib/admin/coach-options";
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

type SessionCost = {
  status: string;
  is_private: boolean | null;
  // PostgREST renvoie l'imbrication en objet ou en tableau selon la façon dont
  // il résout la relation: accepter les deux plutôt que parier sur une forme.
  coaches: { rate_per_session: number } | { rate_per_session: number }[] | null;
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

  // Prévision des rémunérations coach. Une séance marquée effectuée crée une
  // dette; celles encore au planning sont un engagement à venir. Les séances
  // privées en sont exclues (elles bloquent l'agenda sans être rémunérées).
  const [sessionsRes, paidRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("status, is_private, coaches(rate_per_session)")
      .neq("status", "cancelled")
      .returns<SessionCost[]>(),
    supabase
      .from("coach_payments")
      .select("amount")
      .eq("status", "paid")
      .returns<{ amount: number }[]>(),
  ]);

  const rateOf = (row: SessionCost): number => {
    const c = Array.isArray(row.coaches) ? row.coaches[0] : row.coaches;
    return Number(c?.rate_per_session ?? 0);
  };
  const billable = (sessionsRes.data ?? []).filter((x) => !x.is_private);
  const coachDone = billable
    .filter((x) => x.status === "completed")
    .reduce((sum, x) => sum + rateOf(x), 0);
  const coachUpcoming = billable
    .filter((x) => x.status !== "completed")
    .reduce((sum, x) => sum + rateOf(x), 0);
  const coachPaid = (paidRes.data ?? []).reduce(
    (sum, x) => sum + Number(x.amount),
    0,
  );
  // Reste dû sur les séances déjà données.
  const coachOwed = Math.max(0, coachDone - coachPaid);

  // SITUATION RÉELLE: ce qui est effectivement entré, moins ce qui est sorti,
  // moins ce qu'on doit aux coachs pour des séances déjà données. C'est la
  // trésorerie disponible une fois les dettes du moment honorées.
  const realBalance = balance - coachOwed;

  // PRÉVISIONNEL: les factures émises et non encore réglées, et les séances
  // déjà au planning qu'il faudra payer.
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("amount_cents")
    .in("status", ["pending", "overdue"])
    .returns<{ amount_cents: number }[]>();
  const toCollect = (openInvoices ?? []).reduce(
    (sum, i) => sum + Number(i.amount_cents) / 100,
    0,
  );
  const forecast = realBalance + toCollect - coachUpcoming;

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
  const coaches = await getCoachOptions(supabase);

  // Deux lectures distinctes: ce qui est constaté, et ce qui est attendu.
  // Les mélanger donnait un solde qui ne correspondait ni à la banque ni à la
  // réalité économique.
  const REAL_CARDS = [
    { key: "income", value: income, Icon: TrendingUp, tone: "text-success" },
    { key: "expense", value: expense, Icon: TrendingDown, tone: "text-error" },
    { key: "coachOwed", value: coachOwed, Icon: Users, tone: "text-warning" },
    {
      key: "realBalance",
      value: realBalance,
      Icon: Scale,
      tone: realBalance >= 0 ? "text-navy" : "text-error",
    },
  ] as const;

  const FORECAST_CARDS = [
    {
      key: "toCollect",
      value: toCollect,
      Icon: TrendingUp,
      tone: "text-success",
    },
    {
      key: "coachUpcoming",
      value: coachUpcoming,
      Icon: Users,
      tone: "text-warning",
    },
    {
      key: "forecast",
      value: forecast,
      Icon: CalendarClock,
      tone: forecast >= 0 ? "text-success" : "text-error",
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

      {/* 1. Ce qui est constaté: l'argent réellement entré et sorti. */}
      <div className="mt-8">
        <h2 className="font-anton text-xl uppercase text-navy">
          {t("sections.real")}
        </h2>
        <p className="mt-1 text-sm text-grey-500">{t("sections.realHint")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REAL_CARDS.map(({ key, value, Icon, tone }) => (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-2xl border border-grey-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-grey-500">
                  {t(`cards.${key}`)}
                </span>
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
              </div>
              <span className={`font-anton text-h3 ${tone}`}>
                {chf.format(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Ce qui est attendu: factures émises non réglées et séances à venir. */}
      <div className="mt-8">
        <h2 className="font-anton text-xl uppercase text-navy">
          {t("sections.forecast")}
        </h2>
        <p className="mt-1 text-sm text-grey-500">
          {t("sections.forecastHint")}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORECAST_CARDS.map(({ key, value, Icon, tone }) => (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-2xl border border-grey-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-grey-500">
                  {t(`cards.${key}`)}
                </span>
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
              </div>
              <span className={`font-anton text-h3 ${tone}`}>
                {chf.format(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <TransactionForm mode="full" today={today} coaches={coaches} />

        <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.type")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("table.category")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("table.label")}</th>
                  <th className="px-4 py-3 text-right font-medium">
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
                              ? "inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                              : "inline-flex rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error"
                          }
                        >
                          {t(`kind.${x.kind}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-grey-700">{x.category}</td>
                      <td className="px-4 py-3 text-navy">{x.label}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${x.kind === "income" ? "text-success" : "text-navy"}`}
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
