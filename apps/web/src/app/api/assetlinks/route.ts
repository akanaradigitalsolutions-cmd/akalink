import { NextResponse } from "next/server";

// Digital Asset Links untuk Trusted Web Activity (Android/Play Store).
// Disajikan di /.well-known/assetlinks.json (via rewrite di next.config).
//
// CARA ISI: setelah paket Android dibuat (PWABuilder/Bubblewrap) dan/atau
// setelah Play App Signing aktif, salin sidik jari SHA-256 sertifikat ke
// array FINGERPRINTS di bawah. Boleh lebih dari satu (upload key + Google
// app-signing key). Format: "AA:BB:CC:...:ZZ" (uppercase, dipisah titik dua).

const PACKAGE_NAME = "id.akalink.app";

const FINGERPRINTS: string[] = [
  // TODO: ganti dengan SHA-256 asli dari paket Android.
  // Contoh: "3A:B1:...:9F",
];

export const dynamic = "force-static";

export function GET() {
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: FINGERPRINTS,
      },
    },
  ];
  return NextResponse.json(body, {
    headers: { "content-type": "application/json" },
  });
}
