"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const SCHEMA = z.object({
  sessionId: z.string().uuid(),
  childId: z.string().uuid(),
  status: z.enum(["present", "absent"]),
});

// Parent / club marks one of their keepers present or absent for a session.
// RLS (attendees_update_own) guarantees the row belongs to one of their
// children, so an out-of-scope update simply affects zero rows.
export async function setAttendance(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = SCHEMA.safeParse({
    sessionId: formData.get("sessionId"),
    childId: formData.get("childId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  const p = parsed.data;

  await supabase
    .from("session_attendees")
    .update({ attendance_status: p.status })
    .eq("session_id", p.sessionId)
    .eq("child_id", p.childId);

  revalidatePath("/mon-compte/planning");
}
