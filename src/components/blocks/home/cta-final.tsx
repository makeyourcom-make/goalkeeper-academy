import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function HomeCtaFinal() {
  const t = await getTranslations("HomePage.ctaFinal");

  return (
    <section className="bg-navy py-20 text-white lg:py-24">
      <div className="container flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-3xl text-balance font-anton text-h2 uppercase text-white lg:text-h1">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-lg text-white/80">{t("subtitle")}</p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/contact">{t("ctaPrimary")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/contact">{t("ctaSecondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
