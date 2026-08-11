// PRATINJAU SEMENTARA — untuk screenshot nota. Akan dihapus.
import { NotaView } from "@/components/nota/nota-view";
import { qrSvg, SYARAT_KETENTUAN_DEFAULT } from "@/lib/nota";

export const dynamic = "force-dynamic";

export default async function Pratinjau() {
  const qr = await qrSvg("https://akalink.app/n/demo", 132);
  const tenant = { nama: "Aka Express Laundry", kota: "Mambal, Badung" } as never;
  const consumer = { nama: "Pak Dewa Aji", hp: "6285726199189" } as never;
  const tx = {
    id: "demo",
    noNota: "AKA260811021055725",
    tipe: "reguler",
    orderDiterima: new Date("2026-08-10T17:54:00"),
    estimasiSelesai: new Date("2026-08-13T17:55:00"),
    statusPembayaran: "belum_dibayar",
    subtotal: "66000",
    diskon: "0",
    biayaExpress: "0",
    grandTotal: "66000",
  } as never;
  const items = [
    {
      id: "i1",
      namaLayanan: "Cuci Kering Setrika Min 2kg",
      tipeSatuan: "kiloan",
      qty: "11",
      harga: "6000",
      subtotal: "66000",
      status: "belum_dikerjakan",
    },
  ] as never;

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      <NotaView
        tenant={tenant}
        consumer={consumer}
        tx={tx}
        items={items}
        qr={qr}
        link="https://akalink.app/n/demo"
        sk={SYARAT_KETENTUAN_DEFAULT}
      />
    </main>
  );
}
