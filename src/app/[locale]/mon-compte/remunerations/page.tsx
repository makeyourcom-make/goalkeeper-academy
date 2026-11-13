import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet, CalendarCheck, TrendingUp, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ locale: string }> };

type PaymentRow = {
  period: string;
  sessions_count: number;
  rate_per_session: number;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
};

type DoneSession = {
  id: string;
  title: string;
  starts_at: string;
  is_private: boolean | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.pay" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function RemunerationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.pay");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion`);

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, rate_per_session")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string; rate_per_session: number | null }>();
  if (!coach) redirect(`/${locale}/mon-compte`);

  const rate = Number(coach.rate_per_session ?? 0);

  // Les séances déjà données sont lues avec le client service-role, strictement
  // limité aux séances de ce coach : un coach ne peut pas lire ces lignes via
  // RLS. Les relevés de paiement et l'IBAN passent par le client RLS habituel.
  const admin = createSupabaseAdminClient();
  const [{ data: sessions }, { data: payments }, { data: profile }] =
    await Promise.all([
      admin
        .from("sessions")
        .select("id, title, starts_at, is_private")
        .eq("coach_id", coach.id)
        .eq("status", "completed")
        .order("starts_at", { ascending: false })
        .returns<DoneSession[]>(),
      supabase
        .from("coach_payments")
        .select(
          "period, sessions_count, rate_per_session, amount, status, paid_at",
        )
        .eq("coach_id", coach.id)
        .order("period", { ascending: false })
        .returns<PaymentRow[]>(),
      supabase
        .from("profiles")
        .select("iban")
        .eq("id", user.id)
        .maybeSingle<{ iban: string | null }>(),
    ]);

  const done = sessions ?? [];
  const statements = payments ?? [];

  // Les séances privées sont montrées pour information mais ne sont pas
  // rémunérées : seules les séances publiques comptent dans le montant gagné.
  const publicDone = done.filter((s) => !s.is_private);
  const privateCount = done.length - publicDone.length;
  const earned = publicDone.length * rate;
  const paidTotal = statements
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const upcoming = Math.max(0, earned - paidTotal);

  const chf = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  });
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const periodFmt = (p: string) => {
    const [y, m] = p.split("-");
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(Number(y), Number(m) - 1, 1));
  };

  const cards = [
    {
      key: "done",
      Icon: CalendarCheck,
      value: String(done.length),
      sub: privateCount > 0 ? t("summaryDoneSub", { count: privateCount }) : "",
      label: t("summaryDone"),
      tone: "text-navy",
    },
    {
      key: "earned",
      Icon: TrendingUp,
      value: chf.format(earned),
      sub: t("summaryEarnedSub"),
      label: t("summaryEarned"),
      tone: "text-navy",
    },
    {
      key: "paid",
      Icon: Wallet,
      value: chf.format(paidTotal),
      sub: "",
      label: t("summaryPaid"),
      tone: "text-success",
    },
    {
      key: "upcoming",
      Icon: Clock,
      value: chf.format(upcoming),
      sub: "",
      label: t("summaryUpcoming"),
      tone: "text-orange",
    },
  ] as const;

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("subtitle")}</p>
          <Button asChild variant="ghost" className="self-start">
            <Link href="/mon-compte">{t("backToDashboard")}</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container flex max-w-4xl flex-col gap-10">
          {!profile?.iban && (
            <p className="rounded-xl border border-orange/30 bg-orange/5 p-4 text-sm text-grey-700">
              {t("ibanNote")}{" "}
              <Link
                href="/mon-compte/profil"
                className="font-medium text-orange underline"
              >
                {t("backToDashboard").replace("← ", "")}
              </Link>
            </p>
          )}

          {/* Synthèse : séances, montant gagné, déjà réglé, reste à venir. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ key, Icon, value, sub, label, tone }) => (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-grey-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-grey-500">
                    {label}
                  </span>
                  <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
                </div>
                <span className={`font-anton text-h3 ${tone}`}>{value}</span>
                {sub && <span className="text-xs text-grey-500">{sub}</span>}
              </div>
            ))}
          </div>

          {/* Historique des séances données (publiques + privées). */}
          <div className="flex flex-col gap-3">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("historyTitle")}
            </h2>
            {privateCount > 0 && (
              <p className="text-sm text-grey-500">{t("privateNote")}</p>
            )}
            {done.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
                <CalendarCheck className="h-8 w-8 text-orange" />
                <p className="text-sm text-grey-700">{t("historyEmpty")}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("date")}</th>
                        <th className="px-4 py-3 font-medium">
                          {t("session")}
                        </th>
                        <th className="px-4 py-3 font-medium">{t("type")}</th>
                        <th className="px-4 py-3 text-right font-medium">
                          {t("amount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-grey-100">
                      {done.map((s) => {
                        const priv = !!s.is_private;
                        return (
                          <tr key={s.id} className="hover:bg-grey-100/40">
                            <td className="whitespace-nowrap px-4 py-3 text-grey-500">
                              {dateFmt.format(new Date(s.starts_at))}
                            </td>
                            <td className="px-4 py-3 font-medium text-navy">
                              {s.title}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  priv
                                    ? "inline-flex rounded-full bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-500"
                                    : "inline-flex rounded-full bg-navy/5 px-2 py-0.5 text-xs font-medium text-navy"
                                }
                              >
                                {priv ? t("typePrivate") : t("typePublic")}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              {priv ? (
                                <span className="text-grey-400 text-xs">
                                  {t("notPaidLabel")}
                                </span>
                              ) : (
                                <span className="font-medium text-navy">
                                  {chf.format(rate)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Relevés de paiement émis par l'administration (payés / en attente). */}
          <div className="flex flex-col gap-3">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("statementsTitle")}
            </h2>
            {statements.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
                <Wallet className="h-8 w-8 text-orange" />
                <p className="text-sm text-grey-700">{t("empty")}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("period")}</th>
                        <th className="px-4 py-3 font-medium">
                          {t("sessions")}
                        </th>
                        <th className="px-4 py-3 font-medium">{t("rate")}</th>
                        <th className="px-4 py-3 font-medium">{t("amount")}</th>
                        <th className="px-4 py-3 font-medium">{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-grey-100">
                      {statements.map((p) => (
                        <tr key={p.period} className="hover:bg-grey-100/40">
                          <td className="px-4 py-3 font-medium capitalize text-navy">
                            {periodFmt(p.period)}
                          </td>
                          <td className="px-4 py-3 text-grey-700">
                            {p.sessions_count}
                          </td>
                          <td className="px-4 py-3 text-grey-700">
                            {chf.format(p.rate_per_session)}
                          </td>
                          <td className="px-4 py-3 font-medium text-navy">
                            {chf.format(p.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                p.status === "paid"
                                  ? "inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                                  : "inline-flex rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange"
                              }
                            >
                              {p.status === "paid" ? t("paid") : t("pending")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
