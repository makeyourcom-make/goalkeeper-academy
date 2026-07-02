import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/invoices/print-button";
import { getAccountContext } from "@/lib/account/view-context";
import { invoiceQrBillSvg } from "@/lib/invoices/qr-bill";
import type { Invoice } from "@/types/database";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.invoices" });
  return { title: t("qrTitle"), robots: { index: false, follow: false } };
}

export default async function InvoiceQrPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.invoices");

  const ctx = await getAccountContext();
  if (!ctx) redirect(`/${locale}/connexion`);

  const { data: invoice } = await ctx.db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("profile_id", ctx.userId)
    .maybeSingle<Invoice>();

  if (!invoice) redirect(`/${locale}/mon-compte/factures`);

  const svg = await invoiceQrBillSvg({
    amountCents: invoice.amount_cents,
    currency: invoice.currency,
    message: invoice.invoice_number,
  });

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-3 print:hidden">
          <Badge variant="orange" className="self-start">
            {invoice.invoice_number}
          </Badge>
          <h1 className="font-anton text-h2 uppercase leading-tight text-navy">
            {t("qrTitle")}
          </h1>
          <p className="max-w-2xl text-grey-500">{t("qrIntro")}</p>
          <div className="flex flex-wrap gap-3">
            {svg && <PrintButton label={t("print")} />}
            <Button asChild variant="ghost">
              <Link href="/mon-compte/factures">{t("backToInvoices")}</Link>
            </Button>
          </div>
        </div>

        {svg ? (
          <div
            className="overflow-x-auto rounded-2xl border border-grey-100 bg-white p-4 shadow-sm"
            // The SVG is generated server-side from our own data (swissqrbill).
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-8 text-center text-sm text-grey-700">
            {t("qrUnavailable")}
          </div>
        )}
      </div>
    </section>
  );
}
