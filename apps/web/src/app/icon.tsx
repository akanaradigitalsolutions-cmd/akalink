import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ikon aplikasi (favicon & PWA) — badge biru + monogram "A" + tetesan air. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #1d4ed8 100%)",
        }}
      >
        <svg width="66%" height="66%" viewBox="0 0 48 48" fill="none">
          <path
            d="M14 37 L24 9 L34 37"
            stroke="#ffffff"
            strokeWidth="4.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 28.5 H29.5"
            stroke="#ffffff"
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <path
            d="M35 7 C37.6 10.2 38.3 12 38.3 13.5 A3.3 3.3 0 1 1 31.7 13.5 C31.7 12 32.4 10.2 35 7 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
