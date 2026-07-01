import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone, MapPin, Clock, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/forms/contact-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const INFO_ITEMS: {
  key: "email" | "phone" | "address" | "hours";
  Icon: LucideIcon;
}[] = [
  { key: "email", Icon: Mail },
  { key: "phone", Icon: Phone },
  { key: "address", Icon: MapPin },
  { key: "hours", Icon: Clock },
];

// Aigle — Terrain de football de la Mêlée (exact: 46.319178, 6.935711)
const MAP_EMBED_URL =
  "https://www.openstreetmap.org/export/embed.html?bbox=6.921%2C46.309%2C6.951%2C46.329&layer=mapnik&marker=46.319178%2C6.935711";

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-5 py-20 text-center lg:py-24">
          <Badge variant="orange">{t("hero.eyebrow")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {t("hero.title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">
            {t("hero.subtitle")}
            <br />
            {t("hero.subtitle2")}
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="mb-6 font-anton text-h3 uppercase text-navy">
              {t("form.title")}
            </h2>
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-6">
            <h2 className="font-anton text-h3 uppercase text-navy">
              {t("info.title")}
            </h2>
            <ul className="flex flex-col gap-4">
              {INFO_ITEMS.map(({ key, Icon }) => (
                <li
                  key={key}
                  className="flex items-start gap-4 rounded-xl border border-grey-100 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-grey-500">
                      {t(`info.items.${key}.label`)}
                    </p>
                    <p className="whitespace-pre-line font-medium text-navy">
                      {t(`info.items.${key}.value`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Map */}
      <section className="bg-grey-100 py-16 lg:py-20">
        <div className="container">
          <div className="mb-8 flex flex-col gap-2 text-center">
            <h2 className="font-anton text-h3 uppercase text-navy">
              {t("map.title")}
            </h2>
            <p className="text-grey-500">{t("map.subtitle")}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-grey-300 bg-white shadow-md">
            <iframe
              src={MAP_EMBED_URL}
              title={t("map.title")}
              loading="lazy"
              className="h-[400px] w-full"
            />
          </div>
        </div>
      </section>
    </>
  );
}
