import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicTransaction } from "@/lib/transactions";
import { getBaseUrl, qrSvg, SYARAT_KETENTUAN_DEFAULT } from "@/lib/nota";
import { NotaView } from "@/components/nota/nota-view";
import { AutoPrint, PrintButton } from "@/components/nota/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nota — AkaLink",
};

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
        sk={SYARAT_KETENTUAN_DEFAULT}
      />
      <div className="no-print mx-auto mt-4 flex max-w-sm justify-center">
        <PrintButton label="🖨️ Cetak Nota" />
      </div>
      {sp.print === "1" && <AutoPrint />}
    </main>
  );
}
