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
  iban: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, "").toUpperCase() : ""))
    .refine((v) => v === "" || /^CH[0-9A-Z]{17,32}$/.test(v), {
      message: "errorIban",
    }),
});

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB
const AVATAR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
    iban: formData.get("iban") ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.message === "errorIban" ? "errorIban" : "errorValidation";
    return { status: "error", message };
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

  // IBAN is only relevant for coaches (used to pay their sessions).
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (coach) {
    update.iban = parsed.data.iban || null;
  }

  // Optional avatar upload to the private "avatars" bucket. We store the object
  // PATH (not a public URL); it is served via short-lived signed URLs.
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { status: "error", message: "errorAvatarSize" };
    }
    const ext = AVATAR_EXT[avatar.type];
    if (!ext) {
      return { status: "error", message: "errorAvatarType" };
    }
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) {
      return { status: "error", message: "errorAvatarUpload" };
    }
    update.avatar_url = path;
  }

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
