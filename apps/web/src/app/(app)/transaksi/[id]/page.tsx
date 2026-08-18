import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getTransactionWithItems } from "@/lib/transactions";
import { toggleItemStatus } from "@/lib/transactions-actions";
import {
  formatRupiah,
  formatDateTime,
  formatHp,
  SATUAN_SINGKAT,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";
import { WhatsappButton } from "@/components/nota/client";
import {
  getBaseUrl,
  buildWaNota,
  buildWaSiapAmbil,
  SYARAT_KETENTUAN_DEFAULT,
} from "@/lib/nota";
import { getPaymentFeeConfig, getLatestPaymentOrder, hitungFee } from "@/lib/payments";
import { StatusEditor } from "./status-editor";
import { DeleteNota } from "./delete-nota";
import { DigitalPayment } from "./digital-payment";

export const metadata: Metadata = {
  title: "Detail Transaksi — AkaLink",
};

export default async function DetailTransaksiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doku?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const [data, ctx, feeCfg] = await Promise.all([
    getTransactionWithItems(tenantId, id),
    getTenantContext(user.id, tenantId),
    getPaymentFeeConfig(tenantId),
  ]);
  if (!data) notFound();
  const { tx, consumer, items } = data;
  const { tenant } = ctx;

  // Pembayaran digital (bila diaktifkan & belum lunas).
  const showDigital = feeCfg.aktif && tx.statusPembayaran !== "lunas";
  const grossTx = Math.round(Number(tx.grandTotal));
  const feeParts = hitungFee(grossTx);
  const lastOrder = showDigital
    ? await getLatestPaymentOrder(tenantId, tx.id)
    : null;
  const existingUrl =
    lastOrder && lastOrder.status === "pending" ? lastOrder.paymentUrl : null;
  const base = await getBaseUrl();
  const notaLink = `${base}/n/${tx.id}`;

  // Pesan WhatsApp — nota lengkap (mirip nota cetak)
  const waMessage = buildWaNota({
    tenantNama: tenant?.nama ?? "AkaLink",
    tenantKota: tenant?.kota,
    tenantAlamat: tenant?.alamat,
    tenantTelepon: tenant?.telepon,
    tipe: tx.tipe,
    noNota: tx.noNota,
    konsumen: consumer?.nama,
    terima: tx.orderDiterima,
    selesai: tx.estimasiSelesai,
    items,
    subtotal: tx.subtotal,
    biayaExpress: tx.biayaExpress,
    diskon: tx.diskon,
    grandTotal: tx.grandTotal,
    statusPembayaran: tx.statusPembayaran,
    link: notaLink,
    sk: tenant?.syaratKetentuan ?? SYARAT_KETENTUAN_DEFAULT,
  });

  // Pesan WhatsApp singkat "siap diambil" (muncul saat pekerjaan selesai)
  const waSiapAmbil = buildWaSiapAmbil({
    tenantNama: tenant?.nama ?? "AkaLink",
    konsumen: consumer?.nama,
    noNota: tx.noNota,
    grandTotal: tx.grandTotal,
    statusPembayaran: tx.statusPembayaran,
    link: notaLink,
  });

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
        <div className="flex flex-wrap gap-2">
          {getRoleFromUser(user) === "owner" &&
            tx.statusPembayaran !== "lunas" && (
              <Link
                href={`/transaksi/${tx.id}/edit`}
                className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                ✏️ Edit
              </Link>
            )}
          <PrintLink href={`/n/${tx.id}?print=1`} label="🖨️ Cetak Nota" />
          <PrintLink href={`/label/${tx.id}?print=1`} label="🏷️ Cetak Label" />
          <PrintLink href={`/n/${tx.id}`} label="🔗 Lihat Nota" />
          {tx.statusPekerjaan === "selesai" && (
            <WhatsappButton
              hp={consumer?.hp}
              message={waSiapAmbil}
              label="📦 Kabari Siap Diambil"
              variant="outline"
            />
          )}
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

      {/* Pembayaran digital (QRIS/DOKU) — bila diaktifkan & belum lunas */}
      {showDigital && grossTx > 0 && (
        <DigitalPayment
          txId={tx.id}
          gross={grossTx}
          feeAdmin={feeParts.feeAdmin}
          net={feeParts.net}
          persen={feeCfg.persen}
          existingUrl={existingUrl}
          kembaliDariDoku={sp.doku === "selesai"}
        />
      )}

      {/* Kontrol status dengan tombol Simpan (tidak ikut tercetak) */}
      <StatusEditor
        txId={tx.id}
        work={tx.statusPekerjaan}
        pay={tx.statusPembayaran}
      />

      {/* Hapus nota — hanya untuk pemilik (Owner) */}
      {getRoleFromUser(user) === "owner" && (
        <DeleteNota txId={tx.id} noNota={tx.noNota} />
      )}
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

function PrintLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </a>
  );
}
