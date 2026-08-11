// PRATINJAU SEMENTARA — untuk screenshot. Akan dihapus.
import { AppShell } from "@/components/app-shell";
import { BuatTransaksi } from "../(app)/transaksi/baru/buat-transaksi";

const services = [
  { id: "1", nama: "Cuci Setrika Reguler", tipeSatuan: "kiloan", harga: "7000", kategori: "Reguler" },
  { id: "2", nama: "Cuci Kering", tipeSatuan: "kiloan", harga: "5000", kategori: "Reguler" },
  { id: "3", nama: "Bed Cover", tipeSatuan: "satuan", harga: "25000", kategori: "Satuan" },
  { id: "4", nama: "Cuci Express", tipeSatuan: "kiloan", harga: "12000", kategori: "Express" },
];
const consumers = [
  { id: "c1", nama: "Andi", hp: "6285737606345" },
  { id: "c2", nama: "Budi Santoso", hp: "628123456789" },
];

export default function Pratinjau() {
  return (
    <AppShell tenantName="Aka Express Laundry" userName="Putu Agnes Andika" role="owner">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="text-sm text-slate-400">← Transaksi</span>
          <h1 className="text-xl font-bold text-slate-900">Transaksi Baru</h1>
        </header>
        <BuatTransaksi services={services} consumers={consumers} />
      </div>
    </AppShell>
  );
}
