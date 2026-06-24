import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trash2, CalendarX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  SessionEditForm,
  type SessionEditData,
} from "@/components/admin/session-edit-form";
import { deleteSession, deleteSeries } from "@/lib/admin/planning-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
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
  coach_id: string | null;
  series_id: string | null;
  session_attendees: { child_id: string }[];
};

function fullName(
  p: { first_name: string | null; last_name: string | null } | null,
): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

// Extract "HH:MM" / "YYYY-MM-DD" directly from the stored timestamp string.
function datePart(ts: string | null): string {
  return ts ? ts.slice(0, 10) : "";
}
function timePart(ts: string | null): string {
  return ts ? ts.slice(11, 16) : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.planning" });
  return { title: t("editMetaTitle"), robots: { index: false, follow: false } };
}

export default async function EditSessionPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.planning");

  const supabase = await createSupabaseServerClient();
  const [sessionRes, coachesRes, childrenRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, title, location, meet_at, starts_at, ends_at, coach_id, series_id, session_attendees(child_id)",
      )
      .eq("id", id)
      .maybeSingle<SessionQ>(),
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
  ]);

  const s = sessionRes.data;
  if (!s) notFound();

  const coaches = (coachesRes.data ?? []).map((c) => ({
    id: c.id,
    name: fullName(c.profiles) || "Coach",
  }));
  const keepers = (childrenRes.data ?? []).map((k) => ({
    id: k.id,
    name: `${k.first_name} ${k.last_name}`.trim(),
  }));

  const session: SessionEditData = {
    id: s.id,
    title: s.title,
    date: datePart(s.starts_at),
    meetTime: timePart(s.meet_at),
    startTime: timePart(s.starts_at),
    endTime: timePart(s.ends_at),
    location: s.location ?? "",
    coachId: s.coach_id ?? "",
    childIds: (s.session_attendees ?? []).map((a) => a.child_id),
  };
  const isSeries = Boolean(s.series_id);

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("editTitle")}
        </h1>
        <Button asChild variant="ghost" className="self-start">
          <Link href="/admin/planning">{t("backToPlanning")}</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <SessionEditForm
          session={session}
          coaches={coaches}
          keepers={keepers}
        />

        {/* Danger zone */}
        <div className="flex h-fit flex-col gap-4 rounded-2xl border border-error/30 bg-error/5 p-6">
          <h2 className="font-anton text-lg uppercase text-error">
            {t("dangerTitle")}
          </h2>

          <form action={deleteSession} className="flex flex-col gap-1">
            <input type="hidden" name="id" value={session.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline" className="justify-start">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteOne")}
            </Button>
          </form>

          {isSeries && (
            <form action={deleteSeries} className="flex flex-col gap-1">
              <input type="hidden" name="id" value={session.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button
                type="submit"
                variant="destructive"
                className="justify-start"
              >
                <CalendarX className="mr-2 h-4 w-4" />
                {t("deleteSeries")}
              </Button>
              <span className="text-xs text-grey-500">
                {t("deleteSeriesHint")}
              </span>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
