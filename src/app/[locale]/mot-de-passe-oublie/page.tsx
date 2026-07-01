import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.forgotPassword" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.forgotPassword");

  return (
    <section className="bg-gradient-to-b from-white to-grey-100">
      <div className="container flex min-h-[70vh] items-center justify-center py-16 lg:py-20">
        <div className="w-full max-w-md rounded-2xl border border-grey-100 bg-white p-8 shadow-md">
          <div className="mb-6 flex flex-col gap-3">
            <Badge variant="orange" className="self-start">
              {t("eyebrow")}
            </Badge>
            <h1 className="font-anton text-h2 uppercase text-navy">
              {t("title")}
            </h1>
            <p className="text-grey-500">{t("subtitle")}</p>
          </div>

          <ForgotPasswordForm />

          <p className="mt-6 text-sm text-grey-500">
            <Link
              href="/connexion"
              className="font-medium text-orange hover:text-orange-600"
            >
              {t("backToSignIn")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
