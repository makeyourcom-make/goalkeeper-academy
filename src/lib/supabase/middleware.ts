import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv, isSupabaseConfigured } from "./env";

/**
 * Refresh the Supabase session for every request and return the resulting
 * response (with updated cookies). Returns the response untouched if Supabase
 * is not configured yet, so the site keeps working without env vars.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) return response;

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: refreshes the auth token cookie if it has expired.
  await supabase.auth.getUser();

  return response;
}
