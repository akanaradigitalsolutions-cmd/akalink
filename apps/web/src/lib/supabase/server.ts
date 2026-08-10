import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

/**
 * Klien Supabase untuk Server Component / Server Action.
 * Membaca & menulis cookie sesi agar status login tetap tersinkron.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component (tidak boleh set cookie): abaikan.
          // Middleware yang akan me-refresh sesi.
        }
      },
    },
  });
}
