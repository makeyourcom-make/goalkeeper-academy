"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileUpdate } from "@/types/database";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const PROFILE_SCHEMA = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  language: z.enum(["fr", "en"]),
  marketing_consent: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = PROFILE_SCHEMA.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone") ?? "",
    language: formData.get("language"),
    marketing_consent: formData.get("marketing_consent"),
  });

  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "errorUnauthenticated" };
  }

  const update: ProfileUpdate = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    language: parsed.data.language,
    marketing_consent: parsed.data.marketing_consent,
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "success" };
}
