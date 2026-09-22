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
  // Upload key (dari paket PWABuilder).
  "9A:42:DF:41:98:EC:FD:EA:80:44:CE:B1:CD:33:C7:08:BA:02:60:4A:24:5C:DD:8F:DE:21:35:F0:F5:9A:B3:E4",
  // TODO (setelah upload ke Play): tambahkan SHA-256 "Google Play app signing
  // key" dari Play Console → App integrity → App signing.
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
