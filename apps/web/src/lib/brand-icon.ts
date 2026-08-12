/**
 * SVG logo AkaLink versi "full-bleed" (badge mengisi penuh kanvas) untuk
 * dipakai membangkitkan ikon aplikasi/PWA. iOS & Android memberi sudut
 * membulat sendiri, jadi latar dibuat mengisi tepi ke tepi.
 */
export const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38bdf8"/>
      <stop offset="0.5" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" fill="url(#g)"/>
  <path d="M12.5 31.5 A13 13 0 1 1 35 30" fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M15.5 35 L24 11 L32.5 35" fill="none" stroke="#ffffff" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.4 27.8 H28.6" stroke="#ffffff" stroke-width="3.7" stroke-linecap="round"/>
  <path d="M34 8 C36.4 11 37 12.6 37 14 A3 3 0 1 1 31 14 C31 12.6 31.6 11 34 8 Z" fill="#ffffff"/>
</svg>`;

/** Data-URI (base64) agar dirasterisasi andal oleh next/og (Satori). */
export function brandIconDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(BRAND_ICON_SVG).toString(
    "base64",
  )}`;
}
