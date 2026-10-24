import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Titik pendaratan link dari email (reset password / konfirmasi).
 * Menukar kode/token menjadi sesi lalu mengarahkan ke `next`.
 *
 * Catatan: di belakang Nginx, origin dari request.url bisa jadi
 * http://127.0.0.1:3000. Maka origin publik dibangun dari header
 * X-Forwarded-Proto + Host agar redirect mendarat di app.akalink.id.
 */
function publicOrigin(request: NextRequest): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host && host.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/atur-ulang-password";
  const origin = publicOrigin(request);

  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[konfirmasi] exchangeCode:", error.message);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) console.error("[konfirmasi] verifyOtp:", error.message);
    ok = !error;
  } else {
    console.error("[konfirmasi] tidak ada code/token_hash di URL");
  }

  if (ok) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/lupa-password?galat=1`);
}
