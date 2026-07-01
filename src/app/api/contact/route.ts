import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isEmailConfigured, sendMail } from "@/lib/email/smtp";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const dynamic = "force-dynamic";

const CONTACT_TO = process.env.CONTACT_TO || "contact@thelastline.ch";

const SCHEMA = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(5000),
  token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Not configured yet → tell the client to fall back to the mailto flow.
  if (!isEmailConfigured()) {
    return NextResponse.json({ configured: false });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const d = parsed.data;

  // Anti-bot (no-op if Turnstile secret is not configured).
  if (!(await verifyTurnstile(d.token ?? null))) {
    return NextResponse.json({ error: "captcha" }, { status: 400 });
  }

  const ok = await sendMail({
    to: CONTACT_TO,
    subject: `[Contact - ${d.subject}] ${d.name}`,
    text: `Nom : ${d.name}\nEmail : ${d.email}\nSujet : ${d.subject}\n\n${d.message}`,
    replyTo: d.email,
  });

  if (!ok) {
    return NextResponse.json({ error: "send" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
