"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { VIEW_AS_COOKIE } from "@/lib/account/view-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function currentAdminId(): Promise<string | null> {
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
  return profile?.role === "admin" ? user.id : null;
}

/** Admin-only: start previewing a user's member area (read-only). */
export async function viewAsUser(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") || "fr");
  const adminId = await currentAdminId();
  if (!adminId) redirect(`/${locale}/connexion`);

  const parsed = z.string().uuid().safeParse(formData.get("userId"));
  if (!parsed.success || parsed.data === adminId) {
    redirect(`/${locale}/admin/parents`);
  }

  const store = await cookies();
  store.set(VIEW_AS_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2, // 2h
  });
  redirect(`/${locale}/mon-compte`);
}

/** Stop previewing and return to the admin. */
export async function exitViewAs(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") || "fr");
  const store = await cookies();
  store.delete(VIEW_AS_COOKIE);
  redirect(`/${locale}/admin/parents`);
}
