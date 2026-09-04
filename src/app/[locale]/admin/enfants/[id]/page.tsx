import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { sessionUsageByChild } from "@/lib/account/session-usage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type ChildQ = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  level: string | null;
  clubs: { name: string } | null;
  parent: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

type SessionQ = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: string;
  coaches: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

type HistoryQ = { sessions: SessionQ | null };

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function fullName(
  p: { first_name: string | null; last_name: string | null } | null,
): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.children" });
  return {
    title: t("detail.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminChildDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.children");

  const supabase = await createSupabaseServerClient();
  const [childRes, historyRes] = await Promise.all([
    supabase
      .from("children")
      .select(
        "id, first_name, last_name, birth_date, level, clubs(name), parent:profiles!children_parent_id_fkey(first_name, last_name, email)",
      )
      .eq("id", id)
      .maybeSingle<ChildQ>(),
    supabase
      .from("session_attendees")
      .select(
        "sessions(id, title, starts_at, ends_at, location, status, coaches(profiles(first_name, last_name)))",
      )
      .eq("child_id", id)
      .returns<HistoryQ[]>(),
  ]);

  const child = childRes.data;
  if (!child) notFound();

  const usage = (await sessionUsageByChild(supabase, [id])).get(id) ?? {
    used: 0,
    total: 0,
    remaining: 0,
    over: 0,
  };

  // Most recent first: the sessions actually consumed sit at the top.
  const rows = (historyRes.data ?? [])
    .map((r) => r.sessions)
    .filter((s): s is SessionQ => Boolean(s))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const parentName = child.parent
    ? fullName(child.parent) || child.parent.email
    : "—";
  const pct =
    usage.total > 0
      ? Math.min(100, Math.round((usage.used / usage.total) * 100))
      : 0;

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {child.first_name} {child.last_name}
        </h1>
        <p className="text-grey-700">
          {t("ageYears", { age: calcAge(child.birth_date) })}
          {child.level ? ` · ${t(`levels.${child.level}`)}` : ""} ·{" "}
          {t("table.parent")}: {parentName}
        </p>
        <Button asChild variant="ghost" className="self-start">
          <Link href="/admin/enfants">{t("detail.back")}</Link>
        </Button>
      </div>

      {/* Package summary */}
      <div className="mt-8 rounded-2xl border border-grey-100 bg-white p-6 shadow-sm">
        <h2 className="font-anton text-lg uppercase text-navy">
          {t("detail.packageTitle")}
        </h2>
        {child.clubs ? (
          <div className="mt-4">
            <span className="inline-flex rounded-full bg-orange/10 px-3 py-1 text-sm font-semibold text-orange">
              {t("detail.clubPackage", { club: child.clubs.name })}
            </span>
            <p className="mt-3 text-sm text-grey-700">
              {t("detail.clubPackageHint", { count: usage.used })}
            </p>
          </div>
        ) : usage.total === 0 && usage.used === 0 ? (
          <p className="mt-3 text-sm text-grey-500">{t("detail.noPackage")}</p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-grey-500">
                  {t("detail.totalLabel")}
                </p>
                <p className="font-anton text-h3 text-navy">{usage.total}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-grey-500">
                  {t("detail.usedLabel")}
                </p>
                <p className="font-anton text-h3 text-navy">{usage.used}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-grey-500">
                  {t("detail.remainingLabel")}
                </p>
                <p className="font-anton text-h3 text-orange">
                  {usage.remaining}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-grey-100">
              <div
                className="h-full rounded-full bg-orange"
                style={{ width: `${pct}%` }}
              />
            </div>
            {usage.over > 0 && (
              <p className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {t("detail.overWarning", { count: usage.over })}
              </p>
            )}
          </>
        )}
      </div>

      {/* History */}
      <h2 className="mt-10 font-anton text-xl uppercase text-navy">
        {t("detail.historyTitle")}
      </h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-grey-100 bg-grey-100/40 text-left text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t("detail.table.date")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("detail.table.session")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("detail.table.coach")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("detail.table.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-grey-500"
                  >
                    {t("detail.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="hover:bg-grey-100/40">
                    <td className="whitespace-nowrap px-4 py-3 text-grey-700">
                      <div className="font-medium text-navy">
                        {dateFmt.format(new Date(s.starts_at))}
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-grey-500">
                        <Clock className="h-3.5 w-3.5" />
                        {timeFmt.format(new Date(s.starts_at))}–
                        {timeFmt.format(new Date(s.ends_at))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-grey-700">
                      <div className="font-medium text-navy">{s.title}</div>
                      {s.location && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-grey-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {s.location}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-grey-700">
                      {fullName(s.coaches?.profiles ?? null) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === "completed"
                            ? "bg-success/15 text-success"
                            : s.status === "cancelled"
                              ? "bg-error/10 text-error"
                              : "bg-grey-100 text-grey-700"
                        }`}
                      >
                        {t(`detail.status.${s.status}`)}
                      </span>
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
