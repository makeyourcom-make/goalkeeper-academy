"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return supabase;
}

export type SessionFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA = z.object({
  title: z.string().trim().min(1),
  date: z.string().regex(DATE),
  meetTime: z.string().regex(TIME),
  startTime: z.string().regex(TIME),
  endTime: z.string().regex(TIME),
  location: z.string().trim().min(1),
  coachId: z.string().trim(),
  repeat: z.enum(["none", "weekly"]).default("none"),
  repeatUntil: z.string().regex(DATE).optional().or(z.literal("")),
});

// All session dates (YYYY-MM-DD) for a weekly recurrence. Uses noon UTC to
// avoid day-boundary/DST issues; capped to keep things sane.
function buildDates(
  start: string,
  repeat: "none" | "weekly",
  until?: string,
): string[] {
  const dates = [start];
  if (repeat !== "weekly" || !until) return dates;
  const cur = new Date(`${start}T12:00:00Z`);
  const end = new Date(`${until}T12:00:00Z`);
  cur.setUTCDate(cur.getUTCDate() + 7);
  while (cur <= end && dates.length < 60) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return dates;
}

export async function createSession(
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "errorAuth" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { status: "error", message: "errorAuth" };
  }

  const parsed = SCHEMA.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    meetTime: formData.get("meetTime"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    coachId: formData.get("coachId") ?? "",
    repeat: formData.get("repeat") ?? "none",
    repeatUntil: formData.get("repeatUntil") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }
  const d = parsed.data;

  const childIds = formData.getAll("childIds").map(String).filter(Boolean);

  const dates = buildDates(d.date, d.repeat, d.repeatUntil || undefined);
  // Group the recurrence so it can later be edited/deleted as one series.
  const seriesId = dates.length > 1 ? randomUUID() : null;

  const { data: created, error } = await supabase
    .from("sessions")
    .insert(
      dates.map((dt) => ({
        title: d.title,
        coach_id: d.coachId || null,
        location: d.location,
        meet_at: `${dt}T${d.meetTime}:00`,
        starts_at: `${dt}T${d.startTime}:00`,
        ends_at: `${dt}T${d.endTime}:00`,
        status: "scheduled",
        series_id: seriesId,
      })),
    )
    .select("id");

  if (error || !created || created.length === 0) {
    return { status: "error", message: "errorGeneric" };
  }

  if (childIds.length > 0) {
    await supabase.from("session_attendees").insert(
      created.flatMap((s) =>
        childIds.map((child_id) => ({
          session_id: s.id,
          child_id,
          attendance_status: "registered",
        })),
      ),
    );
  }

  revalidatePath("/", "layout");
  return {
    status: "success",
    message: created.length > 1 ? "successMany" : "success",
  };
}

const UPDATE_SCHEMA = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  date: z.string().regex(DATE),
  meetTime: z.string().regex(TIME),
  startTime: z.string().regex(TIME),
  endTime: z.string().regex(TIME),
  location: z.string().trim().min(1),
  coachId: z.string().trim(),
});

// Edit a single session (its date/times/location/coach and convened keepers).
export async function updateSession(
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const supabase = await getAdminClient();
  if (!supabase) return { status: "error", message: "errorAuth" };

  const parsed = UPDATE_SCHEMA.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    date: formData.get("date"),
    meetTime: formData.get("meetTime"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    coachId: formData.get("coachId") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }
  const d = parsed.data;

  const { error } = await supabase
    .from("sessions")
    .update({
      title: d.title,
      coach_id: d.coachId || null,
      location: d.location,
      meet_at: `${d.date}T${d.meetTime}:00`,
      starts_at: `${d.date}T${d.startTime}:00`,
      ends_at: `${d.date}T${d.endTime}:00`,
    })
    .eq("id", d.id);
  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  // Replace the convened keepers with the new selection.
  const childIds = formData.getAll("childIds").map(String).filter(Boolean);
  await supabase.from("session_attendees").delete().eq("session_id", d.id);
  if (childIds.length > 0) {
    await supabase.from("session_attendees").insert(
      childIds.map((child_id) => ({
        session_id: d.id,
        child_id,
        attendance_status: "registered",
      })),
    );
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "success" };
}

// Delete just this session.
export async function deleteSession(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "fr");
  const stay = formData.get("stay") === "1";
  if (supabase && id) {
    await supabase.from("sessions").delete().eq("id", id);
    revalidatePath("/", "layout");
  }
  if (!stay) redirect(`/${locale}/admin/planning`);
}

// Delete the whole recurring series this session belongs to (or just it if
// it is a one-off).
export async function deleteSeries(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "fr");
  if (supabase && id) {
    const { data: row } = await supabase
      .from("sessions")
      .select("series_id")
      .eq("id", id)
      .maybeSingle();
    if (row?.series_id) {
      await supabase.from("sessions").delete().eq("series_id", row.series_id);
    } else {
      await supabase.from("sessions").delete().eq("id", id);
    }
    revalidatePath("/", "layout");
  }
  redirect(`/${locale}/admin/planning`);
}
