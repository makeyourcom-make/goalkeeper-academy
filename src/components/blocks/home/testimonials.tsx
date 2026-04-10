import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const KEYS = ["parent", "keeper", "club"] as const;

export async function HomeTestimonials() {
  const t = await getTranslations("HomePage.testimonials");

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {KEYS.map((key) => (
            <figure
              key={key}
              className="flex h-full flex-col gap-6 rounded-xl bg-grey-100 p-8"
            >
              <Quote className="h-8 w-8 text-orange" aria-hidden="true" />
              <blockquote className="flex-1 text-grey-700">
                {t(`items.${key}.quote`)}
              </blockquote>
              <figcaption className="border-t border-grey-300 pt-4">
                <p className="font-semibold text-navy">
                  {t(`items.${key}.author`)}
                </p>
                <p className="text-sm text-grey-500">
                  {t(`items.${key}.role`)}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
