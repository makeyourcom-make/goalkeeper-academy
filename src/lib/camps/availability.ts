import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Number of confirmed (paid) registrations for a camp, by slug. Returns null on
// any error (e.g. service-role key missing at build) so callers can fall back to
// the static camps.json counter instead of crashing.
export async function confirmedCountForSlug(
  slug: string,
): Promise<number | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: camp } = await admin
      .from("camps")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();
    if (!camp) return 0; // no camp row yet → nobody registered

    const { count } = await admin
      .from("camp_registrations")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", camp.id)
      .eq("status", "confirmed");
    return count ?? 0;
  } catch {
    return null;
  }
}
