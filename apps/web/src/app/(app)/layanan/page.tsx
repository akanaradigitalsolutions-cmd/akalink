import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getServices } from "@/lib/services";
import { deleteService, toggleService } from "@/lib/services-actions";
import { formatRupiah, formatEstimasi, LABEL_SATUAN } from "@/lib/format";
import { ServiceForm } from "./service-form";
import { IconTag, IconTrash } from "@/components/icons";

export const metadata: Metadata = {
  title: "Layanan — AkaLink",
};

export default async function LayananPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const list = tenantId ? await getServices(tenantId) : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Katalog Layanan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Daftar layanan laundry beserta tarifnya. Dipakai saat membuat
            transaksi.
          </p>
        </div>
        <ServiceForm />
      </header>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <IconTag className="h-6 w-6" />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            Belum ada layanan
          </p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Klik <strong>Tambah Layanan</strong> untuk membuat layanan pertama
            Anda (mis. Cuci Setrika Kiloan).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {/* Header tabel (desktop) */}
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 sm:grid">
            <div className="col-span-4">Nama</div>
            <div className="col-span-2">Satuan</div>
            <div className="col-span-2">Harga</div>
            <div className="col-span-2">Estimasi</div>
            <div className="col-span-2 text-right">Aksi</div>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-12 sm:items-center sm:gap-4"
              >
                <div className="sm:col-span-4">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {s.nama}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.kategori && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {s.kategori}
                      </span>
                    )}
                    {s.expressTersedia && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Express
                      </span>
                    )}
                    {!s.aktif && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        Nonaktif
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">
                  {LABEL_SATUAN[s.tipeSatuan] ?? s.tipeSatuan}
                </div>
                <div className="font-semibold text-slate-900 dark:text-white sm:col-span-2">
                  {formatRupiah(s.harga)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">
                  {formatEstimasi(s.estimasiNilai, s.estimasiSatuan)}
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {s.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                  <form action={deleteService}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      aria-label="Hapus"
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
