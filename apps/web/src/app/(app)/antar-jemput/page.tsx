import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getDeliveries } from "@/lib/deliveries";
import { getRecentConsumers } from "@/lib/consumers";
import { getEmployees } from "@/lib/employees";
import { getActiveOutlet } from "@/lib/outlets";
import { AntarJemputManager } from "./antar-jemput-manager";

export const metadata: Metadata = { title: "Antar-Jemput — AkaLink" };

export default async function AntarJemputPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const activeOutlet = await getActiveOutlet(tenantId);
  const [list, konsumen, karyawan] = await Promise.all([
    getDeliveries(tenantId, 60, activeOutlet?.id ?? null),
    getRecentConsumers(tenantId, 50),
    getEmployees(tenantId),
  ]);

  const kurir = karyawan
    .filter((k) => k.status === "active")
    .map((k) => ({ id: k.id, nama: k.nama }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Antar-Jemput
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola penjemputan &amp; pengantaran cucian: jadwal, kurir, ongkir,
          dan status perjalanan.
          {activeOutlet && (
            <span className="ml-1 text-slate-400">· 🏪 {activeOutlet.nama}</span>
          )}
        </p>
      </div>

      <AntarJemputManager
        list={list}
        konsumen={konsumen.map((k) => ({ id: k.id, nama: k.nama, hp: k.hp }))}
        kurir={kurir}
        isOwner={getRoleFromUser(user) === "owner"}
      />
    </div>
  );
}
