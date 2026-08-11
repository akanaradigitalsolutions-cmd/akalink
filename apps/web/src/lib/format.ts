/** Format angka menjadi Rupiah, mis. 15000 → "Rp 15.000". */
export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return "Rp 0";
  // Rupiah dibulatkan ke satuan penuh (tanpa sen).
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/** Format estimasi selesai, mis. (6, "jam") → "6 jam", (2, "hari") → "2 hari". */
export function formatEstimasi(
  nilai?: number | null,
  satuan?: string | null,
): string {
  if (nilai == null) return "—";
  return `${nilai} ${satuan === "hari" ? "hari" : "jam"}`;
}

/** Tampilkan nomor HP, mis. "6281..." → "+6281...". */
export function formatHp(hp?: string | null): string {
  if (!hp) return "—";
  return hp.startsWith("62") ? "+" + hp : hp;
}

export const LABEL_SATUAN: Record<string, string> = {
  kiloan: "Kiloan (KG)",
  satuan: "Satuan (item)",
  koin: "Koin / load",
  luas: "Luas (M²)",
};

export const SATUAN_SINGKAT: Record<string, string> = {
  kiloan: "kg",
  satuan: "item",
  koin: "koin",
  luas: "m²",
};

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const LABEL_STATUS_KERJA: Record<string, string> = {
  belum_dikerjakan: "Belum Dikerjakan",
  proses: "Proses",
  selesai: "Selesai",
  diambil: "Diambil",
};

export const LABEL_STATUS_BAYAR: Record<string, string> = {
  belum_dibayar: "Belum Dibayar",
  dp: "DP",
  lunas: "Lunas",
};
