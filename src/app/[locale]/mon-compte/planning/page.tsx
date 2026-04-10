import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.planning" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PlanningPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.planning");

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
        <div className="container max-w-2xl">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
              <Calendar className="h-7 w-7" />
            </span>
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("emptyTitle")}
            </h2>
            <p className="text-sm text-grey-700">{t("emptyDescription")}</p>
            <Button asChild variant="primary">
              <Link href="/stages">{t("browseCamps")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
