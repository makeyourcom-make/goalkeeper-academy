"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FinanceFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(160),
  amount: z.coerce.number().positive().max(1_000_000),
  occurred_on: z.string().regex(DATE),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

async function requireAdmin() {
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

export async function addTransaction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: "errorAuth" };

  const parsed = SCHEMA.safeParse({
    kind: formData.get("kind"),
    category: formData.get("category"),
    label: formData.get("label"),
    amount: formData.get("amount"),
    occurred_on: formData.get("occurred_on"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }

  const { error } = await supabase.from("transactions").insert({
    kind: parsed.data.kind,
    category: parsed.data.category,
    label: parsed.data.label,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurred_on,
    notes: parsed.data.notes,
  });
  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "success" };
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/", "layout");
}
