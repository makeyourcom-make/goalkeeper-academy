import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUsage = { used: number; total: number; remaining: number };

// Per-keeper package tracking. A session is "used" once it is marked completed
// ("effectuée") — every convened keeper consumes one, present or absent. The
// total allotment is the sum of the keeper's registration session counts
// (découverte = 1, Tour = 18, saison = 36, or a custom package). Runs with the
// caller's client, so RLS naturally scopes a parent to their own children.
export async function sessionUsageByChild(
  db: SupabaseClient,
  childIds: string[],
): Promise<Map<string, SessionUsage>> {
  const map = new Map<string, SessionUsage>();
  if (childIds.length === 0) return map;

  const [regsRes, attRes] = await Promise.all([
    db
      .from("registrations")
      .select("child_id, sessions_count")
      .in("child_id", childIds),
    db
      .from("session_attendees")
      .select("child_id, sessions(status)")
      .in("child_id", childIds),
  ]);

  const totals = new Map<string, number>();
  for (const r of (regsRes.data ?? []) as {
    child_id: string;
    sessions_count: number | null;
  }[]) {
    totals.set(
      r.child_id,
      (totals.get(r.child_id) ?? 0) + (r.sessions_count ?? 0),
    );
  }

  const used = new Map<string, number>();
  // session_attendees → sessions is a to-one FK, so `sessions` is a single row
  // (or null) at runtime; the client infers an array, hence the unknown cast.
  for (const a of (attRes.data ?? []) as unknown as {
    child_id: string;
    sessions: { status: string } | null;
  }[]) {
    if (a.sessions?.status === "completed") {
      used.set(a.child_id, (used.get(a.child_id) ?? 0) + 1);
    }
  }

  for (const id of childIds) {
    const total = totals.get(id) ?? 0;
    const u = used.get(id) ?? 0;
    map.set(id, { used: u, total, remaining: Math.max(0, total - u) });
  }
  return map;
}
