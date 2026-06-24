import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { SignInForm } from "@/components/forms/sign-in-form";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.signIn" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.signIn");

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

          <SignInForm />

          <p className="mt-4 text-sm">
            <Link
              href="/mot-de-passe-oublie"
              className="font-semibold text-grey-500 hover:text-navy"
            >
              {t("forgotPassword")}
            </Link>
          </p>

          <p className="mt-6 text-sm text-grey-500">
            {t("noAccount")}{" "}
            <Link
              href="/inscription"
              className="font-semibold text-orange hover:text-orange-600"
            >
              {t("createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
