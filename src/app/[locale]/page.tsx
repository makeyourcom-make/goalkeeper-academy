import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HomeBlogPreview } from "@/components/blocks/home/blog-preview";
import { HomeCtaFinal } from "@/components/blocks/home/cta-final";
import { HomeHero } from "@/components/blocks/home/hero";
import { HomeOffers } from "@/components/blocks/home/offers";
import { HomePartners } from "@/components/blocks/home/partners";
import { HomeTestimonials } from "@/components/blocks/home/testimonials";
import { HomeValues } from "@/components/blocks/home/values";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HomeHero />
      <HomeValues />
      <HomeOffers />
      <HomeTestimonials />
      <HomePartners />
      <HomeBlogPreview />
      <HomeCtaFinal />
    </>
  );
}
