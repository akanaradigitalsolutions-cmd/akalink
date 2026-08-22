import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser, getRoleFromUser } from "@/lib/auth";
import { getStaffSalaries } from "@/lib/salary";
import { getActiveOutlet } from "@/lib/outlets";
import { GajiManager } from "./gaji-manager";

export const metadata: Metadata = { title: "Gaji Karyawan — AkaLink" };

export default async function GajiPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const activeOutlet = await getActiveOutlet(tenantId);
  const staff = await getStaffSalaries(tenantId, activeOutlet?.id ?? null);

  const totalGaji = staff.reduce((s, x) => s + x.gaji, 0);
  const totalKasbon = staff.reduce((s, x) => s + x.kasbonBelum, 0);
  const totalOverdue = staff.reduce((s, x) => s + x.kasbonOverdue, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Gaji Karyawan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola gaji tiap karyawan & catat kasbon (uang muka gaji). Halaman ini
          hanya terlihat oleh pemilik.
        </p>
        {activeOutlet && (
          <p className="mt-1 text-xs text-slate-400">
            Menampilkan karyawan di outlet:{" "}
            <b className="text-slate-600 dark:text-slate-300">{activeOutlet.nama}</b>{" "}
            (pemilik selalu tampil).
          </p>
        )}
      </div>

      <GajiManager
        staff={staff}
        totalGaji={totalGaji}
        totalKasbon={totalKasbon}
        totalOverdue={totalOverdue}
      />
    </div>
  );
}
