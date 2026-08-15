import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getB2bClientDetail, getUnlinkedConsumers } from "@/lib/b2b";
import { ClientDetail } from "./client-detail";

export const metadata: Metadata = { title: "Klien B2B — AkaLink" };

export default async function B2bClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const detail = await getB2bClientDetail(tenantId, id);
  if (!detail) notFound();
  const unlinked = await getUnlinkedConsumers(tenantId, 100);

  return (
    <ClientDetail
      client={{
        id: detail.client.id,
        perusahaan: detail.client.perusahaan,
        pic: detail.client.pic,
        telepon: detail.client.telepon,
        email: detail.client.email,
        alamat: detail.client.alamat,
        npwp: detail.client.npwp,
        terminHari: detail.client.terminHari,
        aktif: detail.client.aktif,
      }}
      linkedConsumers={detail.linkedConsumers}
      outstandingTx={detail.outstandingTx}
      outstandingTotal={detail.outstandingTotal}
      invoices={detail.invoices.map((i) => ({
        id: i.id,
        nomor: i.nomor,
        total: i.total,
        status: i.status,
        tanggalTerbit: i.tanggalTerbit.toISOString(),
        jatuhTempo: i.jatuhTempo,
      }))}
      unlinked={unlinked.map((c) => ({ id: c.id, nama: c.nama, hp: c.hp }))}
    />
  );
}
