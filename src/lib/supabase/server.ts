import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabaseEnv } from "./env";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers
 * and Server Actions. Cookies are forwarded to/from the request via Next's
 * `cookies()` helper so the user's session stays in sync.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
