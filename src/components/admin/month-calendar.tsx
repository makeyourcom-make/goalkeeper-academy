import { ChevronLeft, ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CalendarSession = {
  id: string;
  title: string;
  starts_at: string;
};

type Props = {
  year: number;
  month: number; // 0-11
  sessions: CalendarSession[];
  locale: string;
  monthLabel: string;
  prevMonth: string; // "YYYY-MM"
  nextMonth: string;
  basePath: "/admin/planning" | "/mon-compte/planning";
  todayIso: string; // "YYYY-MM-DD" of "today"
};

export function MonthCalendar({
  year,
  month,
  sessions,
  locale,
  monthLabel,
  prevMonth,
  nextMonth,
  basePath,
  todayIso,
}: Props) {
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    // Monday-first labels
    const d = new Date(2024, 0, 1 + i); // Jan 1 2024 is a Monday
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  });

  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  // group sessions by day-of-month
  const byDay = new Map<number, CalendarSession[]>();
  for (const s of sessions) {
    const day = new Date(s.starts_at).getDate();
    const arr = byDay.get(day) ?? [];
    arr.push(s);
    byDay.set(day, arr);
  }

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-grey-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={{ pathname: basePath, query: { month: prevMonth } }}
          className="border-grey-200 flex h-9 w-9 items-center justify-center rounded-lg border text-navy hover:bg-grey-100"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h2 className="font-anton text-xl uppercase text-navy">{monthLabel}</h2>
        <Link
          href={{ pathname: basePath, query: { month: nextMonth } }}
          className="border-grey-200 flex h-9 w-9 items-center justify-center rounded-lg border text-navy hover:bg-grey-100"
          aria-label="Suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-grey-500">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - offset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const iso = inMonth
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            : "";
          const isToday = iso === todayIso;
          const daySessions = inMonth ? (byDay.get(dayNum) ?? []) : [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[84px] rounded-lg border p-1.5 text-left",
                inMonth
                  ? "border-grey-100 bg-white"
                  : "border-transparent bg-grey-100/30",
              )}
            >
              {inMonth && (
                <>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-orange text-white" : "text-grey-500",
                    )}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="truncate rounded bg-navy/5 px-1.5 py-0.5 text-[11px] font-medium text-navy"
                        title={s.title}
                      >
                        <span className="text-orange">
                          {timeFmt.format(new Date(s.starts_at))}
                        </span>{" "}
                        {s.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
