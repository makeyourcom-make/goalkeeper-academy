"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const SCHEMA = z.object({
  coachId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  sessionsCount: z.coerce.number().int().min(0),
  rate: z.coerce.number().min(0),
  paid: z.enum(["true", "false"]),
});

export async function setCoachPayment(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return;

  const parsed = SCHEMA.safeParse({
    coachId: formData.get("coachId"),
    period: formData.get("period"),
    sessionsCount: formData.get("sessionsCount"),
    rate: formData.get("rate"),
    paid: formData.get("paid"),
  });
  if (!parsed.success) return;
  const p = parsed.data;

  const amount = Math.round(p.sessionsCount * p.rate * 100) / 100;
  const isPaid = p.paid === "true";

  await supabase.from("coach_payments").upsert(
    {
      coach_id: p.coachId,
      period: p.period,
      sessions_count: p.sessionsCount,
      rate_per_session: p.rate,
      amount,
      status: isPaid ? "paid" : "pending",
      paid_at: isPaid ? new Date().toISOString() : null,
    },
    { onConflict: "coach_id,period" },
  );

  revalidatePath("/", "layout");
}
