import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

const ITEMS = [
  { key: "tour", featured: false, href: "/offres" as const },
  { key: "season", featured: true, href: "/offres" as const },
  { key: "camps", featured: false, href: "/stages" as const },
] as const;

export async function HomeOffers() {
  const t = await getTranslations("HomePage.offers");

  return (
    <section className="bg-grey-100 py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("title")}
          </h2>
          <p className="text-grey-500">{t("subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map(({ key, featured, href }) => {
            const bullets = t.raw(`items.${key}.bullets`) as string[];
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col rounded-xl border bg-white p-8 shadow-md transition-shadow hover:shadow-lg",
                  featured
                    ? "border-orange ring-2 ring-orange/20"
                    : "border-grey-100",
                )}
              >
                <Badge variant={featured ? "orange" : "muted"}>
                  {t(`items.${key}.badge`)}
                </Badge>
                <h3 className="mt-4 font-anton text-h3 uppercase text-navy">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 text-2xl font-semibold text-navy">
                  {t(`items.${key}.price`)}
                </p>
                <p className="mt-3 text-justify text-sm text-grey-500">
                  {t(`items.${key}.description`)}
                </p>
                <ul className="mt-6 flex flex-col gap-2 text-sm text-grey-700">
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
                    <Link href={href}>{t(`items.${key}.cta`)}</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
