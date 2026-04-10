import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChildForm } from "@/components/forms/child-form";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.children" });
  return {
    title: t("newMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function NewChildPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.children");

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("newTitle")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("newSubtitle")}</p>
          <Button asChild variant="ghost" className="self-start">
            <Link href="/mon-compte/enfants">{t("backToList")}</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
            <ChildForm mode="create" />
          </div>
        </div>
      </section>
    </>
  );
}
