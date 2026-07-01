import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Heart,
  GraduationCap,
  Search,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "GianaPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const STATS = ["editions", "keepers", "regions"] as const;

const COMMITMENTS: {
  key: "values" | "coaching" | "spotting";
  Icon: LucideIcon;
}[] = [
  { key: "values", Icon: Heart },
  { key: "coaching", Icon: GraduationCap },
  { key: "spotting", Icon: Search },
];

export default async function GianaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("GianaPage");
  const externalUrl = t("info.external.url");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1920&q=80"
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
        <div className="container relative z-10 flex flex-col items-center gap-5 py-24 text-center lg:py-32">
          <Badge variant="orange">{t("hero.eyebrow")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-white lg:text-h1-hero">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-lg text-white/80">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* About */}
      <section className="bg-white py-20 lg:py-28">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <Badge variant="muted">{t("about.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("about.title")}
            </h2>
            <p className="text-justify text-grey-700">{t("about.intro")}</p>
            <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-grey-100 pt-6">
              {STATS.map((key) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-sm text-grey-500">
                    {t(`about.stats.${key}.label`)}
                  </dt>
                  <dd className="font-anton text-h3 uppercase text-orange">
                    {t(`about.stats.${key}.value`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="bg-grey-100 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("partnership.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("partnership.title")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {COMMITMENTS.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-anton text-xl uppercase leading-tight text-navy [text-wrap:balance] lg:min-h-[3.25rem]">
                  {t(`partnership.items.${key}.title`)}
                </h3>
                <p className="text-justify text-sm text-grey-700">
                  {t(`partnership.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official site */}
      <section className="bg-white py-20 lg:py-28">
        <div className="container flex max-w-3xl flex-col items-center gap-4 text-center">
          <Badge variant="muted">{t("info.eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("info.title")}
          </h2>
          <Button asChild className="mt-2">
            <a href={externalUrl} target="_blank" rel="noreferrer noopener">
              {t("info.external.label")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
