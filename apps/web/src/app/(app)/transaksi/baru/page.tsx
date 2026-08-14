import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getActiveServices } from "@/lib/transactions";
import { getRecentConsumers } from "@/lib/consumers";
import { getActiveOutlet, seedDefaultOutletIfEmpty } from "@/lib/outlets";
import { getMemberTypes } from "@/lib/members";
import { getTenantSettings } from "@/lib/settings";
import { BuatTransaksi } from "./buat-transaksi";

export const metadata: Metadata = {
  title: "Transaksi Baru — AkaLink",
};

export default async function TransaksiBaruPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultOutletIfEmpty(tenantId);
  const activeOutlet = await getActiveOutlet(tenantId);
  const settings = await getTenantSettings(tenantId);
  const fiturMember = settings?.fiturMember ?? false;
  const [services, consumers, memberTypes] = await Promise.all([
    getActiveServices(tenantId, activeOutlet?.id),
    getRecentConsumers(tenantId, 100),
    fiturMember ? getMemberTypes(tenantId) : Promise.resolve([]),
  ]);
  const memberMap = new Map(
    memberTypes.map((m) => [m.id, { nama: m.nama, pct: Number(m.diskonPersen) }]),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href="/transaksi"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← Transaksi
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Transaksi Baru
        </h1>
      </header>

      <BuatTransaksi
        services={services.map((s) => ({
          id: s.id,
          nama: s.nama,
          tipeSatuan: s.tipeSatuan,
          harga: s.harga,
          kategori: s.kategori,
        }))}
        promoEnabled={settings?.fiturPromo ?? false}
        consumers={consumers.map((c) => {
          const m = c.memberTypeId ? memberMap.get(c.memberTypeId) : undefined;
          return {
            id: c.id,
            nama: c.nama,
            hp: c.hp,
            memberNama: m?.nama ?? null,
            diskonPersen: m?.pct ?? 0,
          };
        })}
      />
    </div>
  );
}
