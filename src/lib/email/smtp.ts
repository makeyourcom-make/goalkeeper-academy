import nodemailer from "nodemailer";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// SMTP mailer (LWS or any provider). Gated on env: when the SMTP vars are
// absent, `isEmailConfigured()` is false and callers degrade gracefully
// (the contact form falls back to a mailto link). Never import client-side.
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
  );
}

function getTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465; // 465 = implicit TLS; 587 = STARTTLS
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure, // force STARTTLS on 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

type SendArgs = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  replyTo?: string;
  // Free-form category for the email log (e.g. "manual", "payment",
  // "registration", "convocation", "reminder"). Defaults to "auto".
  kind?: string;
};

// Best-effort write to the email log. Never throws (the table may not be
// migrated yet, or the service key may be absent) so it can't break sending.
async function logEmail(args: SendArgs, status: string, error?: string) {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("email_log").insert({
      recipient: args.to,
      cc: args.cc ?? null,
      bcc: args.bcc ?? null,
      subject: args.subject,
      kind: args.kind ?? "auto",
      status,
      error: error ?? null,
    });
  } catch {
    // ignore — logging must never break the send flow
  }
}

export async function sendMail(args: SendArgs): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  try {
    await getTransport().sendMail({
      from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      text: args.text,
      replyTo: args.replyTo,
    });
    await logEmail(args, "sent");
    return true;
  } catch (err) {
    // Surface the real SMTP failure in the server logs for diagnosis.
    console.error("[smtp] send failed:", err);
    await logEmail(
      args,
      "failed",
      err instanceof Error ? err.message : "error",
    );
    return false;
  }
}
