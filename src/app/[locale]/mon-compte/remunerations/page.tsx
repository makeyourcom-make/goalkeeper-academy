import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

type PaymentRow = {
  period: string;
  sessions_count: number;
  rate_per_session: number;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
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
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!coach) redirect(`/${locale}/mon-compte`);

  const [{ data: payments }, { data: profile }] = await Promise.all([
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

  const list = payments ?? [];
  const chf = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  });
  const periodFmt = (p: string) => {
    const [y, m] = p.split("-");
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(Number(y), Number(m) - 1, 1));
  };

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
        <div className="container max-w-3xl">
          {!profile?.iban && (
            <p className="mb-4 rounded-xl border border-orange/30 bg-orange/5 p-4 text-sm text-grey-700">
              {t("ibanNote")}{" "}
              <Link
                href="/mon-compte/profil"
                className="font-medium text-orange underline"
              >
                {t("backToDashboard").replace("← ", "")}
              </Link>
            </p>
          )}
          {list.length === 0 ? (
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
                      <th className="px-4 py-3 font-medium">{t("sessions")}</th>
                      <th className="px-4 py-3 font-medium">{t("rate")}</th>
                      <th className="px-4 py-3 font-medium">{t("amount")}</th>
                      <th className="px-4 py-3 font-medium">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grey-100">
                    {list.map((p) => (
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
      </section>
    </>
  );
}
