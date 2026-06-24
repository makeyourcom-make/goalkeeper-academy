import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { ReservationFlow } from "@/components/reservation/reservation-flow";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import campsData from "@/data/camps.json";
import type { Child } from "@/types/database";

type Camp = (typeof campsData)[number];

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function getCamp(slug: string): Camp | undefined {
  return (campsData as Camp[]).find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const camp = getCamp(slug);
  const t = await getTranslations({ locale, namespace: "Reservation" });
  return {
    title: camp
      ? `${t("metaTitle")} : ${camp.title[locale === "en" ? "en" : "fr"]}`
      : t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

function formatDateRange(start: string, end: string, locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function formatPrice(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
    style: "currency",
    currency: "CHF",
  }).format(amount);
}

export default async function ReservationPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Reservation");
  const camp = getCamp(slug);
  if (!camp) notFound();

  const localeKey = locale === "en" ? "en" : "fr";

  // Optional: load logged-in user + their children for prefill
  let parentEmail: string | null = null;
  let children: Pick<
    Child,
    "id" | "first_name" | "last_name" | "birth_date"
  >[] = [];
  let isAuthenticated = false;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
      parentEmail = user.email ?? null;
      const { data } = await supabase
        .from("children")
        .select("id, first_name, last_name, birth_date")
        .order("first_name")
        .returns<
          Pick<Child, "id" | "first_name" | "last_name" | "birth_date">[]
        >();
      children = data ?? [];
    }
  }

  const campSummary = {
    slug: camp.slug,
    title: camp.title[localeKey],
    dateRange: formatDateRange(camp.startDate, camp.endDate, locale),
    location: camp.location,
    price: camp.price,
    formattedPrice: formatPrice(camp.price, locale),
    image: camp.image,
  };

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-3 py-12 lg:py-16">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("subtitle")}</p>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container">
          <ReservationFlow
            camp={campSummary}
            childrenList={children}
            parentEmail={parentEmail}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </section>
    </>
  );
}
