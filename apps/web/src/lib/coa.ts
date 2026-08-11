import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb, chartOfAccounts } from "@akalink/db";

type Tipe = "aset" | "kewajiban" | "modal" | "pendapatan" | "beban";
type Normal = "debit" | "kredit";
type Seed = {
  kode: string;
  nama: string;
  tipe: Tipe;
  normal: Normal;
  parent?: string;
  kas?: boolean;
};

/** Bagan akun default untuk laundry (bisa disesuaikan owner nanti). */
export const DEFAULT_COA: Seed[] = [
  { kode: "1", nama: "ASET", tipe: "aset", normal: "debit" },
  { kode: "1.1", nama: "Kas & Setara Kas", tipe: "aset", normal: "debit", parent: "1" },
  { kode: "1.1.01", nama: "Kas Besar", tipe: "aset", normal: "debit", parent: "1.1", kas: true },
  { kode: "1.1.02", nama: "Kas Outlet", tipe: "aset", normal: "debit", parent: "1.1", kas: true },
  { kode: "1.1.03", nama: "Kas Kurir", tipe: "aset", normal: "debit", parent: "1.1", kas: true },
  { kode: "1.1.04", nama: "Bank", tipe: "aset", normal: "debit", parent: "1.1", kas: true },
  { kode: "1.2", nama: "Piutang Usaha", tipe: "aset", normal: "debit", parent: "1" },
  { kode: "1.3", nama: "Persediaan", tipe: "aset", normal: "debit", parent: "1" },
  { kode: "2", nama: "KEWAJIBAN", tipe: "kewajiban", normal: "kredit" },
  { kode: "2.1", nama: "Hutang Usaha", tipe: "kewajiban", normal: "kredit", parent: "2" },
  { kode: "3", nama: "MODAL", tipe: "modal", normal: "kredit" },
  { kode: "3.1", nama: "Modal Pemilik", tipe: "modal", normal: "kredit", parent: "3" },
  { kode: "3.2", nama: "Laba Ditahan", tipe: "modal", normal: "kredit", parent: "3" },
  { kode: "3.9", nama: "Prive (Pengambilan Pemilik)", tipe: "modal", normal: "debit", parent: "3" },
  { kode: "4", nama: "PENDAPATAN", tipe: "pendapatan", normal: "kredit" },
  { kode: "4.1", nama: "Pendapatan Jasa Laundry", tipe: "pendapatan", normal: "kredit", parent: "4" },
  { kode: "4.9", nama: "Diskon Penjualan", tipe: "pendapatan", normal: "debit", parent: "4" },
  { kode: "5", nama: "BEBAN", tipe: "beban", normal: "debit" },
  { kode: "5.1", nama: "Beban Operasional", tipe: "beban", normal: "debit", parent: "5" },
  { kode: "5.2", nama: "Beban Gaji & Komisi", tipe: "beban", normal: "debit", parent: "5" },
  { kode: "5.9", nama: "Biaya Pemakaian Kredit", tipe: "beban", normal: "debit", parent: "5" },
];

export async function getCoa(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId))
    .orderBy(asc(chartOfAccounts.kode));
}

/** Buat COA default bila tenant belum punya akun apa pun. */
export async function seedDefaultCoaIfEmpty(tenantId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId))
    .limit(1);
  if (existing.length > 0) return;

  const kodeToId = new Map<string, string>();
  for (const a of DEFAULT_COA) {
    const parentId = a.parent ? (kodeToId.get(a.parent) ?? null) : null;
    const [row] = await db
      .insert(chartOfAccounts)
      .values({
        tenantId,
        kode: a.kode,
        nama: a.nama,
        tipe: a.tipe,
        saldoNormal: a.normal,
        parentId,
        isKas: a.kas ?? false,
      })
      .returning({ id: chartOfAccounts.id });
    kodeToId.set(a.kode, row.id);
  }
}
