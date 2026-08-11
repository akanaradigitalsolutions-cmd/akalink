import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTransactionWithItems } from "@/lib/transactions";
import {
  formatRupiah,
  formatDateTime,
  formatHp,
  SATUAN_SINGKAT,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Detail Transaksi — AkaLink",
};

export default async function DetailTransaksiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const data = await getTransactionWithItems(tenantId, id);
  if (!data) notFound();
  const { tx, consumer, items } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href="/transaksi"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← Transaksi
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Detail Transaksi
        </h1>
      </header>

      {/* Kartu nota */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              No. Nota
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {tx.noNota}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {LABEL_STATUS_KERJA[tx.statusPekerjaan]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {LABEL_STATUS_BAYAR[tx.statusPembayaran]}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-b border-dashed border-slate-200 py-4 text-sm dark:border-slate-700">
          <Info label="Konsumen" value={consumer?.nama ?? "Umum"} />
          <Info label="No. HP" value={formatHp(consumer?.hp)} />
          <Info label="Order diterima" value={formatDateTime(tx.orderDiterima)} />
          <Info
            label="Estimasi selesai"
            value={formatDateTime(tx.estimasiSelesai)}
          />
        </dl>

        <div className="py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Rincian
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {it.namaLayanan}{" "}
                  <span className="text-slate-400">
                    ({Number(it.qty)} {SATUAN_SINGKAT[it.tipeSatuan] ?? ""} ×{" "}
                    {formatRupiah(it.harga)})
                  </span>
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatRupiah(it.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
          <Row label="Subtotal" value={formatRupiah(tx.subtotal)} />
          {Number(tx.biayaExpress) > 0 && (
            <Row label="Express" value={`+ ${formatRupiah(tx.biayaExpress)}`} />
          )}
          {Number(tx.diskon) > 0 && (
            <Row label="Diskon" value={`− ${formatRupiah(tx.diskon)}`} />
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-white">
              Total
            </span>
            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
              {formatRupiah(tx.grandTotal)}
            </span>
          </div>
        </div>

        {tx.catatan && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Catatan: {tx.catatan}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Proses pengerjaan, pembayaran, dan cetak nota akan hadir di langkah
        berikutnya (1.4).
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
