import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getOpeningBalance } from "@/lib/opening-balance";
import { KeuanganTabs } from "../tabs";
import { SaldoAwalForm } from "./saldo-awal-form";

export const metadata: Metadata = { title: "Saldo Awal — AkaLink" };

export default async function SaldoAwalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const opening = await getOpeningBalance(tenantId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Saldo Awal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Isi uang kas &amp; saldo bank saat pertama kali membuka laundry. Data
          ini menjadi <b>modal awal</b> dan otomatis muncul di Neraca.
        </p>
      </div>
      <KeuanganTabs />

      <SaldoAwalForm
        initial={{
          kasPerusahaan: opening.kasPerusahaan,
          kasLaundry: opening.kasLaundry,
          bank: opening.bank,
          tanggal: opening.tanggal ?? "",
          sudahDiatur: opening.sudahDiatur,
        }}
      />
    </div>
  );
}
