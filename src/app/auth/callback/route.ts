import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Only allow internal, same-origin redirect targets. Anything else (absolute
// URLs, protocol-relative "//evil.com", backslash tricks) falls back to a safe
// default — prevents the callback being abused as an open redirect for phishing.
function safeNext(raw: string | null): string {
  const fallback = "/fr/mon-compte";
  if (!raw || !raw.startsWith("/")) return fallback; // must be a relative path
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback; // not protocol-relative
  return raw;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/fr/connexion?error=invalid", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/fr/connexion?error=expired", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
