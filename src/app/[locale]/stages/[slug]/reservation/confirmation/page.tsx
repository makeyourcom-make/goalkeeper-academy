import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
  MapPin,
  Receipt,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import campsData from "@/data/camps.json";

type Camp = (typeof campsData)[number];

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ invoice?: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  profile_id: string;
  children: { first_name: string | null; last_name: string | null } | null;
};

function getCamp(slug: string): Camp | undefined {
  return (campsData as Camp[]).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Reservation.confirmation",
  });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: Props) {
  const { locale, slug } = await params;
  const { invoice: invoiceId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Reservation.confirmation");
  const camp = getCamp(slug);
  if (!camp) notFound();

  const back = `/${locale}/stages/${slug}/reservation`;
  if (!invoiceId) redirect(back);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/connexion?next=${encodeURIComponent(back)}`);

  const admin = createSupabaseAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select(
      "id, invoice_number, amount_cents, currency, status, paid_at, payment_method, profile_id, children(first_name, last_name)",
    )
    .eq("id", invoiceId)
    .maybeSingle<InvoiceRow>();

  // Only the payer can see their own confirmation.
  if (!invoice || invoice.profile_id !== user.id) redirect(back);

  const localeKey = locale === "en" ? "en" : "fr";
  const isPaid = invoice.status === "paid";
  const childName = `${invoice.children?.first_name ?? ""} ${
    invoice.children?.last_name ?? ""
  }`.trim();

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const moneyFmt = new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: invoice.currency || "CHF",
  });
  const dateRange = `${dateFmt.format(new Date(camp.startDate))} – ${dateFmt.format(new Date(camp.endDate))}`;
  const paidAt = invoice.paid_at
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(invoice.paid_at))
    : null;

  return (
    <>
      <section
        className={
          isPaid
            ? "bg-gradient-to-b from-success/10 via-white to-white"
            : "bg-gradient-to-b from-orange/10 via-white to-white"
        }
      >
        <div className="container flex flex-col items-center gap-5 py-16 text-center lg:py-24">
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg ${
              isPaid ? "bg-success" : "bg-orange"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-10 w-10" />
            ) : (
              <Clock className="h-10 w-10" />
            )}
          </span>
          <Badge variant="orange">
            {isPaid ? t("eyebrow") : t("pendingEyebrow")}
          </Badge>
          <h1 className="max-w-2xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {isPaid ? t("title") : t("pendingTitle")}
          </h1>
          <p className="max-w-xl text-lg text-grey-700">
            {isPaid
              ? t("subtitle", { name: childName.split(" ")[0] || childName })
              : t("pendingSubtitle", {
                  name: childName.split(" ")[0] || childName,
                })}
          </p>
        </div>
      </section>

      <section className="bg-white pb-20">
        <div className="container max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-lg">
            <div className="flex items-center justify-between gap-4 border-b border-grey-100 bg-grey-100/40 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-grey-500">
                  {t("invoice.label")}
                </p>
                <p className="font-mono text-sm font-semibold text-navy">
                  {invoice.invoice_number}
                </p>
              </div>
              <Receipt className="h-6 w-6 text-orange" />
            </div>

            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-xs uppercase tracking-wide text-grey-500">
                  {t("camp")}
                </p>
                <p className="font-anton text-xl uppercase text-navy">
                  {camp.title[localeKey]}
                </p>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <div>
                    <dt className="text-xs text-grey-500">{t("dates")}</dt>
                    <dd className="text-sm font-medium text-navy">
                      {dateRange}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <div>
                    <dt className="text-xs text-grey-500">{t("location")}</dt>
                    <dd className="text-sm font-medium text-navy">
                      {camp.venue}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="h-px bg-grey-100" />

              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-grey-500">{t("participant")}</dt>
                  <dd className="font-medium text-navy">{childName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-grey-500">{t("paymentMethod")}</dt>
                  <dd className="font-medium text-navy">
                    {t(`methods.${invoice.payment_method ?? "qr_bill"}`)}
                  </dd>
                </div>
                {paidAt && (
                  <div className="flex justify-between">
                    <dt className="text-grey-500">{t("paidAt")}</dt>
                    <dd className="font-medium text-navy">{paidAt}</dd>
                  </div>
                )}
              </dl>

              <div className="flex items-center justify-between rounded-xl bg-navy px-5 py-4 text-white">
                <span className="text-sm uppercase tracking-wide opacity-80">
                  {isPaid ? t("totalPaid") : t("totalDue")}
                </span>
                <span className="font-anton text-2xl">
                  {moneyFmt.format(invoice.amount_cents / 100)}
                </span>
              </div>

              {isPaid ? (
                <div className="flex items-start gap-3 rounded-xl bg-grey-100 p-4 text-sm text-grey-700">
                  <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <p>{t("emailSent", { email: user.email ?? "" })}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl bg-orange/10 p-4 text-sm text-grey-700">
                  <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <p>{t("pendingNote")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/mon-compte/factures">{t("ctaInvoices")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/stages">{t("ctaBrowse")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
