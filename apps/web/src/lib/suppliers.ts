import "server-only";

import { eq } from "drizzle-orm";
import { getDb, suppliers } from "@akalink/db";

export type SupplierRow = {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  aktif: boolean;
};

export async function getSuppliers(tenantId: string): Promise<SupplierRow[]> {
  const db = getDb();
  return db
    .select({
      id: suppliers.id,
      nama: suppliers.nama,
      telepon: suppliers.telepon,
      alamat: suppliers.alamat,
      aktif: suppliers.aktif,
    })
    .from(suppliers)
    .where(eq(suppliers.tenantId, tenantId))
    .orderBy(suppliers.nama);
}
