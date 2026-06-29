"use client";

import Script from "next/script";

// Renders the Cloudflare Turnstile widget inside the surrounding <form>.
// On success the widget injects a hidden input named "cf-turnstile-response",
// which the server action verifies. Renders nothing when no site key is set,
// so forms keep working before the captcha is configured.
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </>
  );
}
