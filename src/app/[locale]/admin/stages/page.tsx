import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import campsData from "@/data/camps.json";

type Camp = (typeof campsData)[number];

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.camps" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminCampsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.camps");
  const localeKey = locale === "en" ? "en" : "fr";

  const camps = [...(campsData as Camp[])].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const moneyFmt = (amount: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-CH" : "fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">{t("subtitle")}</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {camps.map((camp) => {
          const filled = camp.spotsTotal - camp.spotsLeft;
          const fillPct = Math.round((filled / camp.spotsTotal) * 100);
          return (
            <article
              key={camp.slug}
              className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm"
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={camp.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-3 p-5">
                <h2 className="font-anton text-lg uppercase text-navy">
                  {camp.title[localeKey]}
                </h2>
                <ul className="grid grid-cols-2 gap-2 text-xs text-grey-700">
                  <li className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-orange" />
                    {dateFmt.format(new Date(camp.startDate))}
                  </li>
                  <li className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange" />
                    {camp.location}
                  </li>
                  <li className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-orange" />
                    {filled} / {camp.spotsTotal}
                  </li>
                  <li className="font-semibold text-navy">
                    {moneyFmt(camp.price)}
                  </li>
                </ul>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-grey-500">{t("filling")}</span>
                    <span className="font-semibold text-navy">{fillPct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-grey-100">
                    <div
                      className="h-full rounded-full bg-orange transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-grey-500">{t("note")}</p>
    </div>
  );
}
