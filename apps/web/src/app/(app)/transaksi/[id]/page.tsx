import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getTransactionWithItems } from "@/lib/transactions";
import {
  setWorkStatus,
  setPaymentStatus,
  toggleItemStatus,
} from "@/lib/transactions-actions";
import {
  formatRupiah,
  formatDateTime,
  formatHp,
  SATUAN_SINGKAT,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";
import { PrintButton, WhatsappButton } from "./nota-actions";

export const metadata: Metadata = {
  title: "Detail Transaksi — AkaLink",
};

const WORK = ["belum_dikerjakan", "proses", "selesai", "diambil"] as const;
const PAY = ["belum_dibayar", "dp", "lunas"] as const;

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
  const { tenant } = await getTenantContext(user.id, tenantId);

  // Pesan WhatsApp
  const waLines = [
    `*${tenant?.nama ?? "AkaLink"}*`,
    `Nota: ${tx.noNota}`,
    consumer?.nama ? `Konsumen: ${consumer.nama}` : "",
    "————————",
    ...items.map(
      (it) =>
        `${it.namaLayanan} (${Number(it.qty)} ${SATUAN_SINGKAT[it.tipeSatuan] ?? ""}) ${formatRupiah(it.subtotal)}`,
    ),
    "————————",
    `Total: ${formatRupiah(tx.grandTotal)}`,
    `Pembayaran: ${LABEL_STATUS_BAYAR[tx.statusPembayaran]}`,
    tx.estimasiSelesai
      ? `Estimasi selesai: ${formatDateTime(tx.estimasiSelesai)}`
      : "",
    "Terima kasih 🙏",
  ].filter(Boolean);
  const waMessage = waLines.join("\n");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/transaksi"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← Transaksi
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Detail Transaksi
          </h1>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <WhatsappButton hp={consumer?.hp} message={waMessage} />
        </div>
      </header>

      {/* Kartu nota (yang dicetak) */}
      <div className="printable rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="text-sm font-bold text-brand-700">
              {tenant?.nama ?? "AkaLink"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
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
          <ul className="flex flex-col gap-2.5">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {it.namaLayanan}{" "}
                    <span className="text-slate-400">
                      ({Number(it.qty)} {SATUAN_SINGKAT[it.tipeSatuan] ?? ""} ×{" "}
                      {formatRupiah(it.harga)})
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatRupiah(it.subtotal)}
                  </span>
                  <form action={toggleItemStatus} className="no-print">
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="txId" value={tx.id} />
                    <input type="hidden" name="current" value={it.status} />
                    <button
                      type="submit"
                      className={
                        it.status === "selesai"
                          ? "rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400"
                      }
                    >
                      {it.status === "selesai" ? "✓ Selesai" : "Tandai selesai"}
                    </button>
                  </form>
                </div>
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

      {/* Kontrol status (tidak ikut tercetak) */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <StatusGroup
          title="Status Pengerjaan"
          options={WORK}
          labels={LABEL_STATUS_KERJA}
          current={tx.statusPekerjaan}
          action={setWorkStatus}
          txId={tx.id}
        />
        <div className="mt-5">
          <StatusGroup
            title="Status Pembayaran"
            options={PAY}
            labels={LABEL_STATUS_BAYAR}
            current={tx.statusPembayaran}
            action={setPaymentStatus}
            txId={tx.id}
          />
        </div>
      </section>
    </div>
  );
}

function StatusGroup({
  title,
  options,
  labels,
  current,
  action,
  txId,
}: {
  title: string;
  options: readonly string[];
  labels: Record<string, string>;
  current: string;
  action: (formData: FormData) => void;
  txId: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <form action={action} key={s}>
            <input type="hidden" name="id" value={txId} />
            <input type="hidden" name="status" value={s} />
            <button
              type="submit"
              className={
                current === s
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }
            >
              {labels[s]}
            </button>
          </form>
        ))}
      </div>
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
