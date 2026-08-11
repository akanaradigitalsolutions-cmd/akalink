import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getCoa, seedDefaultCoaIfEmpty } from "@/lib/coa";
import { KeuanganTabs } from "../tabs";
import { FinanceForms } from "./finance-forms";

export const metadata: Metadata = { title: "Kas & Biaya — AkaLink" };

export default async function CatatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultCoaIfEmpty(tenantId);
  const akun = await getCoa(tenantId);

  const kas = akun
    .filter((a) => a.isKas && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));
  const beban = akun
    .filter((a) => a.tipe === "beban" && a.kode !== "5" && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Kas & Biaya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catat pengeluaran, setoran modal, prive, dan transfer kas. Setiap
          entri otomatis membuat jurnal.
        </p>
      </div>
      <KeuanganTabs />

      <FinanceForms kas={kas} beban={beban} />

      <p className="text-center text-xs text-slate-400">
        Entri yang tersimpan bisa dilihat di tab Jurnal dan memengaruhi
        Laba-Rugi & Neraca.
      </p>
    </div>
  );
}
