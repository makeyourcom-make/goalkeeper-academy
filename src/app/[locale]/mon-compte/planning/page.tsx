import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar, MapPin, Clock, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { MonthCalendar } from "@/components/admin/month-calendar";
import { setAttendance } from "@/lib/account/attendance-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
};

type SessionInfo = {
  id: string;
  title: string;
  location: string | null;
  meet_at: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};
type AttendeeRow = {
  attendance_status: string;
  child_id: string;
  children: { first_name: string; last_name: string } | null;
  sessions: SessionInfo | null;
};

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account.planning" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PlanningPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { month: monthParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Account.planning");

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const m = /^(\d{4})-(\d{2})$/.exec(monthParam ?? "");
  const calYear = m ? Number(m[1]) : now.getFullYear();
  const calMonth = m ? Number(m[2]) - 1 : now.getMonth();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("session_attendees")
    .select(
      "attendance_status, child_id, children(first_name, last_name), sessions(id, title, location, meet_at, starts_at, ends_at, status)",
    )
    .returns<AttendeeRow[]>();

  const rows = (data ?? []).filter((r) => r.sessions);

  // Calendar: one entry per session (dedup across children).
  const seen = new Set<string>();
  const calendarSessions = rows
    .filter((r) => {
      const s = r.sessions!;
      const d = new Date(s.starts_at);
      if (d.getFullYear() !== calYear || d.getMonth() !== calMonth)
        return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .map((r) => ({
      id: r.sessions!.id,
      title: r.sessions!.title,
      starts_at: r.sessions!.starts_at,
    }));

  // List: upcoming sessions grouped, each child with a present/absent toggle.
  const upcomingRows = rows
    .filter((r) => new Date(r.sessions!.starts_at) >= new Date(todayIso))
    .sort(
      (a, b) =>
        new Date(a.sessions!.starts_at).getTime() -
        new Date(b.sessions!.starts_at).getTime(),
    );

  const grouped = new Map<
    string,
    { session: SessionInfo; rows: AttendeeRow[] }
  >();
  for (const r of upcomingRows) {
    const s = r.sessions!;
    const g = grouped.get(s.id) ?? { session: s, rows: [] };
    g.rows.push(r);
    grouped.set(s.id, g);
  }
  const sessionGroups = [...grouped.values()].slice(0, 20);

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(calYear, calMonth, 1));
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

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
        <div className="container flex flex-col gap-10">
          <MonthCalendar
            year={calYear}
            month={calMonth}
            sessions={calendarSessions}
            locale={locale}
            monthLabel={monthLabel}
            prevMonth={shiftMonth(calYear, calMonth, -1)}
            nextMonth={shiftMonth(calYear, calMonth, 1)}
            basePath="/mon-compte/planning"
            todayIso={todayIso}
          />

          <div className="flex flex-col gap-4">
            <h2 className="font-anton text-2xl uppercase text-navy">
              {t("upcomingTitle")}
            </h2>

            {sessionGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-grey-300 bg-grey-100/40 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <Calendar className="h-7 w-7" />
                </span>
                <h3 className="font-anton text-2xl uppercase text-navy">
                  {t("emptyTitle")}
                </h3>
                <p className="text-sm text-grey-700">{t("emptyDescription")}</p>
                <Button asChild variant="primary">
                  <Link href="/stages">{t("browseCamps")}</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {sessionGroups.map(({ session: s, rows: attendees }) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-grey-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 border-b border-grey-100 pb-3">
                      <p className="font-anton text-lg uppercase text-navy">
                        {s.title}
                      </p>
                      <p className="text-xs font-medium uppercase tracking-wide text-orange">
                        {dateFmt.format(new Date(s.starts_at))}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey-700">
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
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {attendees.map((r) => {
                        const present = r.attendance_status === "present";
                        const absent = r.attendance_status === "absent";
                        return (
                          <div
                            key={r.child_id}
                            className="flex flex-wrap items-center justify-between gap-3"
                          >
                            <span className="font-medium text-navy">
                              {r.children?.first_name} {r.children?.last_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <form action={setAttendance}>
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={s.id}
                                />
                                <input
                                  type="hidden"
                                  name="childId"
                                  value={r.child_id}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="present"
                                />
                                <button
                                  type="submit"
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                    present
                                      ? "border-success bg-success text-white"
                                      : "border-grey-200 text-grey-700 hover:border-success hover:text-success",
                                  )}
                                >
                                  <Check className="h-4 w-4" />
                                  {t("present")}
                                </button>
                              </form>
                              <form action={setAttendance}>
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={s.id}
                                />
                                <input
                                  type="hidden"
                                  name="childId"
                                  value={r.child_id}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="absent"
                                />
                                <button
                                  type="submit"
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                    absent
                                      ? "border-error bg-error text-white"
                                      : "border-grey-200 text-grey-700 hover:border-error hover:text-error",
                                  )}
                                >
                                  <X className="h-4 w-4" />
                                  {t("absent")}
                                </button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
