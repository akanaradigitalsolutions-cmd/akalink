/** Format angka menjadi Rupiah, mis. 15000 → "Rp 15.000". */
export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}

export const LABEL_SATUAN: Record<string, string> = {
  kiloan: "Kiloan (KG)",
  satuan: "Satuan (item)",
  koin: "Koin / load",
  luas: "Luas (M²)",
};
