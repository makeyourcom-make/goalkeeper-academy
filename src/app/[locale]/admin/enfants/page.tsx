import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessionUsageByChild } from "@/lib/account/session-usage";

type Props = {
  params: Promise<{ locale: string }>;
};

type ChildRow = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  level: string | null;
  registered_at: string;
  parent: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.children" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default async function AdminChildrenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.children");

  const supabase = await createSupabaseServerClient();
  const { data: children } = await supabase
    .from("children")
    .select(
      "id, first_name, last_name, birth_date, level, registered_at, parent:profiles!children_parent_id_fkey(first_name, last_name, email)",
    )
    .order("registered_at", { ascending: false })
    .returns<ChildRow[]>();

  const list = children ?? [];
  const usage = await sessionUsageByChild(
    supabase,
    list.map((c) => c.id),
  );

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
                <th className="px-4 py-3 font-medium">{t("table.age")}</th>
                <th className="px-4 py-3 font-medium">{t("table.level")}</th>
                <th className="px-4 py-3 font-medium">{t("table.sessions")}</th>
                <th className="px-4 py-3 font-medium">{t("table.parent")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                list.map((child) => {
                  const u = usage.get(child.id);
                  return (
                    <tr key={child.id} className="hover:bg-grey-100/40">
                      <td className="px-4 py-3 font-medium text-navy">
                        <Link
                          href={{
                            pathname: "/admin/enfants/[id]",
                            params: { id: child.id },
                          }}
                          className="underline-offset-2 hover:text-orange hover:underline"
                        >
                          {child.first_name} {child.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        {t("ageYears", { age: calcAge(child.birth_date) })}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        {child.level ? t(`levels.${child.level}`) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {u && u.total > 0 ? (
                          <div className="leading-tight">
                            <div className="font-medium text-navy">
                              {t("sessionsUsed", {
                                used: u.used,
                                total: u.total,
                              })}
                            </div>
                            <div className="text-xs text-grey-500">
                              {t("sessionsRemaining", { count: u.remaining })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-grey-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-grey-700">
                        {child.parent
                          ? `${child.parent.first_name ?? ""} ${child.parent.last_name ?? ""}`.trim() ||
                            child.parent.email
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
