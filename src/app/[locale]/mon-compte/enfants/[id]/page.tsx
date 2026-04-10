import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChildForm } from "@/components/forms/child-form";
import { Link } from "@/i18n/navigation";
import { deleteChild } from "@/lib/account/children-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Child } from "@/types/database";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.children" });
  return {
    title: t("editMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function EditChildPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.children");

  const supabase = await createSupabaseServerClient();
  const { data: child } = await supabase
    .from("children")
    .select("*")
    .eq("id", id)
    .maybeSingle<Child>();

  if (!child) notFound();

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {child.first_name} {child.last_name}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("editSubtitle")}</p>
          <Button asChild variant="ghost" className="self-start">
            <Link href="/mon-compte/enfants">{t("backToList")}</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
            <ChildForm mode="edit" child={child} />
          </div>

          <div className="mt-8 rounded-2xl border border-error/20 bg-error/5 p-6">
            <h2 className="font-anton text-lg uppercase text-error">
              {t("dangerZone")}
            </h2>
            <p className="mt-2 text-sm text-grey-700">{t("deleteWarning")}</p>
            <form action={deleteChild} className="mt-4">
              <input type="hidden" name="id" value={child.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="ghost" className="text-error">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete")}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
