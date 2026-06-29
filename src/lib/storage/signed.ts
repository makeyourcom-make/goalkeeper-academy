import type { SupabaseClient } from "@supabase/supabase-js";

const TTL_SECONDS = 600; // 10 minutes

// Short-lived signed URL for a stored avatar / keeper photo path in the private
// "avatars" bucket. Whether the URL is granted is enforced by storage RLS on
// the caller's session (owner of the folder, or admin). Accepts a legacy full
// URL (returned as-is) and null/undefined (returns null).
export async function signedAvatarUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path; // legacy public URL
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function signedAvatarUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<(string | null)[]> {
  return Promise.all(paths.map((p) => signedAvatarUrl(supabase, p)));
}
