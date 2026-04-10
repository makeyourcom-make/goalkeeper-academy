import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/fr/mon-compte";

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
