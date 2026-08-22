"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  employees,
  salaryAdvances,
  salaryAdvancePayments,
  payrollRuns,
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
import { periodeForPayDate } from "@/lib/salary-cycle";

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
  revalidatePath(`/gaji/${input.employeeId}`);
  return { ok: true };
}

/** Set tanggal mulai kerja (menentukan siklus/tanggal gajian bulanan). */
export async function setEmployeeStart(input: {
  employeeId: string;
  tanggalMulai: string | null;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const tgl = input.tanggalMulai ? toDate(input.tanggalMulai) : undefined;
  if (input.tanggalMulai && !tgl)
    return { ok: false, error: "Tanggal tidak valid." };
  const db = getDb();
  await db
    .update(employees)
    .set({
      tanggalMulai: tgl ? tgl.toISOString().slice(0, 10) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, c.tenantId)));
  revalidatePath("/gaji");
  revalidatePath(`/gaji/${input.employeeId}`);
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
          sumberAkun: akun,
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
 * Terima pengembalian kasbon TUNAI (karyawan mengembalikan uang, bukan potong gaji).
 * Dr Kas Outlet / Cr Piutang Karyawan. Menambah `dibayar`; bila lunas → status dipotong.
 * (Pemotongan dari gaji dilakukan lewat Proses Gaji / runPayroll, bukan di sini,
 *  agar tidak dobel-diakui sebagai beban gaji.)
 */
export async function repayAdvance(input: {
  advanceId: string;
  jumlah: number | string;
  tanggal?: string;
  catatan?: string;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
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
          metode: "tunai",
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
        keterangan: "Pengembalian kasbon (tunai)",
        refType: "kasbon_tunai",
        refId: pay.id,
        lines: [
          { kode: "1.1.02", debit: jumlah }, // Dr Kas Outlet
          { kode: AKUN_PIUTANG_KARYAWAN, kredit: jumlah }, // Cr Piutang Karyawan
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

/**
 * PROSES GAJI (penggajian) satu karyawan untuk satu periode.
 * Membayar gaji pokok, memotong kasbon terpilih, dan mencatat SATU jurnal:
 *   Dr Beban Gaji (gaji pokok)
 *     Cr Piutang Karyawan (total potongan kasbon)
 *     Cr Kas/Bank         (gaji bersih yang dibayarkan)
 * Ini otomatis muncul di Laba-Rugi (Beban Gaji) & Neraca (Piutang & Kas turun).
 */
export async function runPayroll(input: {
  employeeId: string;
  tanggalBayar: string;
  gajiPokok: number | string;
  potongan?: { advanceId: string; jumlah: number | string }[];
  akun?: "1.1.02" | "1.1.04";
  catatan?: string;
}): Promise<SalaryResult> {
  const c = await ownerCtx();
  if (!c) return { ok: false, error: "Hanya pemilik." };
  const akun = input.akun === "1.1.04" ? "1.1.04" : "1.1.02";
  const tgl = toDate(input.tanggalBayar);
  if (!tgl) return { ok: false, error: "Tanggal bayar tidak valid." };
  const gajiPokok = Math.max(0, Math.floor(Number(input.gajiPokok) || 0));
  if (gajiPokok <= 0) return { ok: false, error: "Gaji pokok tidak valid." };

  await seedDefaultCoaIfEmpty(c.tenantId);
  await ensureCoaAccount(c.tenantId, AKUN_PIUTANG_KARYAWAN);

  const db = getDb();
  const [emp] = await db
    .select({ id: employees.id, nama: employees.nama })
    .from(employees)
    .where(and(eq(employees.id, input.employeeId), eq(employees.tenantId, c.tenantId)))
    .limit(1);
  if (!emp) return { ok: false, error: "Karyawan tidak ditemukan." };

  // Validasi & normalisasi potongan kasbon.
  const wanted = (input.potongan ?? []).filter((p) => Number(p.jumlah) > 0);
  const advIds = wanted.map((p) => p.advanceId);
  const advs = advIds.length
    ? await db
        .select()
        .from(salaryAdvances)
        .where(
          and(
            eq(salaryAdvances.tenantId, c.tenantId),
            eq(salaryAdvances.employeeId, emp.id),
            inArray(salaryAdvances.id, advIds),
          ),
        )
    : [];
  const advMap = new Map(advs.map((a) => [a.id, a]));

  const potong: { adv: (typeof advs)[number]; jumlah: number }[] = [];
  for (const w of wanted) {
    const adv = advMap.get(w.advanceId);
    if (!adv) continue;
    const sisa = Math.max(0, adv.jumlah - adv.dibayar);
    if (sisa <= 0) continue;
    const j = Math.min(Math.floor(Number(w.jumlah) || 0), sisa);
    if (j > 0) potong.push({ adv, jumlah: j });
  }
  const potonganKasbon = potong.reduce((s, p) => s + p.jumlah, 0);
  if (potonganKasbon > gajiPokok)
    return {
      ok: false,
      error: "Total potongan kasbon melebihi gaji pokok.",
    };
  const gajiBersih = gajiPokok - potonganKasbon;

  const tglStr = tgl.toISOString().slice(0, 10);
  const periode = periodeForPayDate(tglStr);

  try {
    await db.transaction(async (tx) => {
      const [run] = await tx
        .insert(payrollRuns)
        .values({
          tenantId: c.tenantId,
          employeeId: emp.id,
          periodeMulai: periode.mulai,
          periodeAkhir: periode.akhir,
          tanggalBayar: tglStr,
          gajiPokok,
          potonganKasbon,
          gajiBersih,
          akun,
          catatan: input.catatan?.trim() || null,
          createdByNama: c.nama,
        })
        .returning({ id: payrollRuns.id });

      // Tandai kasbon terpotong + catat riwayat (tanpa jurnal terpisah).
      for (const p of potong) {
        const dibayarBaru = p.adv.dibayar + p.jumlah;
        const lunas = dibayarBaru >= p.adv.jumlah;
        await tx
          .update(salaryAdvances)
          .set({
            dibayar: dibayarBaru,
            status: lunas ? "dipotong" : "belum_dipotong",
            settledAt: lunas ? new Date() : null,
          })
          .where(eq(salaryAdvances.id, p.adv.id));
        await tx.insert(salaryAdvancePayments).values({
          tenantId: c.tenantId,
          advanceId: p.adv.id,
          employeeId: emp.id,
          jumlah: p.jumlah,
          metode: "potong_gaji",
          payrollRunId: run.id,
          tanggal: tglStr,
          catatan: "Potong gaji (penggajian)",
          createdByNama: c.nama,
        });
      }

      // Jurnal gabungan penggajian.
      const lines: { kode: string; debit?: number; kredit?: number }[] = [
        { kode: AKUN_BEBAN_GAJI, debit: gajiPokok },
      ];
      if (potonganKasbon > 0)
        lines.push({ kode: AKUN_PIUTANG_KARYAWAN, kredit: potonganKasbon });
      if (gajiBersih > 0) lines.push({ kode: akun, kredit: gajiBersih });
      await postJournal(tx, c.tenantId, {
        tanggal: tgl,
        keterangan: `Gaji ${emp.nama} (${periode.mulai} s/d ${periode.akhir})`,
        refType: "penggajian",
        refId: run.id,
        lines,
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal." };
  }
  revalidatePath("/gaji");
  revalidatePath(`/gaji/${emp.id}`);
  revalidatePath("/keuangan/neraca");
  revalidatePath("/keuangan/laba-rugi");
  return { ok: true };
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

  // Kasbon yang sudah pernah dipotong lewat Proses Gaji tidak boleh dihapus
  // (akan merusak jurnal penggajian). Batalkan lewat koreksi penggajian.
  const pays = await db
    .select({
      id: salaryAdvancePayments.id,
      payrollRunId: salaryAdvancePayments.payrollRunId,
    })
    .from(salaryAdvancePayments)
    .where(
      and(
        eq(salaryAdvancePayments.tenantId, c.tenantId),
        eq(salaryAdvancePayments.advanceId, id),
      ),
    );
  if (pays.some((p) => p.payrollRunId))
    return {
      ok: false,
      error: "Kasbon sudah terpotong lewat Proses Gaji — tidak bisa dihapus.",
    };

  try {
    await db.transaction(async (tx) => {
      const payIds = pays.map((p) => p.id);
      // Hapus jurnal pengembalian tunai per pembayaran.
      if (payIds.length) {
        await tx
          .delete(journalEntries)
          .where(
            and(
              eq(journalEntries.tenantId, c.tenantId),
              eq(journalEntries.refType, "kasbon_tunai"),
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
