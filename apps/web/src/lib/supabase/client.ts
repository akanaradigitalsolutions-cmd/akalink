"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

/**
 * Klien Supabase untuk komponen sisi browser (Client Component).
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getPublicEnv();
  return createBrowserClient(url, anonKey);
}
