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
  // Google Play app-signing key (Classical) — menandatangani aplikasi yang
  // benar-benar terpasang dari Play. Wajib agar TWA jalan tanpa bilah URL.
  "44:BD:8F:DF:9B:39:E1:51:AF:5F:CE:BB:7F:19:7D:FC:2F:F5:51:F0:90:B3:22:83:05:FA:2A:75:66:AC:D9:64",
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
