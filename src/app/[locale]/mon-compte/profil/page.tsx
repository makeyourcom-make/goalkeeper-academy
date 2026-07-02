import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/forms/profile-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { isViewingAs } from "@/lib/account/view-context";
import { signedAvatarUrl } from "@/lib/storage/signed";
import { Link } from "@/i18n/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const tp = await getTranslations("Account.password");

  // Profile editing / password are the admin's own — not previewable.
  if (await isViewingAs()) redirect(`/${locale}/mon-compte`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/connexion`);

  // Read the user's OWN profile with the service-role client. This is safe
  // (authenticated user, strictly filtered to their own id) and immune to the
  // state of the profiles SELECT RLS policy, which must never be able to 404
  // this page for a logged-in user.
  const admin = createSupabaseAdminClient();
  const [{ data: profileRow }, { data: coach }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("coaches")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  let profile = profileRow;
  // Self-heal: some accounts predate the auto-create trigger and have no
  // profile row — create it instead of 404-ing.
  if (!profile) {
    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        role: "parent",
        language: locale,
      },
      { onConflict: "id" },
    );
    if (upsertError) {
      console.error("profil self-heal upsert failed:", upsertError);
    }
    const refetch = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();
    profile = refetch.data;
  }
  if (!profile) redirect(`/${locale}/mon-compte`);

  const isCoach = Boolean(coach);
  const avatarUrl = await signedAvatarUrl(supabase, profile.avatar_url);

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
        <div className="container flex max-w-2xl flex-col gap-8">
          <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-6 text-sm text-grey-500">
              {t("emailLabel")}{" "}
              <strong className="text-navy">{user.email}</strong>
            </p>
            <ProfileForm
              profile={profile}
              isCoach={isCoach}
              initialAvatarUrl={avatarUrl}
            />
          </div>

          <div className="rounded-2xl border border-grey-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-1 font-anton text-xl uppercase text-navy">
              {tp("title")}
            </h2>
            <p className="mb-6 text-sm text-grey-500">{tp("subtitle")}</p>
            <ChangePasswordForm />
          </div>
        </div>
      </section>
    </>
  );
}
