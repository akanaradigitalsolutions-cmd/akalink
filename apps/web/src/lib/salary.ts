import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  getDb,
  employees,
  salaryAdvances,
  salaryAdvancePayments,
  payrollRuns,
} from "@akalink/db";
import { salaryCycle, type SalaryCycle } from "./salary-cycle";

/** YYYY-MM-DD hari ini (untuk cek jatuh tempo). */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export type StaffSalaryRow = {
  id: string;
  nama: string;
  role: string;
  gaji: number;
  kasbonBelum: number; // sisa kasbon yang belum dipotong (jumlah - dibayar)
  kasbonOverdue: number; // jumlah kasbon lewat jatuh tempo (belum lunas)
  nextPayDate: string | null; // tanggal gajian berikutnya
  daysUntil: number | null;
};

export async function getStaffSalaries(
  tenantId: string,
): Promise<StaffSalaryRow[]> {
  const db = getDb();
  const staff = await db
    .select({
      id: employees.id,
      nama: employees.nama,
      role: employees.role,
      gaji: employees.gaji,
      tanggalMulai: employees.tanggalMulai,
    })
    .from(employees)
    .where(eq(employees.tenantId, tenantId))
    .orderBy(desc(employees.createdAt));

  const advances = await db
    .select({
      employeeId: salaryAdvances.employeeId,
      jumlah: salaryAdvances.jumlah,
      dibayar: salaryAdvances.dibayar,
      status: salaryAdvances.status,
      jatuhTempo: salaryAdvances.jatuhTempo,
    })
    .from(salaryAdvances)
    .where(eq(salaryAdvances.tenantId, tenantId));

  const today = todayStr();

  return staff
    .map((s) => {
      const mine = advances.filter(
        (a) => a.employeeId === s.id && a.status === "belum_dipotong",
      );
      const kasbonBelum = mine.reduce(
        (sum, a) => sum + Math.max(0, a.jumlah - a.dibayar),
        0,
      );
      const kasbonOverdue = mine
        .filter((a) => a.jatuhTempo && a.jatuhTempo < today && a.jumlah - a.dibayar > 0)
        .reduce((sum, a) => sum + Math.max(0, a.jumlah - a.dibayar), 0);
      const cyc = salaryCycle(s.tanggalMulai, today);
      const { tanggalMulai: _tm, ...rest } = s;
      void _tm;
      return {
        ...rest,
        kasbonBelum,
        kasbonOverdue,
        nextPayDate: cyc.nextPayDate,
        daysUntil: cyc.daysUntil,
      };
    })
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
}

export type PaymentRow = {
  id: string;
  jumlah: number;
  metode: string; // "potong_gaji" | "tunai"
  tanggal: string | null;
  catatan: string | null;
  createdByNama: string | null;
  createdAt: string;
};

export type AdvanceDetail = {
  id: string;
  jumlah: number;
  dibayar: number;
  sisa: number;
  catatan: string | null;
  status: "belum_dipotong" | "dipotong";
  tanggal: string | null;
  jatuhTempo: string | null;
  overdue: boolean;
  createdByNama: string | null;
  createdAt: string;
  payments: PaymentRow[];
};

export type PayrollHistoryRow = {
  id: string;
  tanggalBayar: string;
  periodeMulai: string | null;
  periodeAkhir: string | null;
  gajiPokok: number;
  potonganKasbon: number;
  gajiBersih: number;
  akun: string;
  catatan: string | null;
  createdByNama: string | null;
  createdAt: string;
};

export type EmployeeGajiDetail = {
  employee: {
    id: string;
    nama: string;
    role: string;
    gaji: number;
    tanggalMulai: string | null;
  };
  cycle: SalaryCycle;
  advances: AdvanceDetail[];
  payrolls: PayrollHistoryRow[];
  totalKasbon: number; // total nominal kasbon aktif (belum lunas)
  totalDibayar: number; // total sudah dibayar/dicicil pada kasbon aktif
  totalSisa: number; // sisa yang masih terutang
  overdueCount: number; // jumlah kasbon lewat jatuh tempo
  estimasiGajiBersih: number; // gaji pokok - sisa kasbon aktif (perkiraan bawa pulang)
};

/** Detail lengkap gaji + riwayat kasbon (dengan cicilan) seorang karyawan. */
export async function getEmployeeGajiDetail(
  tenantId: string,
  employeeId: string,
): Promise<EmployeeGajiDetail | null> {
  const db = getDb();
  const [emp] = await db
    .select({
      id: employees.id,
      nama: employees.nama,
      role: employees.role,
      gaji: employees.gaji,
      tanggalMulai: employees.tanggalMulai,
    })
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
    .limit(1);
  if (!emp) return null;

  const advRows = await db
    .select({
      id: salaryAdvances.id,
      jumlah: salaryAdvances.jumlah,
      dibayar: salaryAdvances.dibayar,
      catatan: salaryAdvances.catatan,
      status: salaryAdvances.status,
      tanggal: salaryAdvances.tanggal,
      jatuhTempo: salaryAdvances.jatuhTempo,
      createdByNama: salaryAdvances.createdByNama,
      createdAt: salaryAdvances.createdAt,
    })
    .from(salaryAdvances)
    .where(
      and(
        eq(salaryAdvances.tenantId, tenantId),
        eq(salaryAdvances.employeeId, employeeId),
      ),
    )
    .orderBy(desc(salaryAdvances.createdAt));

  const advIds = advRows.map((a) => a.id);
  const payRows = advIds.length
    ? await db
        .select({
          id: salaryAdvancePayments.id,
          advanceId: salaryAdvancePayments.advanceId,
          jumlah: salaryAdvancePayments.jumlah,
          metode: salaryAdvancePayments.metode,
          tanggal: salaryAdvancePayments.tanggal,
          catatan: salaryAdvancePayments.catatan,
          createdByNama: salaryAdvancePayments.createdByNama,
          createdAt: salaryAdvancePayments.createdAt,
        })
        .from(salaryAdvancePayments)
        .where(eq(salaryAdvancePayments.tenantId, tenantId))
        .orderBy(desc(salaryAdvancePayments.createdAt))
    : [];

  const today = todayStr();

  const advances: AdvanceDetail[] = advRows.map((a) => {
    const sisa = Math.max(0, a.jumlah - a.dibayar);
    const overdue =
      a.status === "belum_dipotong" && !!a.jatuhTempo && a.jatuhTempo < today && sisa > 0;
    return {
      id: a.id,
      jumlah: a.jumlah,
      dibayar: a.dibayar,
      sisa,
      catatan: a.catatan,
      status: a.status,
      tanggal: a.tanggal,
      jatuhTempo: a.jatuhTempo,
      overdue,
      createdByNama: a.createdByNama,
      createdAt: a.createdAt.toISOString(),
      payments: payRows
        .filter((p) => p.advanceId === a.id)
        .map((p) => ({
          id: p.id,
          jumlah: p.jumlah,
          metode: p.metode,
          tanggal: p.tanggal,
          catatan: p.catatan,
          createdByNama: p.createdByNama,
          createdAt: p.createdAt.toISOString(),
        })),
    };
  });

  const aktif = advances.filter((a) => a.status === "belum_dipotong");
  const totalKasbon = aktif.reduce((s, a) => s + a.jumlah, 0);
  const totalDibayar = aktif.reduce((s, a) => s + a.dibayar, 0);
  const totalSisa = aktif.reduce((s, a) => s + a.sisa, 0);
  const overdueCount = advances.filter((a) => a.overdue).length;

  const payrollRows = await db
    .select({
      id: payrollRuns.id,
      tanggalBayar: payrollRuns.tanggalBayar,
      periodeMulai: payrollRuns.periodeMulai,
      periodeAkhir: payrollRuns.periodeAkhir,
      gajiPokok: payrollRuns.gajiPokok,
      potonganKasbon: payrollRuns.potonganKasbon,
      gajiBersih: payrollRuns.gajiBersih,
      akun: payrollRuns.akun,
      catatan: payrollRuns.catatan,
      createdByNama: payrollRuns.createdByNama,
      createdAt: payrollRuns.createdAt,
    })
    .from(payrollRuns)
    .where(
      and(
        eq(payrollRuns.tenantId, tenantId),
        eq(payrollRuns.employeeId, employeeId),
      ),
    )
    .orderBy(desc(payrollRuns.tanggalBayar), desc(payrollRuns.createdAt));

  const payrolls: PayrollHistoryRow[] = payrollRows.map((p) => ({
    id: p.id,
    tanggalBayar: p.tanggalBayar,
    periodeMulai: p.periodeMulai,
    periodeAkhir: p.periodeAkhir,
    gajiPokok: p.gajiPokok,
    potonganKasbon: p.potonganKasbon,
    gajiBersih: p.gajiBersih,
    akun: p.akun,
    catatan: p.catatan,
    createdByNama: p.createdByNama,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    employee: emp,
    cycle: salaryCycle(emp.tanggalMulai, today),
    advances,
    payrolls,
    totalKasbon,
    totalDibayar,
    totalSisa,
    overdueCount,
    estimasiGajiBersih: Math.max(0, emp.gaji - totalSisa),
  };
}
