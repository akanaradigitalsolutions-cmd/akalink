import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, employees, salaryAdvances } from "@akalink/db";

export type StaffSalaryRow = {
  id: string;
  nama: string;
  role: string;
  gaji: number;
  kasbonBelum: number; // total kasbon yang belum dipotong
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
    })
    .from(employees)
    .where(eq(employees.tenantId, tenantId))
    .orderBy(desc(employees.createdAt));

  const advances = await db
    .select({
      employeeId: salaryAdvances.employeeId,
      jumlah: salaryAdvances.jumlah,
      status: salaryAdvances.status,
    })
    .from(salaryAdvances)
    .where(eq(salaryAdvances.tenantId, tenantId));

  return staff
    .map((s) => ({
      ...s,
      kasbonBelum: advances
        .filter((a) => a.employeeId === s.id && a.status === "belum_dipotong")
        .reduce((sum, a) => sum + a.jumlah, 0),
    }))
    .sort((a, b) =>
      a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0,
    );
}

export type AdvanceRow = {
  id: string;
  jumlah: number;
  catatan: string | null;
  status: "belum_dipotong" | "dipotong";
  createdByNama: string | null;
  createdAt: string;
};

/** Semua kasbon tenant (untuk dikelompokkan per karyawan di UI). */
export async function getAllAdvances(
  tenantId: string,
): Promise<(AdvanceRow & { employeeId: string })[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: salaryAdvances.id,
      employeeId: salaryAdvances.employeeId,
      jumlah: salaryAdvances.jumlah,
      catatan: salaryAdvances.catatan,
      status: salaryAdvances.status,
      createdByNama: salaryAdvances.createdByNama,
      createdAt: salaryAdvances.createdAt,
    })
    .from(salaryAdvances)
    .where(eq(salaryAdvances.tenantId, tenantId))
    .orderBy(desc(salaryAdvances.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getAdvances(
  tenantId: string,
  employeeId: string,
): Promise<AdvanceRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: salaryAdvances.id,
      jumlah: salaryAdvances.jumlah,
      catatan: salaryAdvances.catatan,
      status: salaryAdvances.status,
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
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
