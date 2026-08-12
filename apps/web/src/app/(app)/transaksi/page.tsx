import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { searchTransactions } from "@/lib/transactions";
import { TransaksiFilters } from "./transaksi-filters";
import {
  formatRupiah,
  formatDateTime,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";
import { IconReceipt, IconPlus } from "@/components/icons";

export const metadata: Metadata = {
  title: "Transaksi — AkaLink",
};

const kerjaColor: Record<string, string> = {
  belum_dikerjakan: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  proses: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  selesai: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  diambil: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};
const bayarColor: Record<string, string> = {
  belum_dibayar: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  dp: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  lunas: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kerja?: string; bayar?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const sp = await searchParams;
  const q = sp.q ?? "";
  const kerja = sp.kerja ?? "";
  const bayar = sp.bayar ?? "";
  const adaFilter = !!(q || kerja || bayar);
  const list = tenantId
    ? await searchTransactions(tenantId, { q, kerja, bayar })
    : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Transaksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {adaFilter
              ? `${list.length} hasil ditemukan`
              : "Daftar transaksi terbaru."}
          </p>
        </div>
        <Link
          href="/transaksi/baru"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Transaksi Baru
        </Link>
      </header>

      <TransaksiFilters q={q} kerja={kerja} bayar={bayar} />

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <IconReceipt className="h-6 w-6" />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {adaFilter ? "Tidak ada transaksi cocok" : "Belum ada transaksi"}
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {adaFilter
              ? "Coba ubah kata kunci atau reset filter."
              : "Klik Transaksi Baru untuk membuat order pertama."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transaksi/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      {t.noNota}
                      {t.isExpress && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Express
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t.consumerNama ?? "Umum"} · {formatDateTime(t.orderDiterima)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kerjaColor[t.statusPekerjaan]}`}
                    >
                      {LABEL_STATUS_KERJA[t.statusPekerjaan]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bayarColor[t.statusPembayaran]}`}
                    >
                      {LABEL_STATUS_BAYAR[t.statusPembayaran]}
                    </span>
                    <span className="w-24 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(t.grandTotal)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
