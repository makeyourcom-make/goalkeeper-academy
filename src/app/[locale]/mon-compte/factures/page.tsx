import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { getAccountContext } from "@/lib/account/view-context";
import { payInstallment } from "@/lib/inscription/pay-actions";
import type { Invoice, PaymentPlan } from "@/types/database";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.invoices" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

function formatAmount(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-CH" : "fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function InvoicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.invoices");

  const ctx = await getAccountContext();
  if (!ctx) redirect(`/${locale}/connexion`);

  const [{ data: invoices }, { data: plans }] = await Promise.all([
    ctx.db
      .from("invoices")
      .select("*")
      .eq("profile_id", ctx.userId)
      .order("issued_at", { ascending: false })
      .returns<Invoice[]>(),
    ctx.db
      .from("payment_plans")
      .select("*")
      .eq("profile_id", ctx.userId)
      .returns<PaymentPlan[]>(),
  ]);

  const list = invoices ?? [];
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

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
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
                <FileText className="h-7 w-7" />
              </span>
              <h2 className="font-anton text-2xl uppercase text-navy">
                {t("emptyTitle")}
              </h2>
              <p className="text-sm text-grey-700">{t("emptyDescription")}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((invoice) => {
                const plan = invoice.payment_plan_id
                  ? planById.get(invoice.payment_plan_id)
                  : undefined;
                const isPending = invoice.status === "pending";
                const isManualPay =
                  !!plan &&
                  (plan.method === "twint" ||
                    (plan.method === "card" && plan.installments_total === 1));
                const isAutoCard =
                  !!plan &&
                  plan.method === "card" &&
                  plan.installments_total > 1;

                return (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-grey-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="font-medium text-navy">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-xs text-grey-500">
                        {t(`type.${invoice.type}`)} ·{" "}
                        {t(`status.${invoice.status}`)}
                        {plan && plan.installments_total > 1 && (
                          <>
                            {" · "}
                            {t("installment", {
                              n: invoice.installment_number ?? 1,
                              total: plan.installments_total,
                            })}
                          </>
                        )}
                      </p>
                      {isPending && invoice.due_date && (
                        <p className="text-xs text-grey-500">
                          {t("due", {
                            date: formatDate(invoice.due_date, locale),
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="font-anton text-lg text-navy">
                        {formatAmount(
                          invoice.amount_cents,
                          invoice.currency,
                          locale,
                        )}
                      </p>
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-orange hover:underline"
                        >
                          {t("download")}
                        </a>
                      )}
                      {isPending && !ctx.isImpersonating && (
                        <>
                          {plan?.method === "qr_bill" && (
                            <Button asChild size="sm" variant="outline">
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
                          {isManualPay && (
                            <form action={payInstallment}>
                              <input
                                type="hidden"
                                name="invoiceId"
                                value={invoice.id}
                              />
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <Button type="submit" size="sm">
                                {t("pay")}
                              </Button>
                            </form>
                          )}
                          {isAutoCard && (
                            <span className="text-grey-400 text-xs">
                              {t("autoDebit")}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
