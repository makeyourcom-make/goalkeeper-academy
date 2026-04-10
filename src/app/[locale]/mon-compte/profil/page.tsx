import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/forms/profile-form";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.profile" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.profile");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) notFound();

  return (
    <>
      <section className="bg-gradient-to-b from-white to-grey-100">
        <div className="container flex flex-col gap-4 py-16 lg:py-20">
          <Badge variant="orange" className="self-start">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-grey-500">{t("subtitle")}</p>
          <Button asChild variant="ghost" className="self-start">
            <Link href="/mon-compte">{t("backToDashboard")}</Link>
          </Button>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-6 text-sm text-grey-500">
              {t("emailLabel")}{" "}
              <strong className="text-navy">{user.email}</strong>
            </p>
            <ProfileForm profile={profile} />
          </div>
        </div>
      </section>
    </>
  );
}
