import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function HomeHero() {
  const t = await getTranslations("HomePage.hero");

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80"
          alt={t("imageAlt")}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy"
          aria-hidden="true"
        />
      </div>

      <div className="container relative z-10 flex flex-col items-center gap-6 py-24 text-center lg:py-36">
        <Badge variant="orange">{t("badge")}</Badge>
        <h1 className="max-w-4xl text-balance font-anton text-h1 uppercase leading-tight tracking-wide text-white lg:text-h1-hero">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-white/80">{t("subtitle")}</p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="px-10">
            <Link
              href={{ pathname: "/reserver", query: { formule: "season" } }}
            >
              {t("ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/offres">{t("ctaSecondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
