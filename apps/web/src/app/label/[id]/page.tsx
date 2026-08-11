import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { getTransactionWithItems } from "@/lib/transactions";
import { getBaseUrl, qrSvg } from "@/lib/nota";
import { AutoPrint, PrintButton } from "@/components/nota/client";
import { formatDateTime, SATUAN_SINGKAT } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Label — AkaLink",
};

export default async function LabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const data = await getTransactionWithItems(tenantId, id);
  if (!data) notFound();
  const { tenant } = await getTenantContext(user.id, tenantId);
  const { tx, consumer, items } = data;

  const base = await getBaseUrl();
  const qr = await qrSvg(`${base}/n/${id}`, 96);
  const totalUnit = items.reduce((n, it) => n + Number(it.qty), 0);

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-6">
      {/* Label ~58mm */}
      <div className="printable mx-auto w-64 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800">
        <p className="text-center text-sm font-bold text-slate-900">
          {tenant?.nama ?? "AkaLink"}
        </p>
        <p className="text-center font-semibold">{tx.noNota}</p>
        <div className="my-1.5 border-t border-dashed border-slate-300" />
        <div className="flex justify-between">
          <span className="font-medium">{consumer?.nama ?? "Umum"}</span>
          <span className="text-slate-500">{totalUnit} unit</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Masuk: {formatDateTime(tx.orderDiterima)}
        </p>
        <p className="text-[11px] text-slate-500">
          Selesai: {formatDateTime(tx.estimasiSelesai)}
        </p>
        <div className="my-1.5 border-t border-dashed border-slate-300" />
        <ul className="space-y-0.5">
          {items.map((it) => (
            <li key={it.id}>
              {Number(it.qty)} {SATUAN_SINGKAT[it.tipeSatuan] ?? ""} ·{" "}
              {it.namaLayanan}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-col items-center">
          <div
            className="h-24 w-24"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="text-[10px] text-slate-500">Scan cek status</p>
        </div>
      </div>

      <div className="no-print mx-auto mt-4 flex w-64 justify-center">
        <PrintButton label="🖨️ Cetak Label" />
      </div>
      {sp.print === "1" && <AutoPrint />}
    </main>
  );
}
