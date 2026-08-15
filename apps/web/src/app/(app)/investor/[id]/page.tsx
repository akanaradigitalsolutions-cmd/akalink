import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getInvestorDetail } from "@/lib/investors";
import { InvestorDetail } from "./investor-detail";

export const metadata: Metadata = { title: "Investor — AkaLink" };

export default async function InvestorDetailPage({
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

  const detail = await getInvestorDetail(tenantId, id);
  if (!detail) notFound();

  return (
    <InvestorDetail
      investor={{
        id: detail.investor.id,
        nama: detail.investor.nama,
        telepon: detail.investor.telepon,
        email: detail.investor.email,
        catatan: detail.investor.catatan,
        aktif: detail.investor.aktif,
      }}
      investments={detail.investments.map((i) => ({
        id: i.id,
        modal: i.modal,
        persen: Number(i.persenBagiHasil),
        tanggalMulai: i.tanggalMulai,
        aktif: i.aktif,
      }))}
      payouts={detail.payouts.map((p) => ({
        id: p.id,
        jumlah: p.jumlah,
        persen: Number(p.persen),
        labaPeriode: p.labaPeriode,
        periodeAwal: p.periodeAwal,
        periodeAkhir: p.periodeAkhir,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
