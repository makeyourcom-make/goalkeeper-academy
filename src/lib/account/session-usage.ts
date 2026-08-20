import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUsage = {
  used: number;
  total: number;
  remaining: number;
  // Sessions attended beyond the paid package. Kept apart from `remaining`
  // (which stays >= 0 so the parent view never shows a negative balance) so the
  // admin can spot a keeper who trained more than they paid for and invoice it.
  over: number;
};

// Per-keeper package tracking. A session is "used" once it is marked completed
// ("effectuée") — every convened keeper consumes one, present or absent. The
// total allotment is the sum of the keeper's ACTIVE registration session
// counts (découverte = 1, Tour = 18, saison = 36, or a custom package).
// "Active" = pending or confirmed: a QR-bill subscriber trains before their
// first instalment is paid (pending must count), while cancelled/refunded
// registrations must not (a cancelled duplicate order would double the
// package). Runs with the caller's client, so RLS naturally scopes a parent
// to their own children.
export async function sessionUsageByChild(
  db: SupabaseClient,
  childIds: string[],
): Promise<Map<string, SessionUsage>> {
  const map = new Map<string, SessionUsage>();
  if (childIds.length === 0) return map;

  const [regsRes, attRes] = await Promise.all([
    db
      .from("registrations")
      .select("child_id, sessions_count, status, formula")
      .in("child_id", childIds)
      .in("status", ["pending", "confirmed"]),
    db
      .from("session_attendees")
      .select("child_id, sessions(status)")
      .in("child_id", childIds),
  ]);

  // Group by (keeper, formula). Within a group the CONFIRMED registrations win:
  // a still-"pending" one is only counted when no confirmed registration exists
  // for that same formula. That way a QR-bill subscriber who trains before
  // paying their first instalment still sees their package, while an abandoned
  // duplicate (parent resubmitted the form after a payment that never went
  // through) no longer doubles it.
  const groups = new Map<string, { confirmed: number[]; pending: number[] }>();
  for (const r of (regsRes.data ?? []) as {
    child_id: string;
    sessions_count: number | null;
    status: string;
    formula: string | null;
  }[]) {
    const key = `${r.child_id}|${r.formula ?? ""}`;
    const g = groups.get(key) ?? { confirmed: [], pending: [] };
    (r.status === "confirmed" ? g.confirmed : g.pending).push(
      r.sessions_count ?? 0,
    );
    groups.set(key, g);
  }

  const totals = new Map<string, number>();
  for (const [key, g] of groups) {
    const childId = key.slice(0, key.lastIndexOf("|"));
    const counted = g.confirmed.length > 0 ? g.confirmed : g.pending;
    const sum = counted.reduce((a, b) => a + b, 0);
    totals.set(childId, (totals.get(childId) ?? 0) + sum);
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
    map.set(id, {
      used: u,
      total,
      remaining: Math.max(0, total - u),
      over: Math.max(0, u - total),
    });
  }
  return map;
}
