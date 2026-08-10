// HALAMAN PRATINJAU SEMENTARA — untuk screenshot. Akan dihapus.
import { AppShell } from "@/components/app-shell";
import { ServiceForm } from "../(app)/layanan/service-form";
import { formatRupiah, LABEL_SATUAN } from "@/lib/format";
import { IconTrash } from "@/components/icons";

const mock = [
  { id: "1", nama: "Cuci Setrika Reguler", tipe: "kiloan", harga: "7000", jam: 24, kat: "Reguler", express: true, aktif: true },
  { id: "2", nama: "Cuci Kering", tipe: "kiloan", harga: "5000", jam: 24, kat: "Reguler", express: false, aktif: true },
  { id: "3", nama: "Bed Cover", tipe: "satuan", harga: "25000", jam: 48, kat: "Satuan", express: false, aktif: false },
];

export default function Pratinjau() {
  return (
    <AppShell tenantName="Aka Express Laundry" userName="Putu Agnes Andika" role="owner">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Katalog Layanan</h1>
            <p className="text-sm text-slate-500">
              Daftar layanan laundry beserta tarifnya. Dipakai saat membuat transaksi.
            </p>
          </div>
          <ServiceForm defaultOpen />
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
            <div className="col-span-4">Nama</div>
            <div className="col-span-2">Satuan</div>
            <div className="col-span-2">Harga</div>
            <div className="col-span-2">Estimasi</div>
            <div className="col-span-2 text-right">Aksi</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {mock.map((s) => (
              <li key={s.id} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="sm:col-span-4">
                  <p className="font-semibold text-slate-900">{s.nama}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{s.kat}</span>
                    {s.express && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Express</span>}
                    {!s.aktif && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">Nonaktif</span>}
                  </div>
                </div>
                <div className="text-sm text-slate-600 sm:col-span-2">{LABEL_SATUAN[s.tipe]}</div>
                <div className="font-semibold text-slate-900 sm:col-span-2">{formatRupiah(s.harga)}</div>
                <div className="text-sm text-slate-600 sm:col-span-2">{s.jam} jam</div>
                <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                  <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {s.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </span>
                  <span className="rounded-lg border border-red-200 p-1.5 text-red-500">
                    <IconTrash className="h-4 w-4" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
