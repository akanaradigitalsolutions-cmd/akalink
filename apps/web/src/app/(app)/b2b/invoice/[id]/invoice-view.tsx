"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { markInvoicePaid, cancelInvoice } from "@/lib/b2b-actions";

type Item = { id: string; noNota: string; tanggal: string; konsumen: string | null; grandTotal: number };

export function InvoiceView({
  tenant,
  client,
  invoice,
  items,
}: {
  tenant: { nama: string; alamat: string | null; telepon: string | null; kota: string | null };
  client: { perusahaan: string; pic: string | null; alamat: string | null; npwp: string | null };
  invoice: {
    id: string;
    nomor: string;
    status: string;
    total: number;
    tanggalTerbit: string;
    jatuhTempo: string | null;
    periodeAwal: string | null;
    periodeAkhir: string | null;
  };
  items: Item[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [akun, setAkun] = useState<"1.1.02" | "1.1.04">("1.1.04");
  const [msg, setMsg] = useState<string>();

  const lunas = invoice.status === "lunas";
  const batal = invoice.status === "batal";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/b2b" className="text-sm text-slate-400 hover:text-slate-600">
          ← B2B
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            🖨️ Cetak
          </button>
        </div>
      </header>

      <div className="printable rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="text-lg font-bold text-brand-700">{tenant.nama}</p>
            <p className="text-xs text-slate-400">{tenant.alamat ?? ""}</p>
            <p className="text-xs text-slate-400">
              {[tenant.kota, tenant.telepon].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900 dark:text-white">INVOICE</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{invoice.nomor}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                lunas
                  ? "bg-green-100 text-green-700"
                  : batal
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-dashed border-slate-200 py-4 text-sm dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-400">Ditagihkan kepada</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{client.perusahaan}</p>
            {client.pic && <p className="text-xs text-slate-500">{client.pic}</p>}
            {client.alamat && <p className="text-xs text-slate-500">{client.alamat}</p>}
            {client.npwp && <p className="text-xs text-slate-500">NPWP: {client.npwp}</p>}
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Terbit: {formatDateTime(invoice.tanggalTerbit)}</p>
            {invoice.jatuhTempo && <p>Jatuh tempo: {invoice.jatuhTempo}</p>}
            {(invoice.periodeAwal || invoice.periodeAkhir) && (
              <p>Periode: {invoice.periodeAwal ?? "…"} — {invoice.periodeAkhir ?? "…"}</p>
            )}
          </div>
        </div>

        <table className="my-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-700">
              <th className="py-1.5">No. Nota</th>
              <th className="py-1.5">Konsumen</th>
              <th className="py-1.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 text-slate-700 dark:text-slate-200">{it.noNota}</td>
                <td className="py-1.5 text-slate-500">{it.konsumen ?? "—"}</td>
                <td className="py-1.5 text-right font-medium text-slate-800 dark:text-slate-100">
                  {formatRupiah(it.grandTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
          <span className="font-semibold text-slate-900 dark:text-white">TOTAL</span>
          <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
            {formatRupiah(invoice.total)}
          </span>
        </div>
      </div>

      {!lunas && !batal && (
        <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            Catat Pembayaran
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={akun}
              onChange={(e) => setAkun(e.target.value as "1.1.02" | "1.1.04")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="1.1.04">Masuk ke Bank</option>
              <option value="1.1.02">Masuk ke Kas Outlet</option>
            </select>
            <button
              onClick={() =>
                start(async () => {
                  const res = await markInvoicePaid({ id: invoice.id, akun });
                  if (res.ok) router.refresh();
                  else setMsg(res.error);
                })
              }
              disabled={pending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {pending ? "Memproses…" : "Tandai Lunas"}
            </button>
            <button
              onClick={() =>
                start(async () => {
                  const res = await cancelInvoice(invoice.id);
                  if (res.ok) router.refresh();
                  else setMsg(res.error);
                })
              }
              disabled={pending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Batalkan
            </button>
          </div>
          {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
          <p className="mt-2 text-xs text-slate-400">
            Menandai lunas akan melunasi semua nota di invoice ini &amp; mencatat
            jurnal pelunasan piutang.
          </p>
        </div>
      )}
    </div>
  );
}
