import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getCoa, seedDefaultCoaIfEmpty } from "@/lib/coa";
import { getPengeluaran } from "@/lib/journal";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { PengeluaranForm } from "./pengeluaran-form";

export const metadata: Metadata = { title: "Pengeluaran — AkaLink" };

export default async function PengeluaranPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  await seedDefaultCoaIfEmpty(tenantId);
  const akun = await getCoa(tenantId);

  const kas = akun
    .filter((a) => a.isKas && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));
  const beban = akun
    .filter((a) => a.tipe === "beban" && a.kode !== "5" && a.aktif)
    .map((a) => ({ kode: a.kode, nama: a.nama }));

  const terbaru = await getPengeluaran(tenantId, 30);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Pengeluaran / Biaya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catat setiap pembelian atau biaya operasional — mis. deterjen,
          plastik, token listrik. Setiap entri otomatis masuk pembukuan.
        </p>
      </div>

      <PengeluaranForm kas={kas} beban={beban} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Pengeluaran Terbaru
        </h2>
        {terbaru.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Belum ada pengeluaran. Catat pengeluaran pertama di atas.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {terbaru.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {p.keterangan}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {p.kategori} · {p.kas} · {formatDateTime(p.tanggal)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatRupiah(p.jumlah)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
