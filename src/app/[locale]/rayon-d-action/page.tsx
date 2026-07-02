import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { alternatesFor, faqGraph } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

// Towns are proper nouns (identical FR/EN); only the surrounding copy is
// translated. One rich page — never per-town doorway pages.
const ZONES = [
  {
    key: "riviera",
    towns: ["Vevey", "La Tour-de-Peilz", "Montreux", "Villeneuve", "Roche"],
  },
  {
    key: "chablaisVaud",
    towns: [
      "Aigle",
      "Bex",
      "Ollon",
      "Villars-sur-Ollon",
      "Leysin",
      "Yvorne",
      "Corbeyrier",
    ],
  },
  {
    key: "chablaisValais",
    towns: [
      "Monthey",
      "Collombey-Muraz",
      "Vouvry",
      "Vionnaz",
      "Troistorrents",
      "Val-d'Illiez",
      "Champéry",
      "Massongex",
      "Saint-Maurice",
      "Martigny",
      "Vernayaz",
    ],
  },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ServiceArea" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/rayon-d-action", locale),
  };
}

export default async function ServiceAreaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ServiceArea");

  const faqItems = t.raw("faq.items") as { question: string; answer: string }[];

  return (
    <>
      <JsonLd data={faqGraph(faqItems)} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-5 py-20 text-center lg:py-24">
          <Badge variant="orange">{t("hero.eyebrow")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Intro + zones */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container max-w-4xl">
          <p className="mb-10 text-justify text-lg text-grey-700">
            {t("intro")}
          </p>

          <div className="flex flex-col gap-6">
            {ZONES.map((zone) => (
              <div
                key={zone.key}
                className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8"
              >
                <h2 className="font-anton text-xl uppercase text-navy">
                  {t(`zones.${zone.key}.title`)}
                </h2>
                <p className="mt-2 text-sm text-grey-700">
                  {t(`zones.${zone.key}.description`)}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {zone.towns.map((town) => (
                    <li
                      key={town}
                      className="inline-flex items-center gap-1.5 rounded-full bg-grey-100 px-3 py-1 text-sm text-navy"
                    >
                      <MapPin className="h-3.5 w-3.5 text-orange" />
                      {town}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-grey-100 py-16 lg:py-20">
        <div className="container max-w-3xl">
          <h2 className="mb-8 text-center font-anton text-h2 uppercase text-navy">
            {t("faq.title")}
          </h2>
          <div className="flex flex-col gap-4">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-grey-100 bg-white p-6 shadow-sm"
              >
                <h3 className="font-medium text-navy">{item.question}</h3>
                <p className="mt-2 text-sm text-grey-700">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container flex flex-col items-center gap-5 text-center">
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("cta.title")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/offres">
                {t("cta.offers")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">{t("cta.contact")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
