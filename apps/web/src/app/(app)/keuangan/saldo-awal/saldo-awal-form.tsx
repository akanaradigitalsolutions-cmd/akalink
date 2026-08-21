"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import { setOpeningBalance } from "@/lib/opening-balance-actions";

type Initial = {
  kasPerusahaan: number;
  kasLaundry: number;
  bank: number;
  tanggal: string;
  sudahDiatur: boolean;
};

export function SaldoAwalForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kasP, setKasP] = useState(String(initial.kasPerusahaan || ""));
  const [kasL, setKasL] = useState(String(initial.kasLaundry || ""));
  const [bank, setBank] = useState(String(initial.bank || ""));
  const [tanggal, setTanggal] = useState(initial.tanggal);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const total = (Number(kasP) || 0) + (Number(kasL) || 0) + (Number(bank) || 0);

  function simpan() {
    setMsg(undefined);
    start(async () => {
      const res = await setOpeningBalance({
        kasPerusahaan: Number(kasP) || 0,
        kasLaundry: Number(kasL) || 0,
        bank: Number(bank) || 0,
        tanggal: tanggal || undefined,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Saldo awal tersimpan ✓" });
        router.refresh();
      } else setMsg({ text: res.error });
    });
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <div className="flex flex-col gap-5">
      {initial.sudahDiatur && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          Saldo awal sudah pernah diatur. Mengubah di sini akan{" "}
          <b>mengganti</b> entri saldo awal sebelumnya.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <Row
            label="Kas Perusahaan"
            sub="Kas Besar (1.1.01) — uang tunai perusahaan"
            value={kasP}
            onChange={setKasP}
            cls={input}
          />
          <Row
            label="Kas Laundry (saat buka)"
            sub="Kas Outlet (1.1.02) — uang tunai di laundry"
            value={kasL}
            onChange={setKasL}
            cls={input}
          />
          <Row
            label="Saldo Bank"
            sub="Bank (1.1.04) — saldo rekening"
            value={bank}
            onChange={setBank}
            cls={input}
          />

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Total Modal Awal
            </span>
            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
              {formatRupiah(total)}
            </span>
          </div>

          <label className="text-xs text-slate-500">
            Tanggal saldo awal
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={simpan}
              disabled={pending}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Simpan Saldo Awal"}
            </button>
            {msg && (
              <span className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Tersimpan sebagai jurnal: Dr Kas/Bank … / Cr Modal Pemilik. Cek hasilnya
        di tab <b>Neraca</b>.
      </p>
    </div>
  );
}

function Row({
  label,
  sub,
  value,
  onChange,
  cls,
}: {
  label: string;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  cls: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Rp</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="0"
          className={`${cls} w-40`}
        />
      </div>
    </div>
  );
}
