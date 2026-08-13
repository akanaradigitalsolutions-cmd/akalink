import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getActiveOutlet, seedDefaultOutletIfEmpty } from "@/lib/outlets";
import { getInventory, getRecentMovements } from "@/lib/inventory";
import { getCoa, seedDefaultCoaIfEmpty } from "@/lib/coa";
import { InventoryManager } from "./inventory-manager";

export const metadata: Metadata = { title: "Inventori — AkaLink" };

export default async function InventoriPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultOutletIfEmpty(tenantId);
  await seedDefaultCoaIfEmpty(tenantId);
  const outlet = await getActiveOutlet(tenantId);
  if (!outlet) redirect("/dashboard");

  const [items, movements, akun] = await Promise.all([
    getInventory(tenantId, outlet.id),
    getRecentMovements(tenantId, outlet.id, 25),
    getCoa(tenantId),
  ]);
  const kas = akun
    .filter((a) => a.isKas && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Inventori Bahan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Stok bahan (deterjen, parfum, plastik, dll) untuk outlet{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            🏪 {outlet.nama}
          </span>
          . Pembelian &amp; pemakaian otomatis tercatat di jurnal.
        </p>
      </div>

      <InventoryManager
        items={items}
        kas={kas}
        movements={movements.map((m) => ({
          id: m.id,
          tipe: m.tipe,
          qtyDelta: m.qtyDelta,
          saldoSesudah: m.saldoSesudah,
          keterangan: m.keterangan,
          itemNama: m.itemNama,
          satuan: m.satuan,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
