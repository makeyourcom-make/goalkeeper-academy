import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Dumbbell,
  Brain,
  Target,
  Eye,
  Trees,
  Wrench,
  Heart,
  Handshake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcademyPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const PILLARS: {
  key: "technical" | "tactical" | "physical" | "mental";
  Icon: LucideIcon;
}[] = [
  { key: "technical", Icon: Target },
  { key: "tactical", Icon: Eye },
  { key: "physical", Icon: Dumbbell },
  { key: "mental", Icon: Brain },
];

const FACILITIES: { key: "outdoor" | "gear"; Icon: LucideIcon }[] = [
  { key: "outdoor", Icon: Trees },
  { key: "gear", Icon: Wrench },
];

const VALUES: {
  key: "excellence" | "respect" | "passion";
  Icon: LucideIcon;
}[] = [
  { key: "excellence", Icon: Sparkles },
  { key: "respect", Icon: Handshake },
  { key: "passion", Icon: Heart },
];

const TEAM = ["head", "youth"] as const;

const STATS = ["keepers", "years", "clubs"] as const;

const COACH_IMAGES: Record<(typeof TEAM)[number], string> = {
  head: "/team/gianluca-giannarelli.jpeg",
  youth: "/team/arthur-chazelle.jpg",
};

export default async function AcademiePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AcademyPage");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=1920&q=80"
            alt={t("hero.imageAlt")}
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

      {/* Mission */}
      <section className="bg-white py-20 lg:py-28">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <Badge variant="muted">{t("mission.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("mission.title")}
            </h2>
            <p className="text-justify text-grey-700">{t("mission.intro")}</p>
            <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-grey-100 pt-6">
              {STATS.map((key) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-sm text-grey-500">
                    {t(`mission.stats.${key}.label`)}
                  </dt>
                  <dd className="font-anton text-h3 uppercase text-orange">
                    {t(`mission.stats.${key}.value`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1614632537190-23e4146777db?w=1200&q=80"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="equipe" className="scroll-mt-20 bg-grey-100 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("team.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("team.title")}
            </h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {TEAM.map((key) => (
              <article
                key={key}
                className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md"
              >
                <div className="relative aspect-square">
                  <Image
                    src={COACH_IMAGES[key]}
                    alt={t(`team.members.${key}.name`)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2 p-6">
                  <h3 className="font-anton text-xl uppercase text-navy">
                    {t(`team.members.${key}.name`)}
                  </h3>
                  <p className="text-sm font-semibold text-orange">
                    {t(`team.members.${key}.role`)}
                  </p>
                  <p className="text-justify text-sm text-grey-700">
                    {t(`team.members.${key}.bio`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Recruitment */}
      <section className="bg-navy py-16 text-white lg:py-20">
        <div className="container flex flex-col items-center gap-5 text-center">
          <Badge variant="orange">{t("recruit.eyebrow")}</Badge>
          <h2 className="max-w-2xl text-balance font-anton text-h2 uppercase text-white">
            {t("recruit.title")}
          </h2>
          <p className="max-w-2xl text-white/80">{t("recruit.subtitle")}</p>
          <Button asChild size="lg">
            <Link href="/contact">{t("recruit.cta")}</Link>
          </Button>
        </div>
      </section>

      {/* Method */}
      <section id="methode" className="scroll-mt-20 bg-white py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("method.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("method.title")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-grey-100 bg-white p-6 shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-anton text-xl uppercase leading-tight text-navy [text-wrap:balance] lg:min-h-[3.25rem]">
                  {t(`method.pillars.${key}.title`)}
                </h3>
                <p className="text-justify text-sm text-grey-700">
                  {t(`method.pillars.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="bg-grey-100 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("facilities.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("facilities.title")}
            </h2>
            <p className="text-grey-500">{t("facilities.subtitle")}</p>
          </div>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md">
              <Image
                src="/venue/terrain-melee.png"
                alt={t("facilities.items.outdoor.title")}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-6">
              {FACILITIES.map(({ key, Icon }) => (
                <div
                  key={key}
                  className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-md"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy/5 text-navy">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-anton text-xl uppercase text-navy">
                    {t(`facilities.items.${key}.title`)}
                  </h3>
                  <p className="text-justify text-sm text-grey-700">
                    {t(`facilities.items.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-3 text-center">
            <Badge variant="muted">{t("values.eyebrow")}</Badge>
            <h2 className="font-anton text-h2 uppercase text-navy">
              {t("values.title")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {VALUES.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex flex-col items-start gap-4 rounded-xl border border-grey-100 bg-white p-8 shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="font-anton text-xl uppercase text-navy">
                  {t(`values.items.${key}.title`)}
                </h3>
                <p className="text-justify text-grey-700">
                  {t(`values.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
