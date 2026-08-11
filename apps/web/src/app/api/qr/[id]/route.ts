import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/nota";

export const dynamic = "force-dynamic";

/** Menghasilkan gambar QR (PNG) dari URL nota — dipakai sebagai og:image. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = await getBaseUrl();
  const url = `${base}/n/${id}`;
  const buf = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
