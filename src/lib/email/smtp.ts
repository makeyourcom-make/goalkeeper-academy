import nodemailer from "nodemailer";

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
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendMail(args: SendArgs): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  try {
    await getTransport().sendMail({ from, ...args });
    return true;
  } catch (err) {
    // Surface the real SMTP failure in the server logs for diagnosis.
    console.error("[smtp] send failed:", err);
    return false;
  }
}
