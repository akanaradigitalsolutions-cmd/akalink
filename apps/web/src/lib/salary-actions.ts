"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, employees, salaryAdvances } from "@akalink/db";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import {
  seedDefaultCoaIfEmpty,
  ensureCoaAccount,
  AKUN_PIUTANG_KARYAWAN,
  AKUN_BEBAN_GAJI,
} from "@/lib/coa";
import { postJournal } from "@/lib/journal";

export type SalaryResult = { ok: true } | { ok: false; error: string };

async function ownerCtx() {
  const user = await getSessionUser();
  const tenantId = getTenantIdFromUser(user);
  if (!user || !tenantId) return null;
  if (getRoleFromUser(user) !== "owner") return null;
  return { user, tenantId };
}

/** Set gaji pokok seorang karyawan. */
export async function setGaji(input: {
  employeeId: string;
  gaji: number | string;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const gaji = Math.max(0, Math.floor(Number(input.gaji) || 0));
  const db = getDb();
  await db
    .update(employees)
    .set({ gaji, updatedAt: new Date() })
    .where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, c.tenantId)));
  revalidatePath("/gaji");
  return { ok: true };
}

/** Beri kasbon (uang muka gaji) ke karyawan. Kas keluar → piutang karyawan. */
export async function giveAdvance(input: {
  employeeId: string;
  jumlah: number | string;
  catatan?: string;
  akun?: "1.1.02" | "1.1.04";
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const jumlah = Math.floor(Number(input.jumlah) || 0);
  if (jumlah <= 0) return { ok: false, error: "Nominal kasbon tidak valid." };
  const akun = input.akun === "1.1.04" ? "1.1.04" : "1.1.02";

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_PIUTANG_KARYAWAN);

  const db = getDb();
  const [emp] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, c.tenantId)))
    .limit(1);
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan." };

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(salaryAdvances)
        .values({
          tenantId: c.tenantId,
          employeeId: emp.id,
          jumlah,
          catatan: input.catatan?.trim() || null,
          status: "belum_dipotong",
          createdByNama: null,
        })
        .returning({ id: salaryAdvances.id });
      await postJournal(tx, c.tenantId, {
        keterangan: `Kasbon ${emp.nama}`,
        refType: "kasbon",
        refId: row.id,
        lines: [
          { kode: AKUN_PIUTANG_KARYAWAN, debit: jumlah }, // Dr Piutang Karyawan
          { kode: akun, kredit: jumlah }, // Cr Kas/Bank
        ],
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath("/gaji");
  return { ok: true };
}

/** Tandai kasbon sudah dipotong dari gaji (jadi beban gaji). */
export async function settleAdvance(id: string): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const db = getDb();
  const [adv] = await db
    .select()
    .from(salaryAdvances)
    .where(and(eq(salaryAdvances.id, id), eq(salaryAdvances.tenantId, c.tenantId)))
    .limit(1);
  if (!adv) return { ok: false, error: "Kasbon tidak ditemukan." };
  if (adv.status === "dipotong") return { ok: true };

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_PIUTANG_KARYAWAN);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(salaryAdvances)
        .set({ status: "dipotong", settledAt: new Date() })
        .where(eq(salaryAdvances.id, id));
      // Kasbon diakui sebagai beban gaji (lunas dari piutang).
      await postJournal(tx, c.tenantId, {
        keterangan: `Potong kasbon dari gaji`,
        refType: "kasbon_potong",
        refId: id,
        lines: [
          { kode: AKUN_BEBAN_GAJI, debit: adv.jumlah }, // Dr Beban Gaji
          { kode: AKUN_PIUTANG_KARYAWAN, kredit: adv.jumlah }, // Cr Piutang Karyawan
        ],
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath("/gaji");
  return { ok: true };
}
