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
  password: z.string().min(1),
});

const SIGN_UP_SCHEMA = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["parent", "club"]),
  consent: z.literal("on"),
});

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorNotConfigured" };
  }

  const parsed = SIGN_IN_SCHEMA.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "errorCredentials" };
  }

  const locale = String(formData.get("locale") ?? "fr");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "errorCredentials" };
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/mon-compte`);
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorGeneric" };
  }

  const parsed = SIGN_UP_SCHEMA.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "email")
      return { status: "error", message: "errorEmail" };
    if (issue?.path[0] === "password")
      return { status: "error", message: "errorPassword" };
    if (issue?.path[0] === "role")
      return { status: "error", message: "errorRole" };
    if (issue?.path[0] === "consent")
      return { status: "error", message: "errorConsent" };
    return { status: "error", message: "errorGeneric" };
  }

  const locale = String(formData.get("locale") ?? "fr");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${base}/auth/callback?next=/${locale}/mon-compte`,
      data: {
        role: parsed.data.role,
        language: locale === "en" ? "en" : "fr",
      },
    },
  });

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  // Email confirmation OFF in Supabase → a session is returned and the user
  // is logged in immediately. ON → no session, ask them to confirm by email.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(`/${locale}/mon-compte`);
  }

  return { status: "success", message: "successConfirm" };
}

const CHANGE_PASSWORD_SCHEMA = z
  .object({
    currentPassword: z.string().min(1),
    password: z.string().min(8),
    confirm: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "errorMismatch",
  });

// Change password while logged in. The current password is re-verified first
// so a hijacked, already-open session cannot silently change it.
export async function changePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorGeneric" };
  }

  const parsed = CHANGE_PASSWORD_SCHEMA.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "password")
      return { status: "error", message: "errorPasswordShort" };
    if (issue?.path[0] === "confirm")
      return { status: "error", message: "errorMismatch" };
    return { status: "error", message: "errorGeneric" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { status: "error", message: "errorUnauthenticated" };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return { status: "error", message: "errorCurrentPassword" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  return { status: "success", message: "successPassword" };
}

const REQUEST_RESET_SCHEMA = z.object({ email: z.string().trim().email() });

function resetPath(locale: string): string {
  return locale === "en" ? "/en/reset-password" : "/fr/mot-de-passe-nouveau";
}

// "Forgot password": email a recovery link. Always reports success so the
// form cannot be used to discover which addresses have an account.
export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = REQUEST_RESET_SCHEMA.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", message: "errorEmail" };
  }

  const locale = String(formData.get("locale") ?? "fr");

  if (isSupabaseConfigured()) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${base}/auth/callback?next=${resetPath(locale)}`,
    });
  }

  return { status: "success", message: "successReset" };
}

const UPDATE_PASSWORD_SCHEMA = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "errorMismatch",
  });

// Set a new password after following the recovery link (the link establishes
// a session via /auth/callback, so updateUser is authorised here).
export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorGeneric" };
  }

  const parsed = UPDATE_PASSWORD_SCHEMA.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "password")
      return { status: "error", message: "errorPasswordShort" };
    return { status: "error", message: "errorMismatch" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "errorLinkExpired" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  const locale = String(formData.get("locale") ?? "fr");
  revalidatePath("/", "layout");
  redirect(`/${locale}/mon-compte`);
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
