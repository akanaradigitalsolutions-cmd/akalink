import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getActiveServices, getTransactionWithItems } from "@/lib/transactions";
import { getRecentConsumers } from "@/lib/consumers";
import { BuatTransaksi } from "../../baru/buat-transaksi";

export const metadata: Metadata = { title: "Edit Transaksi — AkaLink" };

export default async function EditTransaksiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect(`/transaksi/${id}`);

  const [data, services, consumers] = await Promise.all([
    getTransactionWithItems(tenantId, id),
    getActiveServices(tenantId),
    getRecentConsumers(tenantId, 100),
  ]);
  if (!data) notFound();
  const { tx, items } = data;

  if (tx.statusPembayaran === "lunas") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Link
          href={`/transaksi/${id}`}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← Kembali
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Transaksi <b>{tx.noNota}</b> sudah <b>Lunas</b> sehingga terkunci dan
          tidak bisa diedit. Untuk mengoreksi, ubah dulu status pembayaran ke
          <i> belum lunas</i> di halaman detail transaksi.
        </div>
      </div>
    );
  }

  const initial = {
    consumerId: tx.consumerId ?? null,
    items: items.map((it) => ({
      serviceId: it.serviceId ?? "",
      nama: it.namaLayanan,
      tipeSatuan: it.tipeSatuan,
      harga: Number(it.harga),
      qty: String(Number(it.qty)),
    })),
    isExpress: tx.isExpress,
    biayaExpress: Number(tx.biayaExpress),
    diskon: Number(tx.diskon),
    catatan: tx.catatan ?? "",
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/transaksi/${id}`}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← Batal
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Edit Transaksi · {tx.noNota}
        </h1>
      </header>

      <BuatTransaksi
        mode="edit"
        txId={id}
        initial={initial}
        services={services.map((s) => ({
          id: s.id,
          nama: s.nama,
          tipeSatuan: s.tipeSatuan,
          harga: s.harga,
          kategori: s.kategori,
        }))}
        consumers={consumers.map((c) => ({
          id: c.id,
          nama: c.nama,
          hp: c.hp,
        }))}
      />
    </div>
  );
}
