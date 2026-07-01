import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { viewAsUser } from "@/lib/admin/impersonation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.parents" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminParentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.parents");

  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["parent", "club"])
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  const list = profiles ?? [];
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">
          {t("count", { count: list.length })}
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                <th className="px-4 py-3 font-medium">{t("table.email")}</th>
                <th className="px-4 py-3 font-medium">{t("table.role")}</th>
                <th className="px-4 py-3 font-medium">{t("table.language")}</th>
                <th className="px-4 py-3 font-medium">{t("table.joined")}</th>
                <th className="px-4 py-3 font-medium">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                list.map((profile) => (
                  <tr key={profile.id} className="hover:bg-grey-100/40">
                    <td className="px-4 py-3 font-medium text-navy">
                      {profile.first_name || profile.last_name
                        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-grey-700">{profile.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
                        {t(`roles.${profile.role}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase text-grey-700">
                      {profile.language}
                    </td>
                    <td className="px-4 py-3 text-grey-500">
                      {dateFmt.format(new Date(profile.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <form action={viewAsUser}>
                        <input type="hidden" name="userId" value={profile.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-grey-300 px-3 py-1 text-xs font-medium text-navy transition hover:border-orange hover:text-orange"
                        >
                          <Eye className="h-3.5 w-3.5" /> {t("viewAs")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
