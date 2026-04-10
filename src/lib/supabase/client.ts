"use client";

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";

import { getSupabaseEnv, isSupabaseConfigured } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

export function createSupabaseBrowserClient(): BrowserClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

export type { CookieOptions };
