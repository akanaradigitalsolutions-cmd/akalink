import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getInvestors } from "@/lib/investors";
import { InvestorList } from "./investor-list";

export const metadata: Metadata = { title: "Investor — AkaLink" };

export default async function InvestorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const investors = await getInvestors(tenantId);
  const totalModal = investors.reduce((s, i) => s + i.totalModal, 0);
  const totalDibayar = investors.reduce((s, i) => s + i.totalDibayar, 0);

  // Default periode: bulan berjalan.
  const now = new Date();
  const awal = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const akhir = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Investor &amp; Bagi Hasil
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola modal investor, hitung bagi hasil dari laba usaha, dan catat
          pembayarannya.
        </p>
      </div>

      <InvestorList
        investors={investors}
        totalModal={totalModal}
        totalDibayar={totalDibayar}
        defaultAwal={awal}
        defaultAkhir={akhir}
      />
    </div>
  );
}
