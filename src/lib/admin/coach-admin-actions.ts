"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Confirms the caller is an admin, returning the service-role client used to
// change another user's role / coach row (bypasses profiles RLS by design).
async function requireAdminService() {
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
  return createSupabaseAdminClient();
}

// Promote an existing (parent/club) account to coach: flip the role and ensure
// an active coach row exists.
export async function promoteToCoach(formData: FormData): Promise<void> {
  const admin = await requireAdminService();
  if (!admin) return;

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return;

  await admin.from("profiles").update({ role: "coach" }).eq("id", profileId);

  const { data: existing } = await admin
    .from("coaches")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing) {
    await admin.from("coaches").update({ active: true }).eq("id", existing.id);
  } else {
    await admin.from("coaches").insert({ profile_id: profileId, active: true });
  }

  revalidatePath("/", "layout");
}

// Complete / edit a coach profile from the admin: name (on profiles),
// speciality + rate per session (on coaches). Rate is in whole CHF.
export async function setCoachDetails(formData: FormData): Promise<void> {
  const admin = await requireAdminService();
  if (!admin) return;

  const coachId = String(formData.get("coachId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (!coachId || !profileId) return;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const speciality = String(formData.get("speciality") ?? "").trim();
  const rateRaw = String(formData.get("rate") ?? "").replace(",", ".");
  const rate = Number.parseFloat(rateRaw);

  const coachUpdate: { speciality: string | null; rate_per_session?: number } =
    {
      speciality: speciality || null,
    };
  if (Number.isFinite(rate) && rate >= 0) coachUpdate.rate_per_session = rate;
  await admin.from("coaches").update(coachUpdate).eq("id", coachId);

  await admin
    .from("profiles")
    .update({ first_name: firstName || null, last_name: lastName || null })
    .eq("id", profileId);

  revalidatePath("/", "layout");
}

// Remove the coach role: send the account back to "parent" and drop its coach
// row. If the coach is still referenced (e.g. by sessions) the delete fails, so
// we deactivate the row instead.
export async function demoteCoach(formData: FormData): Promise<void> {
  const admin = await requireAdminService();
  if (!admin) return;

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return;

  const del = await admin.from("coaches").delete().eq("profile_id", profileId);
  if (del.error) {
    await admin
      .from("coaches")
      .update({ active: false })
      .eq("profile_id", profileId);
  }

  await admin.from("profiles").update({ role: "parent" }).eq("id", profileId);

  revalidatePath("/", "layout");
}
