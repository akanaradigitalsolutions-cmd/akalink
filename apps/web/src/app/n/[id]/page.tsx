import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicTransaction } from "@/lib/transactions";
import { getBaseUrl, qrSvg, SYARAT_KETENTUAN_DEFAULT } from "@/lib/nota";
import { formatRupiah, LABEL_STATUS_BAYAR } from "@/lib/format";
import { NotaView } from "@/components/nota/nota-view";
import { AutoPrint, PrintButton } from "@/components/nota/client";

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
      <div className="no-print mx-auto mt-4 flex max-w-sm justify-center">
        <PrintButton label="🖨️ Cetak Nota" />
      </div>
      {sp.print === "1" && <AutoPrint />}
    </main>
  );
}
