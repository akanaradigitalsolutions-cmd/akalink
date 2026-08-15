import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantAdminDetail } from "@/lib/platform";
import { AdminTenantControls } from "./controls";

export const metadata: Metadata = { title: "Kelola Laundry — Admin AkaLink" };

export default async function AdminTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getTenantAdminDetail(id);
  if (!detail) notFound();

  return (
    <AdminTenantControls
      tenant={{
        id: detail.tenant.id,
        nama: detail.tenant.nama,
        kota: detail.tenant.kota,
        telepon: detail.tenant.telepon,
        status: detail.tenant.status,
        tier: detail.tenant.tier,
        saldoKoin: detail.tenant.saldoKoin,
        biayaPerNota: detail.tenant.biayaPerNota,
        biayaPerWa: detail.tenant.biayaPerWa,
        createdAt: detail.tenant.createdAt.toISOString(),
      }}
      koinTerpakai={detail.koinTerpakai}
      txCount={detail.txCount}
      ledger={detail.ledger.map((l) => ({
        id: l.id,
        tipe: l.tipe,
        delta: l.delta,
        saldoSesudah: l.saldoSesudah,
        keterangan: l.keterangan,
        createdAt: l.createdAt,
      }))}
    />
  );
}
