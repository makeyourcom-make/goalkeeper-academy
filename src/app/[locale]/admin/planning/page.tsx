import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  MapPin,
  Clock,
  Users,
  Pencil,
  Trash2,
  Repeat,
  Check,
  Undo2,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SessionForm } from "@/components/admin/session-form";
import { MonthCalendar } from "@/components/admin/month-calendar";
import { deleteSession, setSessionStatus } from "@/lib/admin/planning-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_LOCATION = "Terrain de la Mêlée, Aigle";

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
};

type CoachQ = {
  id: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};
type ChildQ = { id: string; first_name: string; last_name: string };
type SessionQ = {
  id: string;
  title: string;
  location: string | null;
  meet_at: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  series_id: string | null;
  is_private: boolean | null;
  coaches: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  session_attendees: { child_id: string }[];
};

function fullName(
  p: { first_name: string | null; last_name: string | null } | null,
): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.planning" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminPlanningPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { month: monthParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.planning");

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const m = /^(\d{4})-(\d{2})$/.exec(monthParam ?? "");
  const calYear = m ? Number(m[1]) : now.getFullYear();
  const calMonth = m ? Number(m[2]) - 1 : now.getMonth(); // 0-11

  const supabase = await createSupabaseServerClient();
  const [coachesRes, childrenRes, sessionsRes] = await Promise.all([
    supabase
      .from("coaches")
      .select("id, profiles(first_name, last_name)")
      .eq("active", true)
      .returns<CoachQ[]>(),
    supabase
      .from("children")
      .select("id, first_name, last_name")
      .order("first_name")
      .returns<ChildQ[]>(),
    supabase
      .from("sessions")
      .select(
        "id, title, location, meet_at, starts_at, ends_at, status, series_id, is_private, coaches(profiles(first_name, last_name)), session_attendees(child_id)",
      )
      .order("starts_at", { ascending: true })
      .returns<SessionQ[]>(),
  ]);

  const coaches = (coachesRes.data ?? []).map((c) => ({
    id: c.id,
    name: fullName(c.profiles) || "Coach",
  }));
  const keepers = (childrenRes.data ?? []).map((k) => ({
    id: k.id,
    name: `${k.first_name} ${k.last_name}`.trim(),
  }));
  const sessions = sessionsRes.data ?? [];

  // Sessions falling within the displayed calendar month.
  const calendarSessions = sessions
    .filter((s) => {
      const d = new Date(s.starts_at);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    })
    .map((s) => ({ id: s.id, title: s.title, starts_at: s.starts_at }));

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(calYear, calMonth, 1));

  // Two buckets so each can be collapsed independently: what is still to come
  // (open by default) and what already happened (folded away, newest first).
  const startOfToday = new Date(todayIso);
  const future = sessions.filter((s) => new Date(s.starts_at) >= startOfToday);
  const past = sessions
    .filter((s) => new Date(s.starts_at) < startOfToday)
    .reverse()
    .slice(0, 40);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  // One session card, shared by both sections.
  const sessionCard = (s: SessionQ) => (
    <li
      key={s.id}
      className="rounded-2xl border border-grey-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-anton text-base uppercase text-navy">{s.title}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-orange">
            {dateFmt.format(new Date(s.starts_at))}
          </p>
          {s.is_private && (
            <span className="mt-1 inline-flex rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
              {t("privateBadge")}
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            s.status === "completed"
              ? "bg-success/15 text-success"
              : s.status === "cancelled"
                ? "bg-error/10 text-error"
                : "bg-grey-100 text-grey-700"
          }`}
        >
          {t(`status.${s.status}`)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey-700">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4 text-orange" />
          {s.meet_at
            ? `${t("meet")} ${timeFmt.format(new Date(s.meet_at))} · `
            : ""}
          {timeFmt.format(new Date(s.starts_at))}–
          {timeFmt.format(new Date(s.ends_at))}
        </span>
        {s.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4 text-orange" />
            {s.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4 text-orange" />
          {t("keepersCount", {
            count: s.session_attendees?.length ?? 0,
          })}
        </span>
      </div>
      {fullName(s.coaches?.profiles ?? null) && (
        <p className="mt-1 text-xs text-grey-500">
          {t("coachLabel")}: {fullName(s.coaches?.profiles ?? null)}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-grey-100 pt-3">
        <form action={setSessionStatus}>
          <input type="hidden" name="id" value={s.id} />
          <input
            type="hidden"
            name="status"
            value={s.status === "completed" ? "scheduled" : "completed"}
          />
          {s.status === "completed" ? (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-grey-500"
            >
              <Undo2 className="mr-1 h-4 w-4" />
              {t("reopen")}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-success"
            >
              <Check className="mr-1 h-4 w-4" />
              {t("markDone")}
            </Button>
          )}
        </form>
        {s.series_id && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-grey-500">
            <Repeat className="h-3.5 w-3.5" />
            {t("seriesBadge")}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link
              href={{
                pathname: "/admin/planning/[id]",
                params: { id: s.id },
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {t("edit")}
            </Link>
          </Button>
          <form action={deleteSession}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="stay" value="1" />
            <button
              type="submit"
              aria-label={t("deleteOne")}
              title={t("deleteOne")}
              className="text-grey-400 flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </span>
      </div>
    </li>
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
        <p className="max-w-2xl text-grey-700">{t("subtitle")}</p>
      </div>

      {/* Month calendar */}
      <div className="mt-8">
        <MonthCalendar
          year={calYear}
          month={calMonth}
          sessions={calendarSessions}
          locale={locale}
          monthLabel={monthLabel}
          prevMonth={shiftMonth(calYear, calMonth, -1)}
          nextMonth={shiftMonth(calYear, calMonth, 1)}
          basePath="/admin/planning"
          todayIso={todayIso}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Create */}
        <SessionForm
          coaches={coaches}
          keepers={keepers}
          defaultLocation={DEFAULT_LOCATION}
        />

        {/* List — collapsible sections */}
        <div className="flex flex-col gap-4">
          <details open className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <ChevronRight className="h-5 w-5 text-orange transition-transform group-open:rotate-90" />
              <h2 className="font-anton text-xl uppercase text-navy">
                {t("upcomingHeading")}
              </h2>
              <span className="rounded-full bg-orange/10 px-2 py-0.5 text-xs font-semibold text-orange">
                {future.length}
              </span>
            </summary>
            <div className="mt-3">
              {future.length === 0 ? (
                <p className="rounded-2xl border border-grey-100 bg-white p-6 text-sm text-grey-500 shadow-sm">
                  {t("empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {future.map(sessionCard)}
                </ul>
              )}
            </div>
          </details>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <ChevronRight className="h-5 w-5 text-grey-500 transition-transform group-open:rotate-90" />
              <h2 className="font-anton text-xl uppercase text-grey-700">
                {t("pastHeading")}
              </h2>
              <span className="rounded-full bg-grey-100 px-2 py-0.5 text-xs font-semibold text-grey-700">
                {past.length}
              </span>
            </summary>
            <div className="mt-3">
              {past.length === 0 ? (
                <p className="rounded-2xl border border-grey-100 bg-white p-6 text-sm text-grey-500 shadow-sm">
                  {t("pastEmpty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">{past.map(sessionCard)}</ul>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
