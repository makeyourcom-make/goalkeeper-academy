import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export async function HomeTestimonials() {
  const t = await getTranslations("HomePage.testimonials");

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("title")}
          </h2>
        </div>

        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl bg-grey-100 px-8 py-12 text-center">
          <Quote className="h-8 w-8 text-orange" aria-hidden="true" />
          <p className="text-lg text-grey-700">{t("comingSoon")}</p>
        </div>
      </div>
    </section>
  );
}
