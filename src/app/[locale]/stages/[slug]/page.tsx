import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { confirmedCountForSlug } from "@/lib/camps/availability";
import campsData from "@/data/camps.json";

type Camp = (typeof campsData)[number];

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Re-check real availability periodically (spots left reflect paid registrations).
export const revalidate = 600;

function getCamp(slug: string): Camp | undefined {
  return (campsData as Camp[]).find((c) => c.slug === slug);
}

export async function generateStaticParams() {
  return (campsData as Camp[]).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const camp = getCamp(slug);
  if (!camp) return { title: "404" };
  const localeKey = locale === "en" ? "en" : "fr";
  return {
    title: camp.title[localeKey],
    description: camp.description[localeKey],
    openGraph: {
      title: camp.title[localeKey],
      description: camp.description[localeKey],
      images: [camp.image],
    },
  };
}

function formatDateRange(start: string, end: string, locale: string) {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}

function formatPrice(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  }).format(amount);
}

export default async function CampDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("CampDetail");
  const camp = getCamp(slug);
  if (!camp) notFound();

  const localeKey = locale === "en" ? "en" : "fr";
  const dateRange = formatDateRange(camp.startDate, camp.endDate, locale);
  const ageRange = t("ageRange", { min: camp.ageMin, max: camp.ageMax });
  // Real spots left from paid registrations; fall back to the JSON counter.
  const confirmed = await confirmedCountForSlug(camp.slug);
  const spotsLeft =
    confirmed === null
      ? camp.spotsLeft
      : Math.max(0, camp.spotsTotal - confirmed);
  const isFull = spotsLeft === 0;

  const INFO = [
    { Icon: CalendarDays, label: t("info.dates"), value: dateRange },
    { Icon: MapPin, label: t("info.venue"), value: camp.venue },
    { Icon: Users, label: t("info.ages"), value: ageRange },
    {
      Icon: Clock,
      label: t("info.schedule"),
      value: `${t(`format.${camp.format}`)} · ${camp.dailyHours}`,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src={camp.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy"
            aria-hidden="true"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-start gap-5 py-20 lg:py-28">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
          >
            <Link href="/stages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToList")}
            </Link>
          </Button>
          <Badge variant={isFull ? "muted" : "orange"}>
            {t("spotsLeft", { count: spotsLeft })}
          </Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-white">
            {camp.title[localeKey]}
          </h1>
          <p className="max-w-2xl text-lg text-white/80">
            {camp.description[localeKey]}
          </p>
        </div>
      </section>

      {/* Layout: program + sticky booking card */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Program */}
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="font-anton text-h2 uppercase text-navy">
                {t("info.title")}
              </h2>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {INFO.map(({ Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-4 rounded-xl border border-grey-100 bg-white p-5 shadow-sm"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <dt className="text-sm text-grey-500">{label}</dt>
                      <dd className="font-medium text-navy">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="font-anton text-h2 uppercase text-navy">
                {t("highlights.title")}
              </h2>
              <ul className="mt-6 flex flex-col gap-3">
                {camp.highlights[localeKey].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-grey-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-grey-100 p-8">
              <h3 className="font-anton text-xl uppercase text-navy">
                {t("included.title")}
              </h3>
              <p className="mt-3 text-sm text-grey-700">{t("included.body")}</p>
            </div>
          </div>

          {/* Sticky booking card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-5 rounded-2xl border border-grey-100 bg-white p-6 shadow-lg">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-grey-500">
                  {t("price.label")}
                </p>
                <p className="font-anton text-h1 text-navy">
                  {formatPrice(camp.price, locale)}
                </p>
                <p className="text-xs text-grey-500">{t("price.perChild")}</p>
              </div>

              <div className="h-px bg-grey-100" />

              <ul className="flex flex-col gap-2 text-sm text-grey-700">
                <li className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-orange" />
                  {dateRange}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange" />
                  {camp.location}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange" />
                  {ageRange}
                </li>
              </ul>

              <Button
                asChild
                size="lg"
                disabled={isFull}
                className={isFull ? "pointer-events-none" : ""}
              >
                <Link
                  href={{
                    pathname: "/stages/[slug]/reservation",
                    params: { slug: camp.slug },
                  }}
                >
                  {isFull ? t("price.full") : t("price.book")}
                </Link>
              </Button>

              <p className="text-center text-xs text-grey-500">
                {t("price.secureCheckout")}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
