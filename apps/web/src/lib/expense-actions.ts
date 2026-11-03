"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, chartOfAccounts } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { ensureExpenseCoa } from "@/lib/coa";
import { EXPENSE_GROUP_KODES } from "@/lib/expense-taxonomy";

function segments(kode: string): number {
  return kode.split(".").length;
}

export type AddKategoriResult =
  | { ok: true; kode: string; nama: string }
  | { ok: false; error: string };

/** Owner menambah Kategori baru pada sebuah Kelompok Akun Pengeluaran. */
export async function addExpenseCategory(input: {
  groupKode: string;
  nama: string;
}): Promise<AddKategoriResult> {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId)
    return { ok: false, error: "Sesi tidak valid. Silakan masuk lagi." };
  if (getRoleFromUser(user) !== "owner")
    return { ok: false, error: "Hanya pemilik yang dapat menambah kategori." };

  const groupKode = String(input.groupKode ?? "");
  const nama = String(input.nama ?? "").trim();
  if (!EXPENSE_GROUP_KODES.includes(groupKode))
    return { ok: false, error: "Kelompok akun tidak dikenal." };
  if (nama.length < 2)
    return { ok: false, error: "Nama kategori minimal 2 karakter." };

  await ensureExpenseCoa(tenantId);
  const db = getDb();

  const [group] = await db
    .select({ id: chartOfAccounts.id, tipe: chartOfAccounts.tipe })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.kode, groupKode),
      ),
    )
    .limit(1);
  if (!group) return { ok: false, error: "Kelompok akun belum tersedia." };

  // Ambil akun tenant untuk cek duplikat & hitung kode berikutnya.
  const all = await db
    .select({ kode: chartOfAccounts.kode, nama: chartOfAccounts.nama })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId));
  const inGroup = all.filter(
    (c) =>
      c.kode.startsWith(groupKode + ".") &&
      segments(c.kode) === segments(groupKode) + 1,
  );
  if (inGroup.some((c) => c.nama.trim().toLowerCase() === nama.toLowerCase()))
    return { ok: false, error: "Kategori dengan nama itu sudah ada." };

  let maxNN = 0;
  for (const c of inGroup) {
    const last = c.kode.split(".").pop() ?? "";
    const n = Number(last);
    if (Number.isFinite(n) && n > maxNN) maxNN = n;
  }
  const kode = `${groupKode}.${String(maxNN + 1).padStart(2, "0")}`;

  await db.insert(chartOfAccounts).values({
    tenantId,
    kode,
    nama,
    tipe: group.tipe,
    saldoNormal: "debit",
    parentId: group.id,
    isKas: false,
  });

  revalidatePath("/keuangan");
  revalidatePath("/keuangan/catat");
  revalidatePath("/pengeluaran");
  return { ok: true, kode, nama };
}
