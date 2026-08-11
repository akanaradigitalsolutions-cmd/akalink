import "server-only";

import { headers } from "next/headers";
import QRCode from "qrcode";

/** Syarat & ketentuan default (nantinya bisa diedit di Pengaturan Nota). */
export const SYARAT_KETENTUAN_DEFAULT = [
  "Pengambilan barang harap disertai nota.",
  "Barang tidak diambil 1 bulan, hilang/rusak tidak diganti.",
  "Kerusakan karena proses diganti maksimal 5x biaya layanan.",
  "Klaim luntur/tidak dipisah di luar tanggungan.",
  "Hak klaim berlaku 2 jam setelah barang diambil.",
  "Konsumen dianggap setuju dengan perhitungan di atas.",
];

/** Hasilkan QR code sebagai string SVG. */
export async function qrSvg(text: string, size = 132): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
  });
}

/** URL dasar situs (dari header request). */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
