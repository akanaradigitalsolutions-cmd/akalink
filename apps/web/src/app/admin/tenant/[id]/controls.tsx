"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  adjustTenantCoin,
  setTenantStatus,
  setTenantTier,
  setTenantBiaya,
} from "@/lib/platform-actions";

type Tenant = {
  id: string;
  nama: string;
  kota: string | null;
  telepon: string | null;
  status: string;
  tier: string;
  saldoKoin: number;
  biayaPerNota: number;
  biayaPerWa: number;
  createdAt: string;
};
type Ledger = {
  id: string;
  tipe: string;
  delta: number;
  saldoSesudah: number;
  keterangan: string | null;
  createdAt: string;
};

export function AdminTenantControls({
  tenant,
  koinTerpakai,
  txCount,
  ledger,
}: {
  tenant: Tenant;
  koinTerpakai: number;
  txCount: number;
  ledger: Ledger[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [tipe, setTipe] = useState<"bonus" | "penyesuaian">("bonus");
  const [ket, setKet] = useState("");
  const [nota, setNota] = useState(String(tenant.biayaPerNota));
  const [wa, setWa] = useState(String(tenant.biayaPerWa));
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(undefined);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else setMsg({ text: res.error ?? "Gagal." });
    });
  }

  const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-600">← Admin</Link>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tenant.nama}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Saldo Koin" value={formatRupiah(tenant.saldoKoin)} tone={tenant.saldoKoin <= 0 ? "neg" : undefined} />
        <Stat label="Koin Terpakai" value={formatRupiah(koinTerpakai)} />
        <Stat label="Transaksi" value={txCount.toLocaleString("id-ID")} />
        <Stat label="Terdaftar" value={formatDateTime(tenant.createdAt).split(",")[0]} />
      </div>

      {/* Status & tier */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Status & Paket</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-500">
            Status
            <select
              defaultValue={tenant.status}
              onChange={(e) => run(() => setTenantStatus({ tenantId: tenant.id, status: e.target.value }), "Status diperbarui ✓")}
              className={`${input} ml-2`}
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Paket
            <select
              defaultValue={tenant.tier}
              onChange={(e) => run(() => setTenantTier({ tenantId: tenant.id, tier: e.target.value }), "Paket diperbarui ✓")}
              className={`${input} ml-2`}
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="power">Power</option>
            </select>
          </label>
        </div>
      </div>

      {/* Tarif */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Tarif Pemakaian (Rp)</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Per Nota
            <input value={nota} onChange={(e) => setNota(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1 block w-28`} />
          </label>
          <label className="text-xs text-slate-500">
            Per WhatsApp
            <input value={wa} onChange={(e) => setWa(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1 block w-28`} />
          </label>
          <button
            onClick={() => run(() => setTenantBiaya({ tenantId: tenant.id, biayaPerNota: Number(nota) || 0, biayaPerWa: Number(wa) || 0 }), "Tarif disimpan ✓")}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Simpan
          </button>
        </div>
      </div>

      {/* Sesuaikan saldo koin */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Sesuaikan Saldo Koin</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Nilai positif menambah, negatif mengurangi. Tercatat di ledger koin tenant.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            Nominal (Rp)
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9-]/g, ""))} placeholder="mis. 50000 / -20000" className={`${input} mt-1 block w-36`} />
          </label>
          <select value={tipe} onChange={(e) => setTipe(e.target.value as "bonus" | "penyesuaian")} className={input}>
            <option value="bonus">Bonus</option>
            <option value="penyesuaian">Penyesuaian</option>
          </select>
          <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Keterangan (opsional)" className={`${input} flex-1`} />
          <button
            onClick={() => run(() => adjustTenantCoin({ tenantId: tenant.id, amount: Number(amount) || 0, tipe, keterangan: ket }), "Saldo disesuaikan ✓")}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Terapkan
          </button>
        </div>
        {msg && (
          <p className={`mt-2 text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}
      </div>

      {/* Ledger koin */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Mutasi Saldo Koin</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada mutasi.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">{l.keterangan ?? l.tipe}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(l.createdAt)} · {l.tipe}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${l.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {l.delta >= 0 ? "+" : "−"}{formatRupiah(Math.abs(l.delta))}
                  </p>
                  <p className="text-xs text-slate-400">saldo {formatRupiah(l.saldoSesudah)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "neg" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone === "neg" ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}
