import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const VIEW_AS_COOKIE = "tll_view_as";

export type AccountContext = {
  /** Supabase client to read the member data with. */
  db: SupabaseClient;
  /** The user id whose data should be shown. */
  userId: string;
  /** True when an admin is previewing someone else's account (read-only). */
  isImpersonating: boolean;
  /** Display name of the impersonated user (for the banner). */
  targetName: string | null;
  /** The real, authenticated user id. */
  realUserId: string;
};

/**
 * Effective data-access context for the member area (/mon-compte).
 *
 * - Normal user  → RLS-scoped client, own id.
 * - Admin preview → service-role client + target id, READ-ONLY. The
 *   `tll_view_as` cookie is honored ONLY when the real authenticated user is an
 *   admin, so a forged cookie from a non-admin is ignored.
 *
 * IMPORTANT: because the service-role client bypasses RLS, every member query
 * MUST filter explicitly by `ctx.userId` (e.g. .eq("parent_id", ctx.userId)).
 */
export async function getAccountContext(): Promise<AccountContext | null> {
  const rls = await createSupabaseServerClient();
  const {
    data: { user },
  } = await rls.auth.getUser();
  if (!user) return null;

  const viewAsId = (await cookies()).get(VIEW_AS_COOKIE)?.value;

  if (viewAsId && viewAsId !== user.id) {
    const { data: me } = await rls
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.role === "admin") {
      const admin = createSupabaseAdminClient();
      const { data: target } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", viewAsId)
        .maybeSingle();

      if (target) {
        const targetName =
          [target.first_name, target.last_name].filter(Boolean).join(" ") ||
          null;
        return {
          db: admin,
          userId: viewAsId,
          isImpersonating: true,
          targetName,
          realUserId: user.id,
        };
      }
    }
  }

  return {
    db: rls,
    userId: user.id,
    isImpersonating: false,
    targetName: null,
    realUserId: user.id,
  };
}

/** True when an admin-preview cookie is present — used to block writes. */
export async function isViewingAs(): Promise<boolean> {
  return Boolean((await cookies()).get(VIEW_AS_COOKIE)?.value);
}
