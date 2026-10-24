import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicTransaction } from "@/lib/transactions";
import { getBaseUrl, qrSvg, SYARAT_KETENTUAN_DEFAULT } from "@/lib/nota";
import {
  formatRupiah,
  formatDateTime,
  formatHp,
  LABEL_STATUS_BAYAR,
  SATUAN_SINGKAT,
} from "@/lib/format";
import { NotaView } from "@/components/nota/nota-view";
import { ThermalPrint, BluetoothPrint } from "@/components/nota/client";
import type { NotaPrintData } from "@/lib/escpos";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicTransaction(id);
  if (!data) return { title: "Nota — AkaLink" };

  const base = await getBaseUrl();
  const qrImg = `${base}/api/qr/${id}`;
  const judul = `Nota ${data.tx.noNota}`;
  const deskripsi = `${data.tenant?.nama ?? "AkaLink"} · Total ${formatRupiah(
    data.tx.grandTotal,
  )} · ${LABEL_STATUS_BAYAR[data.tx.statusPembayaran]}`;

  return {
    title: `${judul} — ${data.tenant?.nama ?? "AkaLink"}`,
    description: deskripsi,
    openGraph: {
      title: judul,
      description: deskripsi,
      images: [{ url: qrImg, width: 512, height: 512, alt: "QR Nota" }],
    },
    twitter: {
      card: "summary_large_image",
      title: judul,
      description: deskripsi,
      images: [qrImg],
    },
  };
}

export default async function PublicNotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getPublicTransaction(id);
  if (!data) notFound();

  const base = await getBaseUrl();
  const link = `${base}/n/${id}`;
  const qr = await qrSvg(link, 132);

  const { tenant, consumer, tx, items } = data;
  const sisa = tx.statusPembayaran === "lunas" ? 0 : Number(tx.grandTotal);
  const printData: NotaPrintData = {
    namaToko: tenant?.nama ?? "AkaLink",
    alamat: tenant?.alamat ?? undefined,
    kotaTelp:
      [tenant?.kota, tenant?.telepon].filter(Boolean).join(" · ") || undefined,
    tipe: tx.tipe,
    noNota: tx.noNota,
    pelanggan: consumer?.nama ?? "Umum",
    hp: consumer?.hp ? formatHp(consumer.hp) : undefined,
    terima: formatDateTime(tx.orderDiterima),
    selesai: formatDateTime(tx.estimasiSelesai),
    items: items.map((it) => ({
      nama: it.namaLayanan,
      qtyLabel: `${Number(it.qty)} ${SATUAN_SINGKAT[it.tipeSatuan] ?? ""}`.trim(),
      harga: formatRupiah(it.harga),
      subtotal: formatRupiah(it.subtotal),
      selesai: it.status === "selesai",
    })),
    subtotal: formatRupiah(tx.subtotal),
    express: Number(tx.biayaExpress) > 0 ? formatRupiah(tx.biayaExpress) : undefined,
    diskon: Number(tx.diskon) > 0 ? formatRupiah(tx.diskon) : undefined,
    grandTotal: formatRupiah(tx.grandTotal),
    sisa: formatRupiah(sisa),
    status: LABEL_STATUS_BAYAR[tx.statusPembayaran],
    link,
    sk: tenant?.syaratKetentuan ?? SYARAT_KETENTUAN_DEFAULT,
  };

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      <NotaView
        tenant={data.tenant}
        consumer={data.consumer}
        tx={data.tx}
        items={data.items}
        qr={qr}
        link={link}
        sk={data.tenant?.syaratKetentuan ?? SYARAT_KETENTUAN_DEFAULT}
      />
      <div className="no-print mx-auto mt-4 flex max-w-sm flex-col items-center gap-4">
        <BluetoothPrint data={printData} />
        <div className="h-px w-40 bg-slate-200 dark:bg-slate-700" />
        <ThermalPrint auto={sp.print === "1"} label="🖨️ Cetak (Dialog Browser)" />
      </div>
    </main>
  );
}
