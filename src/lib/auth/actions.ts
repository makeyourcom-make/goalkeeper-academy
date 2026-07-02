"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/security/turnstile";

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
  role: z.enum(["parent", "club", "coach"]),
  consent: z.literal("on"),
});

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "errorNotConfigured" };
  }

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { status: "error", message: "errorCaptcha" };
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

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { status: "error", message: "errorCaptcha" };
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

  // A coach signs up as a normal account and is validated by an admin later —
  // the role is NEVER granted at signup (that would let anyone self-grant it).
  const requestedCoach = parsed.data.role === "coach";
  const accountRole = requestedCoach ? "parent" : parsed.data.role;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${base}/auth/callback?next=/${locale}/mon-compte`,
      data: {
        role: accountRole,
        language: locale === "en" ? "en" : "fr",
        ...(requestedCoach ? { requested_role: "coach" } : {}),
      },
    },
  });

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  // Coach requests always land on the "await validation" message, even when a
  // session was returned (email confirmation off) — they must be promoted.
  if (requestedCoach) {
    return { status: "success", message: "successCoach" };
  }

  // Email confirmation OFF in Supabase → a session is returned and the user
  // is logged in immediately. ON → no session, ask them to confirm by email.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(`/${locale}/mon-compte`);
  }

  return { status: "success", message: "successConfirm" };
}

export type WizardAccountResult =
  | { status: "ok" }
  | { status: "exists" }
  | { status: "confirm" }
  | { status: "captcha" }
  | { status: "error" };

type WizardAccountInput = {
  email: string;
  password: string;
  role: "parent" | "club";
  firstName: string;
  lastName: string;
  phone: string;
  locale: string;
  turnstileToken: string;
};

// Create an account straight from the inscription wizard (email + password),
// so registering no longer requires a separate sign-up. Signs the user in on
// success so the registration + payment can proceed in the same flow.
export async function createWizardAccount(
  input: WizardAccountInput,
): Promise<WizardAccountResult> {
  if (!isSupabaseConfigured()) return { status: "error" };
  if (!(await verifyTurnstile(input.turnstileToken))) {
    return { status: "captcha" };
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error" };
  if (!input.password || input.password.length < 8) return { status: "error" };
  const role = input.role === "club" ? "club" : "parent";
  const language = input.locale === "en" ? "en" : "fr";

  // Create an ALREADY-CONFIRMED account (no verification email) so the payment
  // can proceed immediately — even when Supabase requires email confirmation
  // for the normal sign-up flow. Bot protection is the Turnstile check above.
  const admin = createSupabaseAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { role, language },
    },
  );

  if (createErr || !created?.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exist")
    ) {
      return { status: "exists" };
    }
    return { status: "error" };
  }

  // Establish the browser session so registration + payment proceed in one flow.
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (signInErr) return { status: "error" };

  // The trigger stored only role/language; save the name + phone on the profile.
  await admin
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
      phone: input.phone.trim() || null,
    })
    .eq("id", created.user.id);

  return { status: "ok" };
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
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { status: "error", message: "errorCaptcha" };
  }

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
