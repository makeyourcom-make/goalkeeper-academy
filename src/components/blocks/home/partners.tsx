import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";

const PARTNERS = ["FC Aigle", "Giana Stop & Shoot"];

export async function HomePartners() {
  const t = await getTranslations("HomePage.partners");

  return (
    <section className="bg-grey-100 py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h3 uppercase text-navy lg:text-h2">
            {t("title")}
          </h2>
          <p className="text-grey-500">{t("subtitle")}</p>
        </div>

        <ul className="flex flex-wrap justify-center gap-6">
          {PARTNERS.map((name) => (
            <li
              key={name}
              className="flex h-20 w-full max-w-xs items-center justify-center rounded-lg border border-grey-300 bg-white px-4 text-center font-anton text-sm uppercase tracking-wide text-navy sm:w-64 lg:text-base"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
