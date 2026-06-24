import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartyPopper } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { InscriptionFlow } from "@/components/inscription/inscription-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Audience, Formula } from "@/lib/inscription/pricing";

const VALID_AUDIENCES: readonly string[] = ["youth", "adult"];
const VALID_FORMULAS: readonly string[] = [
  "single",
  "tour1",
  "tour2",
  "season",
];

function mapFormula(value?: string): Formula | undefined {
  if (!value) return undefined;
  if (value === "tour") return "tour1"; // offer pages link to the generic "tour"
  if (VALID_FORMULAS.includes(value)) return value as Formula;
  return undefined;
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ formule?: string; public?: string; paid?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Inscription" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function ReserverPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Inscription");

  const initialFormula = mapFormula(sp.formule);
  const initialAudience =
    sp.public && VALID_AUDIENCES.includes(sp.public)
      ? (sp.public as Audience)
      : undefined;

  let isAuthed = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthed = Boolean(user);
  }

  if (sp.paid === "1") {
    return (
      <section className="bg-gradient-to-b from-white to-grey-100 py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-grey-100 bg-white p-10 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
              <PartyPopper className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="font-anton text-h2 uppercase text-navy">
              {t("paid.title")}
            </h1>
            <p className="text-grey-700">{t("paid.body")}</p>
            <Button asChild>
              <Link href="/">{t("success.backHome")}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-b from-white to-grey-100 py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
          <Badge variant="orange">{t("eyebrow")}</Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="text-grey-500">{t("subtitle")}</p>
        </div>
        <InscriptionFlow
          initialAudience={initialAudience}
          initialFormula={initialFormula}
          isAuthed={isAuthed}
        />
      </div>
    </section>
  );
}
