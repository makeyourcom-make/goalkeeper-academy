import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendReminders, sendCoachReminder } from "@/lib/email/session-emails";

// Runs daily (Vercel Cron) — reminds attendees a few days before a session.
export const dynamic = "force-dynamic";

const LEAD_DAYS = 3;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function hhmm(iso: string | null): string {
  return iso ? iso.slice(11, 16) : "";
}

type SessionRow = {
  id: string;
  title: string;
  location: string | null;
  meet_at: string | null;
  starts_at: string;
  ends_at: string;
  coach_id: string | null;
  coach_reminded_at: string | null;
};

export async function GET(req: NextRequest) {
  // Vercel Cron includes "Authorization: Bearer <CRON_SECRET>". Fail closed: if
  // the secret is unset or the header doesn't match, refuse — the endpoint must
  // never be publicly triggerable.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const target = new Date();
  target.setUTCDate(target.getUTCDate() + LEAD_DAYS);
  const nextDay = new Date(target);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const dayStart = `${dateStr(target)}T00:00:00`;
  const dayEnd = `${dateStr(nextDay)}T00:00:00`;

  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, title, location, meet_at, starts_at, ends_at, coach_id, coach_reminded_at",
    )
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd)
    .eq("status", "scheduled")
    .returns<SessionRow[]>();

  let reminders = 0;
  for (const s of sessions ?? []) {
    const startTime = hhmm(s.starts_at);
    const details = {
      title: s.title,
      location: s.location ?? "",
      meetTime: hhmm(s.meet_at) || startTime,
      startTime,
      endTime: hhmm(s.ends_at),
      date: s.starts_at.slice(0, 10),
      inDays: LEAD_DAYS,
    };

    const { data: attendees } = await admin
      .from("session_attendees")
      .select("child_id")
      .eq("session_id", s.id)
      .is("reminded_at", null)
      .returns<{ child_id: string }[]>();
    const childIds = (attendees ?? []).map((a) => a.child_id);

    if (childIds.length > 0) {
      await sendReminders(admin, { childIds, ...details });
      // Mark them reminded so a second daily run never double-sends.
      await admin
        .from("session_attendees")
        .update({ reminded_at: new Date().toISOString() })
        .eq("session_id", s.id)
        .is("reminded_at", null);
      reminders += childIds.length;
    }

    // Coach reminder (once per session, via coach_reminded_at).
    if (s.coach_id && !s.coach_reminded_at) {
      const { count } = await admin
        .from("session_attendees")
        .select("child_id", { count: "exact", head: true })
        .eq("session_id", s.id);
      await sendCoachReminder(admin, {
        coachId: s.coach_id,
        ...details,
        keeperCount: count ?? 0,
      });
      await admin
        .from("sessions")
        .update({ coach_reminded_at: new Date().toISOString() })
        .eq("id", s.id);
    }
  }

  return NextResponse.json({
    ok: true,
    day: dateStr(target),
    sessions: sessions?.length ?? 0,
    reminders,
  });
}
