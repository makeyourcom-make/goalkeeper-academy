"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendMail } from "@/lib/email/smtp";

export type EmailFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ADDR = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Split a "a@x.ch, b@y.ch; c@z.ch" field into a clean, comma-joined string.
function cleanList(raw: string): string {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

function validList(raw: string): boolean {
  const parts = raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((p) => ADDR.test(p));
}

// Send a manual email from the admin console. Admin-only. Every send is
// recorded in email_log by sendMail (kind = "manual").
export async function sendAdminEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "errorAuth" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin")
    return { status: "error", message: "errorAuth" };

  if (!isEmailConfigured()) {
    return { status: "error", message: "errorNotConfigured" };
  }

  const to = cleanList(String(formData.get("to") ?? ""));
  const cc = cleanList(String(formData.get("cc") ?? ""));
  const bcc = cleanList(String(formData.get("bcc") ?? ""));
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!validList(to)) return { status: "error", message: "errorRecipients" };
  if (cc && !validList(cc))
    return { status: "error", message: "errorRecipients" };
  if (bcc && !validList(bcc)) {
    return { status: "error", message: "errorRecipients" };
  }
  if (!subject) return { status: "error", message: "errorSubject" };
  if (!message) return { status: "error", message: "errorMessage" };

  const ok = await sendMail({
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text: message,
    kind: "manual",
  });

  revalidatePath("/", "layout");
  return ok
    ? { status: "success", message: "sent" }
    : { status: "error", message: "errorSend" };
}
