import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { searchTransactions } from "@/lib/transactions";
import { getAllowedOutlets, getActiveOutlet } from "@/lib/outlets";
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
// Titik status pekerjaan (indikator cepat di sisi kiri baris).
const kerjaDot: Record<string, string> = {
  belum_dikerjakan: "bg-slate-300 dark:bg-slate-600",
  proses: "bg-blue-500",
  selesai: "bg-green-500",
  diambil: "bg-slate-400",
};

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kerja?: string;
    bayar?: string;
    outlet?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const sp = await searchParams;
  const q = sp.q ?? "";
  const kerja = sp.kerja ?? "";
  const bayar = sp.bayar ?? "";
  const adaFilter = !!(q || kerja || bayar);
  const isOwner = getRoleFromUser(user) === "owner";

  // Ikuti outlet aktif dari header (konsisten dgn Layanan/Inventori/Mesin).
  // Kasir tetap dibatasi ke outlet yang ditugaskan sebagai pengaman.
  const [allowedOutlets, activeOutlet] = tenantId
    ? await Promise.all([getAllowedOutlets(tenantId), getActiveOutlet(tenantId)])
    : [[], null];
  const outletScope = isOwner ? undefined : allowedOutlets.map((o) => o.id);

  const list = tenantId
    ? await searchTransactions(tenantId, {
        q,
        kerja,
        bayar,
        outlet: activeOutlet?.id,
        outletScope,
      })
    : [];

  const totalNilai = list.reduce((s, t) => s + Number(t.grandTotal), 0);
  const belumBayar = list.filter((t) => t.statusPembayaran !== "lunas").length;

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
            {activeOutlet && (
              <span className="ml-1 text-slate-400">· 🏪 {activeOutlet.nama}</span>
            )}
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

      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {list.length} transaksi
          </span>
          {belumBayar > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {belumBayar} belum dibayar
            </span>
          )}
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            Total {formatRupiah(totalNilai)}
          </span>
        </div>
      )}

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
                  className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100 sm:px-5 dark:hover:bg-slate-800/50 dark:active:bg-slate-800"
                >
                  {/* Indikator status pekerjaan */}
                  <span
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${kerjaDot[t.statusPekerjaan] ?? "bg-slate-300"}`}
                    aria-hidden
                  />

                  {/* Nota + konsumen */}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      <span className="truncate">{t.noNota}</span>
                      {t.isExpress && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Express
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                      {t.consumerNama ?? "Umum"} · {formatDateTime(t.orderDiterima)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                    </div>
                  </div>

                  {/* Nilai + chevron */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(t.grandTotal)}
                    </span>
                    <svg
                      className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400 dark:text-slate-600"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M7.5 5l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
