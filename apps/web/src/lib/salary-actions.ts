"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  employees,
  salaryAdvances,
  salaryAdvancePayments,
  journalEntries,
} from "@akalink/db";
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
  const db = getDb();
  const [me] = await db
    .select({ nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.authUserId, user.id), eq(employees.tenantId, tenantId)))
    .limit(1);
  const nama = me?.nama ?? user.email ?? null;
  return { user, tenantId, nama };
}

function toDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? undefined : d;
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

/**
 * Beri kasbon (uang muka gaji) ke karyawan. Kas keluar → piutang karyawan.
 * `tanggal` = tanggal kasbon (default hari ini), `jatuhTempo` = batas pelunasan.
 */
export async function giveAdvance(input: {
  employeeId: string;
  jumlah: number | string;
  catatan?: string;
  akun?: "1.1.02" | "1.1.04";
  tanggal?: string;
  jatuhTempo?: string;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const jumlah = Math.floor(Number(input.jumlah) || 0);
  if (jumlah <= 0) return { ok: false, error: "Nominal kasbon tidak valid." };
  const akun = input.akun === "1.1.04" ? "1.1.04" : "1.1.02";
  const tgl = toDate(input.tanggal) ?? new Date();
  const jatuhTempo = toDate(input.jatuhTempo);
  if (jatuhTempo && jatuhTempo < new Date(tgl.toISOString().slice(0, 10) + "T00:00:00"))
    return { ok: false, error: "Jatuh tempo tidak boleh sebelum tanggal kasbon." };

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
          dibayar: 0,
          catatan: input.catatan?.trim() || null,
          tanggal: tgl.toISOString().slice(0, 10),
          jatuhTempo: jatuhTempo ? jatuhTempo.toISOString().slice(0, 10) : null,
          status: "belum_dipotong",
          createdByNama: c.nama,
        })
        .returning({ id: salaryAdvances.id });
      await postJournal(tx, c.tenantId, {
        tanggal: tgl,
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

/**
 * Catat pembayaran/cicilan kasbon.
 *  - metode "potong_gaji": Dr Beban Gaji / Cr Piutang Karyawan (dipotong dari gaji).
 *  - metode "tunai": Dr Kas Outlet / Cr Piutang Karyawan (dikembalikan tunai).
 * Menambah `dibayar`; bila lunas, status → dipotong.
 */
export async function repayAdvance(input: {
  advanceId: string;
  jumlah: number | string;
  metode?: "potong_gaji" | "tunai";
  tanggal?: string;
  catatan?: string;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const metode = input.metode === "tunai" ? "tunai" : "potong_gaji";
  const tgl = toDate(input.tanggal) ?? new Date();

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_PIUTANG_KARYAWAN);

  const db = getDb();
  const [adv] = await db
    .select()
    .from(salaryAdvances)
    .where(
      and(
        eq(salaryAdvances.id, input.advanceId),
        eq(salaryAdvances.tenantId, c.tenantId),
      ),
    )
    .limit(1);
  if (!adv) return { ok: false, error: "Kasbon tidak ditemukan." };

  const sisa = Math.max(0, adv.jumlah - adv.dibayar);
  if (sisa <= 0) return { ok: false, error: "Kasbon sudah lunas." };
  let jumlah = Math.floor(Number(input.jumlah) || 0);
  if (jumlah <= 0) return { ok: false, error: "Nominal pembayaran tidak valid." };
  if (jumlah > sisa) jumlah = sisa; // tidak boleh melebihi sisa

  const kredit = AKUN_PIUTANG_KARYAWAN;
  const debit = metode === "tunai" ? "1.1.02" : AKUN_BEBAN_GAJI;

  const dibayarBaru = adv.dibayar + jumlah;
  const lunas = dibayarBaru >= adv.jumlah;

  try {
    await db.transaction(async (tx) => {
      const [pay] = await tx
        .insert(salaryAdvancePayments)
        .values({
          tenantId: c.tenantId,
          advanceId: adv.id,
          employeeId: adv.employeeId,
          jumlah,
          metode,
          tanggal: tgl.toISOString().slice(0, 10),
          catatan: input.catatan?.trim() || null,
          createdByNama: c.nama,
        })
        .returning({ id: salaryAdvancePayments.id });

      await tx
        .update(salaryAdvances)
        .set({
          dibayar: dibayarBaru,
          status: lunas ? "dipotong" : "belum_dipotong",
          settledAt: lunas ? new Date() : null,
        })
        .where(eq(salaryAdvances.id, adv.id));

      await postJournal(tx, c.tenantId, {
        tanggal: tgl,
        keterangan:
          metode === "tunai"
            ? "Pengembalian kasbon (tunai)"
            : "Potong kasbon dari gaji",
        refType: metode === "tunai" ? "kasbon_tunai" : "kasbon_potong",
        refId: pay.id,
        lines: [
          { kode: debit, debit: jumlah },
          { kode: kredit, kredit: jumlah },
        ],
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath("/gaji");
  revalidatePath(`/gaji/${adv.employeeId}`);
  return { ok: true };
}

/** Lunasi seluruh sisa kasbon lewat potong gaji (jalan pintas). */
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
  const sisa = Math.max(0, adv.jumlah - adv.dibayar);
  if (adv.status === "dipotong" || sisa <= 0) return { ok: true };
  return repayAdvance({ advanceId: id, jumlah: sisa, metode: "potong_gaji" });
}

/** Hapus kasbon + seluruh cicilan & jurnal terkait (koreksi). */
export async function deleteAdvance(id: string): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const db = getDb();
  const [adv] = await db
    .select({ id: salaryAdvances.id, employeeId: salaryAdvances.employeeId })
    .from(salaryAdvances)
    .where(and(eq(salaryAdvances.id, id), eq(salaryAdvances.tenantId, c.tenantId)))
    .limit(1);
  if (!adv) return { ok: false, error: "Kasbon tidak ditemukan." };

  try {
    await db.transaction(async (tx) => {
      const pays = await tx
        .select({ id: salaryAdvancePayments.id })
        .from(salaryAdvancePayments)
        .where(
          and(
            eq(salaryAdvancePayments.tenantId, c.tenantId),
            eq(salaryAdvancePayments.advanceId, id),
          ),
        );
      const payIds = pays.map((p) => p.id);
      // Hapus jurnal cicilan (kasbon_potong / kasbon_tunai) per pembayaran.
      if (payIds.length) {
        await tx
          .delete(journalEntries)
          .where(
            and(
              eq(journalEntries.tenantId, c.tenantId),
              inArray(journalEntries.refType, ["kasbon_potong", "kasbon_tunai"]),
              inArray(journalEntries.refId, payIds),
            ),
          );
      }
      // Hapus jurnal kasbon awal.
      await tx
        .delete(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, c.tenantId),
            eq(journalEntries.refType, "kasbon"),
            eq(journalEntries.refId, id),
          ),
        );
      // Hapus kasbon (cascade → salary_advance_payments).
      await tx
        .delete(salaryAdvances)
        .where(
          and(eq(salaryAdvances.id, id), eq(salaryAdvances.tenantId, c.tenantId)),
        );
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath("/gaji");
  revalidatePath(`/gaji/${adv.employeeId}`);
  return { ok: true };
}
