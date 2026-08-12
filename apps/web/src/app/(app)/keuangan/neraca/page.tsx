import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getLedger, netByTipe } from "@/lib/reports";
import { formatRupiah } from "@/lib/format";
import { KeuanganTabs } from "../tabs";

export const metadata: Metadata = { title: "Neraca — AkaLink" };

export default async function NeracaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const rows = tenantId ? await getLedger(tenantId) : [];

  const aset = netByTipe(rows, "aset");
  const kewajiban = netByTipe(rows, "kewajiban");
  const modal = netByTipe(rows, "modal");
  const pendapatan = netByTipe(rows, "pendapatan");
  const beban = netByTipe(rows, "beban");
  const labaBerjalan = pendapatan.total - beban.total;

  const totalEkuitas = modal.total + labaBerjalan;
  const totalPasiva = kewajiban.total + totalEkuitas;
  const balanced = Math.round((aset.total - totalPasiva) * 100) === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Keuangan — Neraca
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aset = Kewajiban + Modal (termasuk laba berjalan).
        </p>
      </div>
      <KeuanganTabs />

      <div
        className={`rounded-xl px-4 py-2 text-center text-sm font-medium ${
          balanced
            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        }`}
      >
        {balanced
          ? "✓ Neraca seimbang"
          : "⚠ Neraca tidak seimbang — periksa jurnal"}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Aset" items={aset.items} total={aset.total} accent="blue" />
        <div className="flex flex-col gap-4">
          <Section
            title="Kewajiban"
            items={kewajiban.items}
            total={kewajiban.total}
            accent="amber"
          />
          <Section
            title="Modal"
            items={[
              ...modal.items,
              { kode: "—", nama: "Laba Berjalan", nilai: labaBerjalan },
            ]}
            total={totalEkuitas}
            accent="purple"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Total label="Total Aset" value={aset.total} />
        <Total label="Total Kewajiban + Modal" value={totalPasiva} />
      </div>
    </div>
  );
}

const accentClass: Record<string, string> = {
  blue: "text-blue-600",
  amber: "text-amber-600",
  purple: "text-purple-600",
};

function Section({
  title,
  items,
  total,
  accent,
}: {
  title: string;
  items: { kode: string; nama: string; nilai: number }[];
  total: number;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`border-b border-slate-100 px-5 py-3 text-sm font-bold uppercase tracking-wide dark:border-slate-800 ${accentClass[accent]}`}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-400">Belum ada.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((it, i) => (
            <li
              key={`${it.kode}-${i}`}
              className="flex justify-between px-5 py-2.5 text-sm"
            >
              <span className="text-slate-700 dark:text-slate-200">
                {it.kode !== "—" && (
                  <span className="font-mono text-xs text-slate-400">
                    {it.kode}
                  </span>
                )}{" "}
                {it.nama}
              </span>
              <span className="text-slate-800 dark:text-slate-100">
                {formatRupiah(it.nilai)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-slate-200 px-5 py-3 text-sm font-bold dark:border-slate-700">
        <span>Total {title}</span>
        <span>{formatRupiah(total)}</span>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
        {formatRupiah(value)}
      </p>
    </div>
  );
}
