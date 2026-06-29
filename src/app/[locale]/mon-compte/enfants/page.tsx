import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Pencil, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedAvatarUrls } from "@/lib/storage/signed";
import type { Child } from "@/types/database";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.children" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default async function ChildrenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account.children");

  const supabase = await createSupabaseServerClient();
  const { data: children } = await supabase
    .from("children")
    .select("*")
    .order("registered_at", { ascending: true })
    .returns<Child[]>();

  const list = children ?? [];
  const signed = await signedAvatarUrls(
    supabase,
    list.map((c) => c.photo_url),
  );
  const photoById = new Map(list.map((c, i) => [c.id, signed[i]]));

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
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/mon-compte/enfants/nouveau">
                <Plus className="mr-2 h-4 w-4" />
                {t("addChild")}
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/mon-compte">{t("backToDashboard")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="container">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
              <p className="text-grey-700">{t("empty")}</p>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((child) => (
                <li
                  key={child.id}
                  className="flex flex-col gap-3 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="border-grey-200 text-grey-400 relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-grey-100">
                        {photoById.get(child.id) ? (
                          <Image
                            src={photoById.get(child.id) as string}
                            alt={`${child.first_name} ${child.last_name}`}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <User className="h-6 w-6" />
                        )}
                      </span>
                      <div>
                        <h2 className="font-anton text-xl uppercase text-navy">
                          {child.first_name} {child.last_name}
                        </h2>
                        <p className="text-sm text-grey-500">
                          {t("ageYears", { age: calcAge(child.birth_date) })}
                        </p>
                      </div>
                    </div>
                    {child.level && (
                      <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold text-orange">
                        {t(`levels.${child.level}`)}
                      </span>
                    )}
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="self-start"
                  >
                    <Link
                      href={{
                        pathname: "/mon-compte/enfants/[id]",
                        params: { id: child.id },
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("edit")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
