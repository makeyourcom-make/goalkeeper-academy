// Cloudflare Turnstile (free, privacy-friendly captcha) for public forms.
// Activates ONLY when both keys are set, so the app works without it in dev /
// before keys are provisioned:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (public, used by the widget)
//   TURNSTILE_SECRET_KEY            (server, used to verify)

export function getTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

function getTurnstileSecret(): string | null {
  return process.env.TURNSTILE_SECRET_KEY || null;
}

// Verify a token server-side. Returns true (pass-through) when no secret is
// configured, so unconfigured environments are not blocked.
export async function verifyTurnstile(
  token: FormDataEntryValue | null,
): Promise<boolean> {
  const secret = getTurnstileSecret();
  if (!secret) return true; // captcha not configured → do not block

  if (typeof token !== "string" || token.length === 0) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
