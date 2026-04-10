import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <section className="bg-gradient-to-b from-white to-grey-100">
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 py-24 text-center">
        <p className="font-anton text-[6rem] uppercase leading-none text-orange">
          {t("title")}
        </p>
        <h1 className="max-w-2xl text-balance font-anton text-h2 uppercase text-navy">
          {t("subtitle")}
        </h1>
        <p className="max-w-xl text-grey-700">{t("description")}</p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/">{t("cta")}</Link>
        </Button>
      </div>
    </section>
  );
}
