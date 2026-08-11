import "server-only";

import { headers } from "next/headers";
import QRCode from "qrcode";
import {
  formatRupiah,
  formatDateTime,
  SATUAN_SINGKAT,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";

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

/** Susun teks nota lengkap untuk pesan WhatsApp (mirip nota cetak). */
export function buildWaNota(o: {
  tenantNama: string;
  tenantKota?: string | null;
  tipe: string;
  noNota: string;
  konsumen?: string | null;
  terima: Date | string | null;
  selesai: Date | string | null;
  items: {
    namaLayanan: string;
    qty: string | number;
    tipeSatuan: string;
    harga: string;
    subtotal: string;
  }[];
  subtotal: string;
  biayaExpress: string;
  diskon: string;
  grandTotal: string;
  statusPembayaran: string;
  link: string;
  sk: string[];
}): string {
  const sisa =
    o.statusPembayaran === "lunas" ? 0 : Number(o.grandTotal);
  const L: string[] = [];
  L.push(`*FAKTUR ELEKTRONIK — TRANSAKSI ${o.tipe.toUpperCase()}*`);
  L.push(`*${o.tenantNama}*`);
  if (o.tenantKota) L.push(o.tenantKota);
  L.push("");
  L.push(`Nota: ${o.noNota}`);
  if (o.konsumen) L.push(`Pelanggan: ${o.konsumen}`);
  L.push(`Terima: ${formatDateTime(o.terima)}`);
  L.push(`Selesai: ${formatDateTime(o.selesai)}`);
  L.push("————————");
  L.push("*Detail pesanan:*");
  for (const it of o.items) {
    L.push(
      `• ${it.namaLayanan} (${Number(it.qty)} ${SATUAN_SINGKAT[it.tipeSatuan] ?? ""}) @ ${formatRupiah(it.harga)} = ${formatRupiah(it.subtotal)}`,
    );
  }
  L.push("————————");
  L.push(`Subtotal: ${formatRupiah(o.subtotal)}`);
  if (Number(o.biayaExpress) > 0)
    L.push(`Express: + ${formatRupiah(o.biayaExpress)}`);
  if (Number(o.diskon) > 0) L.push(`Diskon: − ${formatRupiah(o.diskon)}`);
  L.push(`*Total: ${formatRupiah(o.grandTotal)}*`);
  L.push(
    `Pembayaran: ${LABEL_STATUS_BAYAR[o.statusPembayaran] ?? o.statusPembayaran}`,
  );
  L.push(`Sisa tagihan: ${formatRupiah(sisa)}`);
  L.push("————————");
  L.push("Cek status & nota:");
  L.push(o.link);
  L.push("");
  L.push("*Syarat & ketentuan:*");
  o.sk.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  L.push("");
  L.push("Terima kasih 🙏");
  return L.join("\n");
}

/** URL dasar situs (dari header request). */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
