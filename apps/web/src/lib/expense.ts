import "server-only";

import { ensureExpenseCoa, getCoa } from "@/lib/coa";
import { EXPENSE_TAXONOMY, produkByKategoriNama } from "@/lib/expense-taxonomy";

export type PickerKategori = { kode: string; nama: string; produk: string[] };
export type PickerGroup = {
  kode: string;
  nama: string;
  tipe: "beban" | "aset";
  kategori: PickerKategori[];
};
export type ExpensePicker = {
  groups: PickerGroup[];
  kas: { kode: string; nama: string }[];
};

function segments(kode: string): number {
  return kode.split(".").length;
}

/**
 * Susun data cascade Pengeluaran (Kelompok Akun → Kategori → Produk) dari COA
 * tenant (termasuk kategori tambahan buatan owner) + daftar produk baku.
 * Server-only (bukan server action): dipanggil langsung dari server component,
 * sehingga tenantId tidak pernah berasal dari input klien.
 */
export async function getExpensePicker(tenantId: string): Promise<ExpensePicker> {
  await ensureExpenseCoa(tenantId);
  const coa = await getCoa(tenantId);

  const groups: PickerGroup[] = EXPENSE_TAXONOMY.map((g) => {
    const kategori = coa
      .filter(
        (a) =>
          a.aktif &&
          a.kode.startsWith(g.kode + ".") &&
          segments(a.kode) === segments(g.kode) + 1,
      )
      .map((a) => ({
        kode: a.kode,
        nama: a.nama,
        produk: produkByKategoriNama(a.nama),
      }));
    return { kode: g.kode, nama: g.nama, tipe: g.tipe, kategori };
  });

  const kas = coa
    .filter((a) => a.isKas && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));

  return { groups, kas };
}
