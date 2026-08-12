import { ImageResponse } from "next/og";
import { brandIconDataUri } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikon layar utama iOS (Add to Home Screen) — logo AkaLink. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width="180" height="180" src={brandIconDataUri()} alt="AkaLink" />
      </div>
    ),
    { ...size },
  );
}
