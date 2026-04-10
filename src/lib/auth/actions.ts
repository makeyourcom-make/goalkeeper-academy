"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const SIGN_IN_SCHEMA = z.object({
  email: z.string().trim().email(),
});

const SIGN_UP_SCHEMA = z.object({
  email: z.string().trim().email(),
  role: z.enum(["parent", "club"]),
  consent: z.literal("on"),
});

function buildEmailRedirect(locale: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/auth/callback?next=/${locale}/mon-compte`;
}

export async function signInWithMagicLink(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorNotConfigured" };
  }

  const parsed = SIGN_IN_SCHEMA.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", message: "errorEmail" };
  }

  const locale = String(formData.get("locale") ?? "fr");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: buildEmailRedirect(locale),
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { status: "error", message: "error" };
  }

  return { status: "success", message: "success" };
}

export async function signUpWithMagicLink(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorGeneric" };
  }

  const parsed = SIGN_UP_SCHEMA.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "email")
      return { status: "error", message: "errorEmail" };
    if (issue?.path[0] === "role")
      return { status: "error", message: "errorRole" };
    if (issue?.path[0] === "consent")
      return { status: "error", message: "errorConsent" };
    return { status: "error", message: "errorGeneric" };
  }

  const locale = String(formData.get("locale") ?? "fr");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: buildEmailRedirect(locale),
      shouldCreateUser: true,
      data: {
        role: parsed.data.role,
        language: locale === "en" ? "en" : "fr",
      },
    },
  });

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  return { status: "success", message: "success" };
}

export async function signOut(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr");
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}
