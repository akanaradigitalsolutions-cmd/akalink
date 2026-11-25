import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getTransactionWithItems } from "@/lib/transactions";
import { getBaseUrl, qrSvg } from "@/lib/nota";
import { ThermalPrint, BluetoothPrint } from "@/components/nota/client";
import {
  formatDateTime,
  formatRupiah,
  SATUAN_SINGKAT,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";
import type { LabelPrintData } from "@/lib/escpos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Label — AkaLink",
};

export default async function LabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const data = await getTransactionWithItems(tenantId, id);
  if (!data) notFound();
  const { tenant } = await getTenantContext(user.id, tenantId);
  const { tx, consumer, items } = data;

  const base = await getBaseUrl();
  const link = `${base}/n/${id}`;
  const qr = await qrSvg(link, 96);
  const totalUnit = items.reduce((n, it) => n + Number(it.qty), 0);
  const statusBayar =
    LABEL_STATUS_BAYAR[tx.statusPembayaran] ?? tx.statusPembayaran;
  const payStyle =
    tx.statusPembayaran === "lunas"
      ? "border-green-600 text-green-700"
      : tx.statusPembayaran === "dp"
        ? "border-amber-500 text-amber-700"
        : "border-red-600 text-red-700";

  const labelData: LabelPrintData = {
    namaToko: tenant?.nama ?? "AkaLink",
    noNota: tx.noNota,
    pelanggan: consumer?.nama ?? "Umum",
    statusBayar,
    totalUnit: `${totalUnit} unit`,
    grandTotal: formatRupiah(tx.grandTotal),
    masuk: formatDateTime(tx.orderDiterima),
    selesai: formatDateTime(tx.estimasiSelesai),
    items: items.map((it) => ({
      label: `${Number(it.qty)} ${SATUAN_SINGKAT[it.tipeSatuan] ?? ""} ${it.namaLayanan}`.trim(),
      subtotal: formatRupiah(it.subtotal),
    })),
    link,
  };

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      {/* Label ~58mm (dibuat besar & jelas untuk dicetak/ditempel) */}
      <div className="printable mx-auto w-72 rounded-lg border-2 border-slate-500 bg-white p-4 text-slate-900">
        <p className="text-center text-lg font-extrabold leading-tight">
          {tenant?.nama ?? "AkaLink"}
        </p>
        <p className="text-center text-sm font-bold tracking-wide">
          {tx.noNota}
        </p>

        <div className="my-2 border-t-2 border-dashed border-slate-400" />

        <p className="text-2xl font-extrabold leading-tight">
          {consumer?.nama ?? "Umum"}
        </p>
        <div className="mt-1 flex items-center justify-between text-base font-bold">
          <span>{totalUnit} unit</span>
          <span>{formatRupiah(tx.grandTotal)}</span>
        </div>
        <div
          className={`mt-2 rounded-md border-2 bg-white py-1 text-center text-base font-extrabold uppercase ${payStyle}`}
        >
          {statusBayar}
        </div>
        <p className="mt-2 text-xs font-medium text-slate-600">
          Masuk: {formatDateTime(tx.orderDiterima)}
        </p>
        <p className="text-xs font-medium text-slate-600">
          Selesai: {formatDateTime(tx.estimasiSelesai)}
        </p>

        <div className="my-2 border-t-2 border-dashed border-slate-400" />

        <ul className="space-y-1 text-sm font-semibold">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-2">
              <span>
                {Number(it.qty)} {SATUAN_SINGKAT[it.tipeSatuan] ?? ""} ·{" "}
                {it.namaLayanan}
              </span>
              <span className="whitespace-nowrap">
                {formatRupiah(it.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-col items-center">
          <div
            className="h-28 w-28"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="text-xs font-medium text-slate-600">
            Scan untuk cek status
          </p>
        </div>
      </div>

      <div className="no-print mx-auto mt-4 flex w-64 flex-col items-center gap-4">
        <BluetoothPrint kind="label" data={labelData} />
        <div className="h-px w-40 bg-slate-200 dark:bg-slate-700" />
        <ThermalPrint auto={sp.print === "1"} label="🏷️ Cetak (Dialog Browser)" />
      </div>
    </main>
  );
}
