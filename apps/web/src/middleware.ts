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
  const isAuthPage = path === "/masuk" || path === "/daftar";
  // Semua rute yang cocok dengan matcher selain halaman auth adalah rute aplikasi.
  const isProtected = !isAuthPage;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rute khusus pemilik (Owner). Kasir dialihkan ke Beranda.
  const OWNER_ONLY = [
    "/keuangan",
    "/laporan",
    "/pengaturan",
    "/layanan",
    "/karyawan",
    "/outlet",
    "/member",
    "/promo",
    "/tagihan",
    "/dana",
    "/b2b",
    "/investor",
  ];
  if (user && OWNER_ONLY.some((p) => path === p || path.startsWith(p + "/"))) {
    const role = (user.app_metadata as { role?: string } | undefined)?.role;
    if (role !== "owner") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/layanan/:path*",
    "/transaksi/:path*",
    "/konsumen/:path*",
    "/keuangan/:path*",
    "/laporan/:path*",
    "/pengaturan/:path*",
    "/karyawan/:path*",
    "/outlet/:path*",
    "/member/:path*",
    "/promo/:path*",
    "/tagihan/:path*",
    "/dana/:path*",
    "/mesin/:path*",
    "/kas/:path*",
    "/antar-jemput/:path*",
    "/b2b/:path*",
    "/investor/:path*",
    "/admin/:path*",
    "/akun/:path*",
    "/masuk",
    "/daftar",
  ],
};
