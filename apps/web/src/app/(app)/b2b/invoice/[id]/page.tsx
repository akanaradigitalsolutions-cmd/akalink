import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getInvoiceDetail } from "@/lib/b2b";
import { InvoiceView } from "./invoice-view";

export const metadata: Metadata = { title: "Invoice — AkaLink" };

export default async function InvoicePage({
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

  const detail = await getInvoiceDetail(tenantId, id);
  if (!detail || !detail.client) notFound();
  const { tenant } = await getTenantContext(user.id, tenantId);

  return (
    <InvoiceView
      tenant={{
        nama: tenant?.nama ?? "AkaLink",
        alamat: tenant?.alamat ?? null,
        telepon: tenant?.telepon ?? null,
        kota: tenant?.kota ?? null,
      }}
      client={{
        perusahaan: detail.client.perusahaan,
        pic: detail.client.pic,
        alamat: detail.client.alamat,
        npwp: detail.client.npwp,
      }}
      invoice={{
        id: detail.invoice.id,
        nomor: detail.invoice.nomor,
        status: detail.invoice.status,
        total: detail.invoice.total,
        tanggalTerbit: detail.invoice.tanggalTerbit.toISOString(),
        jatuhTempo: detail.invoice.jatuhTempo,
        periodeAwal: detail.invoice.periodeAwal,
        periodeAkhir: detail.invoice.periodeAkhir,
      }}
      items={detail.items}
    />
  );
}
