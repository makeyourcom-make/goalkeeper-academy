import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import campsData from "@/data/camps.json";

type Camp = (typeof campsData)[number];

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CampsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function formatDateRange(start: string, end: string, locale: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric" });
    const fullFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${dayFmt.format(startDate)} – ${fullFmt.format(endDate)}`;
  }

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

export default async function StagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("CampsPage");
  const localeKey = locale === "en" ? "en" : "fr";

  const camps = [...campsData].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  ) as Camp[];

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

      {/* Camps list */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container">
          {camps.length === 0 ? (
            <p className="text-center text-grey-500">{t("list.empty")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {camps.map((camp) => {
                const dateRange = formatDateRange(
                  camp.startDate,
                  camp.endDate,
                  locale,
                );
                const ageRange = t("list.ageRange", {
                  min: camp.ageMin,
                  max: camp.ageMax,
                });
                const isFull = camp.spotsLeft === 0;
                return (
                  <article
                    key={camp.slug}
                    className="flex flex-col overflow-hidden rounded-xl border border-grey-100 bg-white shadow-md transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={camp.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <div className="absolute left-4 top-4">
                        <Badge variant={isFull ? "muted" : "orange"}>
                          {t("list.spotsLeft", { count: camp.spotsLeft })}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <h2 className="font-anton text-h3 uppercase text-navy">
                        {camp.title[localeKey]}
                      </h2>

                      <ul className="grid grid-cols-2 gap-3 text-sm text-grey-700">
                        <li className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-orange" />
                          <span>{dateRange}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange" />
                          <span>{camp.location}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-orange" />
                          <span>{ageRange}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange" />
                          <span>{t(`list.format.${camp.format}`)}</span>
                        </li>
                      </ul>

                      <p className="text-sm text-grey-700">
                        {camp.description[localeKey]}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <span className="font-anton text-xl text-navy">
                          {new Intl.NumberFormat(
                            locale === "en" ? "en-CH" : "fr-CH",
                            { style: "currency", currency: "CHF" },
                          ).format(camp.price)}
                        </span>
                        <Button asChild variant="primary" size="sm">
                          <Link
                            href={{
                              pathname: "/stages/[slug]",
                              params: { slug: camp.slug },
                            }}
                          >
                            {t("list.viewDetails")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
              <p className="text-grey-700">{t("partner.description")}</p>
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
