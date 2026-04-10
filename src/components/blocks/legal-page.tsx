import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";

type LegalNamespace = "imprint" | "terms" | "privacy" | "cookies";

type LegalSection = {
  heading: string;
  body: string;
};

type Props = {
  namespace: LegalNamespace;
  locale: string;
};

export async function LegalPage({ namespace, locale }: Props) {
  const t = await getTranslations(`Legal.${namespace}`);
  const tCommon = await getTranslations("Legal");

  const sections = t.raw("sections") as LegalSection[];
  const lastUpdatedIso = t("lastUpdated");
  const formattedDate = new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : "fr-CH",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(lastUpdatedIso));

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col items-center gap-4 py-20 text-center lg:py-24">
          <Badge variant="muted">
            {tCommon("lastUpdated", { date: formattedDate })}
          </Badge>
          <h1 className="max-w-3xl text-balance font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="container max-w-3xl">
          <p className="mb-10 text-lg text-grey-700">{t("intro")}</p>

          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <article key={section.heading} className="flex flex-col gap-3">
                <h2 className="font-anton text-h3 uppercase text-navy">
                  {section.heading}
                </h2>
                <p className="text-grey-700">{section.body}</p>
              </article>
            ))}
          </div>

          <p className="mt-12 rounded-xl border border-grey-300 bg-grey-100 p-5 text-sm text-grey-700">
            {tCommon("placeholderNotice")}
          </p>
        </div>
      </section>
    </>
  );
}
