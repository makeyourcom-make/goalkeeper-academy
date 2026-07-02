import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";
import { faqGraph, alternatesFor } from "@/lib/seo";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OffersPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/offres", locale),
  };
}

const AUDIENCES = ["youth", "adult"] as const;

const FORMULAS = [
  { key: "single", featured: false },
  { key: "tour", featured: false },
  { key: "season", featured: true },
] as const;

const COMPARE_ROWS = [
  "sessions",
  "commitment",
  "youthPrice",
  "adultPrice",
  "perSession",
  "discount",
] as const;

const COMPARE_COLS = ["single", "tour", "season"] as const;

const FAQ_KEYS = [
  "trial",
  "location",
  "siblings",
  "payment",
  "cancel",
  "club",
] as const;

export default async function OffresPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("OffersPage");

  return (
    <>
      <JsonLd
        data={faqGraph(
          FAQ_KEYS.map((key) => ({
            question: t(`faq.items.${key}.question`),
            answer: t(`faq.items.${key}.answer`),
          })),
        )}
      />
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

      {/* Pricing by audience */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container flex flex-col gap-16">
          {/* Season / volume-discount banner */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange/30 bg-orange/5 px-6 py-6 text-center">
            <Badge variant="orange">{t("banner.eyebrow")}</Badge>
            <p className="max-w-3xl text-sm text-navy md:text-base">
              {t("banner.text")}
            </p>
          </div>

          {AUDIENCES.map((aud) => (
            <div key={aud} className="flex flex-col gap-8">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-grey-100 pb-4">
                <h2 className="font-anton text-h2 uppercase text-navy">
                  {t(`audiences.${aud}.label`)}
                </h2>
                <span className="text-sm font-medium uppercase tracking-wide text-orange">
                  {t(`audiences.${aud}.age`)}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {FORMULAS.map(({ key, featured }) => {
                  const base = `audiences.${aud}.${key}`;
                  const bullets = t.raw(`${base}.bullets`) as string[];
                  return (
                    <article
                      key={key}
                      id={t(`${base}.id`)}
                      className={cn(
                        "flex scroll-mt-20 flex-col rounded-xl border bg-white p-8 shadow-md transition-shadow hover:shadow-lg",
                        featured
                          ? "border-orange ring-2 ring-orange/20"
                          : "border-grey-100",
                      )}
                    >
                      <Badge variant={featured ? "orange" : "muted"}>
                        {t(`${base}.eyebrow`)}
                      </Badge>
                      <h3 className="mt-4 font-anton text-h3 uppercase leading-tight text-navy [text-wrap:balance]">
                        {t(`${base}.title`)}
                      </h3>
                      <p className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-medium text-navy">
                          {t(`${base}.price`)}
                        </span>
                        <span className="text-sm text-grey-500">
                          {t(`${base}.unit`)}
                        </span>
                      </p>
                      <p className="mt-3 text-justify text-sm text-grey-500">
                        {t(`${base}.description`)}
                      </p>
                      <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-grey-700">
                        {bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-6">
                        <Button
                          asChild
                          variant={featured ? "primary" : "outline"}
                          className="w-full"
                        >
                          <Link
                            href={{
                              pathname: "/reserver",
                              query: { formule: key, public: aud },
                            }}
                          >
                            {t(`${base}.cta`)}
                          </Link>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Club band */}
          <div
            id={t("club.id")}
            className="flex scroll-mt-20 flex-col gap-6 rounded-xl border border-navy/15 bg-navy/5 p-8 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="text-lg font-medium text-navy">{t("club.title")}</p>
              <p className="max-w-2xl text-grey-700">{t("club.description")}</p>
            </div>
            <Button asChild variant="primary" className="flex-shrink-0">
              <Link href="/contact">{t("club.cta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="bg-grey-100 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("compare.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("compare.title")}
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-md">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-grey-100 bg-grey-100/50">
                  <th className="px-6 py-4 font-anton text-base uppercase tracking-wide text-navy">
                    {t("compare.headers.feature")}
                  </th>
                  {COMPARE_COLS.map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 text-center font-anton text-base uppercase tracking-wide text-navy"
                    >
                      {t(`compare.headers.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, rowIdx) => (
                  <tr
                    key={row}
                    className={cn(
                      "border-b border-grey-100 last:border-b-0",
                      rowIdx % 2 === 1 && "bg-grey-100/30",
                    )}
                  >
                    <td className="px-6 py-4 font-medium text-navy">
                      {t(`compare.rows.${row}`)}
                    </td>
                    {COMPARE_COLS.map((col) => {
                      const values = t.raw(`compare.values.${col}`) as string[];
                      const value = values[rowIdx] ?? "—";
                      return (
                        <td
                          key={col}
                          className="px-6 py-4 text-center text-grey-700"
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="mb-10 flex flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("faq.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("faq.title")}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {FAQ_KEYS.map((key) => (
              <details
                key={key}
                className="group rounded-xl border border-grey-100 bg-white p-6 shadow-sm open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-navy">
                  <span>{t(`faq.items.${key}.question`)}</span>
                  <span
                    className="text-2xl leading-none text-orange transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-justify text-grey-700">
                  {t(`faq.items.${key}.answer`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
