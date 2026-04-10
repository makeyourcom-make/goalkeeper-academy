import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const cards = ["kids", "camps", "clubs"] as const;

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-6 py-20 text-center lg:py-28">
          <Badge variant="orange">{t("badge")}</Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy lg:text-h1-hero">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("subtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/offres">{t("cta.offers")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">{t("cta.contact")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("preview.badge")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("preview.title")}
          </h2>
          <p className="max-w-2xl text-grey-500">{t("preview.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{t(`cards.${key}.title`)}</CardTitle>
                <CardDescription>
                  {t(`cards.${key}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>{t(`cards.${key}.content`)}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
