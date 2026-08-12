import "server-only";

import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { getDb, employees } from "@akalink/db";

export type EmployeeRow = {
  id: string;
  nama: string;
  email: string | null;
  role: string;
  status: string;
  outletIds: string[];
  authUserId: string | null;
  createdAt: Date;
};

/** Daftar karyawan milik tenant (owner dulu, lalu terbaru). */
export const getEmployees = cache(
  async (tenantId: string): Promise<EmployeeRow[]> => {
    const db = getDb();
    const rows = await db
      .select({
        id: employees.id,
        nama: employees.nama,
        email: employees.email,
        role: employees.role,
        status: employees.status,
        outletIds: employees.outletIds,
        authUserId: employees.authUserId,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(desc(employees.createdAt));

    // Owner tampil paling atas, sisanya urut terbaru.
    return rows.sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  },
);
