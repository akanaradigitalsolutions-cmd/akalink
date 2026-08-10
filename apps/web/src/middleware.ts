import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware:
 *  - Menyegarkan (refresh) sesi Supabase pada setiap request.
 *  - Melindungi rute /dashboard (harus login).
 *  - Mengalihkan pengguna yang sudah login menjauh dari /masuk & /daftar.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Bila env Supabase belum di-set, jangan blokir apa pun (mis. saat build).
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard");
  const isAuthPage = path === "/masuk" || path === "/daftar";

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/masuk", "/daftar"],
};
