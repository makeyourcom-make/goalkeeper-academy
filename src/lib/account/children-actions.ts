"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChildActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const CHILD_LEVELS = [
  "debutant",
  "intermediaire",
  "avance",
  "competition",
] as const;
const HANDS = ["droite", "gauche", "ambidextre"] as const;

const CHILD_SCHEMA = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  level: z
    .string()
    .optional()
    .transform((v) =>
      v && CHILD_LEVELS.includes(v as (typeof CHILD_LEVELS)[number])
        ? (v as (typeof CHILD_LEVELS)[number])
        : null,
    ),
  dominant_hand: z
    .string()
    .optional()
    .transform((v) =>
      v && HANDS.includes(v as (typeof HANDS)[number])
        ? (v as (typeof HANDS)[number])
        : null,
    ),
  medical_notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  photo_consent: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

function parseChildForm(formData: FormData) {
  return CHILD_SCHEMA.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    birth_date: formData.get("birth_date"),
    level: formData.get("level") ?? "",
    dominant_hand: formData.get("dominant_hand") ?? "",
    medical_notes: formData.get("medical_notes") ?? "",
    photo_consent: formData.get("photo_consent"),
  });
}

export async function createChild(
  _prev: ChildActionState,
  formData: FormData,
): Promise<ChildActionState> {
  const parsed = parseChildForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "errorUnauthenticated" };

  const { error } = await supabase.from("children").insert({
    parent_id: user.id,
    club_id: null,
    registration_type: null,
    ...parsed.data,
  });

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  const locale = String(formData.get("locale") ?? "fr");
  revalidatePath(`/${locale}/mon-compte`, "layout");
  redirect(`/${locale}/mon-compte/enfants`);
}

export async function updateChild(
  _prev: ChildActionState,
  formData: FormData,
): Promise<ChildActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "errorValidation" };

  const parsed = parseChildForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "errorUnauthenticated" };

  const { error } = await supabase
    .from("children")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  const locale = String(formData.get("locale") ?? "fr");
  revalidatePath(`/${locale}/mon-compte`, "layout");
  return { status: "success", message: "success" };
}

export async function deleteChild(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "fr");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("children").delete().eq("id", id);

  revalidatePath(`/${locale}/mon-compte`, "layout");
  redirect(`/${locale}/mon-compte/enfants`);
}
