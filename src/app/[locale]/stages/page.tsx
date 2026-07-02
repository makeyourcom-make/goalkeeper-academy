import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { alternatesFor } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CampsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/stages", locale),
  };
}

export default async function StagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("CampsPage");

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-5 py-20 text-center lg:py-28">
          <Badge variant="orange">{t("hero.eyebrow")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Coming soon */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-grey-100 bg-grey-100/40 px-6 py-16 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
              <CalendarDays className="h-7 w-7" aria-hidden="true" />
            </span>
            <Badge variant="orange">{t("comingSoon.badge")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("comingSoon.title")}
            </h2>
            <p className="text-grey-700">{t("comingSoon.description")}</p>
            <Button asChild variant="primary">
              <Link href="/contact">{t("comingSoon.cta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Partner block */}
      <section className="bg-grey-100 py-20 lg:py-24">
        <div className="container">
          <div className="grid items-center gap-8 rounded-2xl bg-white p-8 shadow-md md:grid-cols-[2fr_1fr] md:p-12">
            <div className="flex flex-col gap-3">
              <Badge variant="muted">{t("partner.eyebrow")}</Badge>
              <h2 className="font-anton text-h2 uppercase text-navy">
                {t("partner.title")}
              </h2>
              <p className="text-justify text-grey-700">
                {t("partner.description")}
              </p>
            </div>
            <div className="md:justify-self-end">
              <Button asChild>
                <Link href="/stages/giana-stop-and-shoot">
                  {t("partner.cta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
