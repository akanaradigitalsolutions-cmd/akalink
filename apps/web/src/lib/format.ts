/** Format angka menjadi Rupiah, mis. 15000 → "Rp 15.000". */
export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
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
