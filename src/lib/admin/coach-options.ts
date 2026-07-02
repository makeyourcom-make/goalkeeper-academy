import type { SupabaseClient } from "@supabase/supabase-js";

export type CoachOption = { id: string; name: string };

type CoachRow = {
  id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};

// Selectable list of coaches (id + display name) for the "paid by" field on
// expenses. Admin-only context (RLS lets admins read the joined profiles).
export async function getCoachOptions(
  supabase: SupabaseClient,
): Promise<CoachOption[]> {
  const { data } = await supabase
    .from("coaches")
    .select("id, profiles(first_name, last_name, email)")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .returns<CoachRow[]>();

  return (data ?? []).map((c) => {
    const name =
      `${c.profiles?.first_name ?? ""} ${c.profiles?.last_name ?? ""}`.trim() ||
      c.profiles?.email ||
      "—";
    return { id: c.id, name };
  });
}
