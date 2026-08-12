import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getOutlets, seedDefaultOutletIfEmpty } from "@/lib/outlets";
import { OutletManager } from "./outlet-manager";

export const metadata: Metadata = { title: "Outlet — AkaLink" };

export default async function OutletPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  await seedDefaultOutletIfEmpty(tenantId);
  const daftar = await getOutlets(tenantId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Outlet / Cabang
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola cabang usaha Anda. Transaksi baru akan tercatat pada outlet
          yang sedang aktif (dipilih di bagian atas layar).
        </p>
      </div>

      <OutletManager daftar={daftar} />
    </div>
  );
}
