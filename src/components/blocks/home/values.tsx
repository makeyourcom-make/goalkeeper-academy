import { getTranslations } from "next-intl/server";
import { ShieldCheck, LineChart, Smile, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const ITEMS: {
  key: "specialized" | "progression" | "passion";
  Icon: LucideIcon;
}[] = [
  { key: "specialized", Icon: ShieldCheck },
  { key: "progression", Icon: LineChart },
  { key: "passion", Icon: Smile },
];

export async function HomeValues() {
  const t = await getTranslations("HomePage.values");

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container">
        <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="muted">{t("eyebrow")}</Badge>
          <h2 className="font-anton text-h2 uppercase text-navy">
            {t("title")}
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {ITEMS.map(({ key, Icon }) => (
            <div
              key={key}
              className="flex flex-col items-start gap-4 rounded-xl border border-grey-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="font-anton text-h3 uppercase text-navy">
                {t(`items.${key}.title`)}
              </h3>
              <p className="text-grey-700">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
