import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, tenants } from "@akalink/db";

export type TenantSettings = {
  id: string;
  nama: string;
  kota: string | null;
  telepon: string | null;
  alamat: string | null;
  syaratKetentuan: string[] | null;
  poinRupiah: number;
  fiturMember: boolean;
  fiturPoin: boolean;
  fiturPromo: boolean;
  fiturBayarDigital: boolean;
  bayarDigitalSetuju: boolean;
  fiturSelfService: boolean;
  fiturAntarJemput: boolean;
};

/** Ambil profil usaha (tenant) untuk halaman Pengaturan. */
export const getTenantSettings = cache(
  async (tenantId: string): Promise<TenantSettings | null> => {
    const db = getDb();
    const [row] = await db
      .select({
        id: tenants.id,
        nama: tenants.nama,
        kota: tenants.kota,
        telepon: tenants.telepon,
        alamat: tenants.alamat,
        syaratKetentuan: tenants.syaratKetentuan,
        poinRupiah: tenants.poinRupiah,
        fiturMember: tenants.fiturMember,
        fiturPoin: tenants.fiturPoin,
        fiturPromo: tenants.fiturPromo,
        fiturBayarDigital: tenants.fiturBayarDigital,
        bayarDigitalSetujuAt: tenants.bayarDigitalSetujuAt,
        fiturSelfService: tenants.fiturSelfService,
        fiturAntarJemput: tenants.fiturAntarJemput,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!row) return null;
    const { bayarDigitalSetujuAt, ...rest } = row;
    return { ...rest, bayarDigitalSetuju: !!bayarDigitalSetujuAt };
  },
);
