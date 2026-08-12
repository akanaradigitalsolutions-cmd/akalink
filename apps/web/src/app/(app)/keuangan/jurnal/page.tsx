import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getJurnal } from "@/lib/journal";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { KeuanganTabs } from "../tabs";

export const metadata: Metadata = {
  title: "Jurnal — AkaLink",
};

function rp(v: string) {
  return Number(v) === 0 ? "" : formatRupiah(v);
}

export default async function JurnalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const entries = tenantId ? await getJurnal(tenantId) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Keuangan — Jurnal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Jurnal umum (double-entry). Dibuat otomatis dari transaksi &
            pembayaran.
          </p>
        </div>
        {entries.length > 0 && (
          <a
            href="/api/jurnal-csv"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ⬇ Ekspor CSV
          </a>
        )}
      </div>

      <KeuanganTabs />

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Belum ada jurnal. Buat transaksi atau tandai transaksi Lunas untuk
          melihat jurnal muncul di sini.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((e) => {
            const totalD = e.lines.reduce((s, l) => s + Number(l.debit), 0);
            const totalK = e.lines.reduce((s, l) => s + Number(l.kredit), 0);
            return (
              <div
                key={e.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {e.keterangan}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(e.tanggal)}
                    </p>
                  </div>
                  {e.refType && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {e.refType}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <div className="col-span-6">Akun</div>
                  <div className="col-span-3 text-right">Debit</div>
                  <div className="col-span-3 text-right">Kredit</div>
                </div>
                <ul>
                  {e.lines.map((l, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-12 gap-2 px-5 py-1.5 text-sm"
                    >
                      <div className="col-span-6 text-slate-700 dark:text-slate-200">
                        <span className="font-mono text-xs text-slate-400">
                          {l.kode}
                        </span>{" "}
                        {l.nama}
                      </div>
                      <div className="col-span-3 text-right text-slate-800 dark:text-slate-100">
                        {rp(l.debit)}
                      </div>
                      <div className="col-span-3 text-right text-slate-800 dark:text-slate-100">
                        {rp(l.kredit)}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-12 gap-2 border-t border-slate-100 px-5 py-2 text-sm font-semibold dark:border-slate-800">
                  <div className="col-span-6 text-slate-500">Total</div>
                  <div className="col-span-3 text-right text-slate-900 dark:text-white">
                    {formatRupiah(totalD)}
                  </div>
                  <div className="col-span-3 text-right text-slate-900 dark:text-white">
                    {formatRupiah(totalK)}
                  </div>
                </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
