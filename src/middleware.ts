import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Run i18n first so the response carries the locale cookie + redirects.
  const response = intlMiddleware(request);
  // Then refresh the Supabase session on top of that response.
  return updateSupabaseSession(request, response);
}

export const config = {
  // Match all paths except static assets, API routes and Next internals
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
