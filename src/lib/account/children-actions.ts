"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChildActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB
const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Uploads a keeper photo into the public "avatars" bucket under the parent's
// own folder, then returns its public URL. Returns an error message key on
// failure, or null when there is simply no file to upload.
async function uploadChildPhoto(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
  file: FormDataEntryValue | null,
): Promise<{ url?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > MAX_PHOTO_BYTES) return { error: "errorPhotoSize" };
  const ext = PHOTO_EXT[file.type];
  if (!ext) return { error: "errorPhotoType" };

  const path = `${userId}/children/${childId}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error: "errorPhotoUpload" };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: `${publicUrl}?v=${Date.now()}` };
}

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

  const { data: created, error } = await supabase
    .from("children")
    .insert({
      parent_id: user.id,
      club_id: null,
      registration_type: null,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { status: "error", message: "errorGeneric" };
  }

  const photo = await uploadChildPhoto(
    supabase,
    user.id,
    created.id,
    formData.get("photo"),
  );
  if (photo.error) {
    return { status: "error", message: photo.error };
  }
  if (photo.url) {
    await supabase
      .from("children")
      .update({ photo_url: photo.url })
      .eq("id", created.id);
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

  const photo = await uploadChildPhoto(
    supabase,
    user.id,
    id,
    formData.get("photo"),
  );
  if (photo.error) {
    return { status: "error", message: photo.error };
  }

  const { error } = await supabase
    .from("children")
    .update(photo.url ? { ...parsed.data, photo_url: photo.url } : parsed.data)
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
