import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import {
  getActiveOutlet,
  seedDefaultOutletIfEmpty,
} from "@/lib/outlets";
import { getMachines, getMachineSessions } from "@/lib/machines";
import { getRecentConsumers } from "@/lib/consumers";
import { getBaseUrl } from "@/lib/nota";
import { MesinManager } from "./mesin-manager";

export const metadata: Metadata = { title: "Mesin — AkaLink" };

export default async function MesinPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultOutletIfEmpty(tenantId);
  const outlet = await getActiveOutlet(tenantId);

  const isOwner = getRoleFromUser(user) === "owner";
  const [machines, sessions, konsumen, base] = await Promise.all([
    getMachines(tenantId, outlet?.id),
    getMachineSessions(tenantId, 20),
    getRecentConsumers(tenantId, 50),
    getBaseUrl(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Mesin Self-Service
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola mesin cuci &amp; pengering di outlet{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            🏪 {outlet?.nama ?? "-"}
          </span>
          . Mulai/stop sesi; sambungkan ke relay IoT bila tersedia.
        </p>
      </div>

      <MesinManager
        machines={machines}
        sessions={sessions}
        konsumen={konsumen.map((k) => ({ id: k.id, nama: k.nama }))}
        isOwner={isOwner}
        deviceBase={`${base}/api/device`}
      />
    </div>
  );
}
