"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { setGaji, giveAdvance, settleAdvance } from "@/lib/salary-actions";
import type { StaffSalaryRow, AdvanceRow } from "@/lib/salary";

type Advance = AdvanceRow & { employeeId: string };

export function GajiManager({
  staff,
  advances,
  totalGaji,
  totalKasbon,
}: {
  staff: StaffSalaryRow[];
  advances: Advance[];
  totalGaji: number;
  totalKasbon: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Gaji / Bulan</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(totalGaji)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kasbon Belum Dipotong</p>
          <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{formatRupiah(totalKasbon)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {staff.map((s) => (
          <StaffCard
            key={s.id}
            s={s}
            advances={advances.filter((a) => a.employeeId === s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StaffCard({ s, advances }: { s: StaffSalaryRow; advances: Advance[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gaji, setGajiVal] = useState(String(s.gaji || ""));
  const [open, setOpen] = useState(false);
  const [kasbon, setKasbon] = useState("");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  function simpanGaji() {
    start(async () => {
      await setGaji({ employeeId: s.id, gaji: Number(gaji) || 0 });
      router.refresh();
    });
  }
  function beriKasbon() {
    setMsg(undefined);
    const n = Number(kasbon) || 0;
    if (n <= 0) return setMsg("Nominal kasbon tidak valid.");
    start(async () => {
      const res = await giveAdvance({ employeeId: s.id, jumlah: n, catatan });
      if (res.ok) {
        setKasbon("");
        setCatatan("");
        router.refresh();
      } else setMsg(res.error);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {s.nama} <span className="text-xs capitalize text-slate-400">· {s.role}</span>
          </p>
          {s.kasbonBelum > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Kasbon belum dipotong: {formatRupiah(s.kasbonBelum)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Gaji</span>
          <input
            value={gaji}
            onChange={(e) => setGajiVal(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className={`${input} w-32 text-right`}
          />
          <button
            onClick={simpanGaji}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Simpan
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-xs font-medium text-brand-600 hover:underline"
      >
        {open ? "− Tutup kasbon" : `Kasbon / uang muka (${advances.length})`}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              Nominal kasbon
              <input value={kasbon} onChange={(e) => setKasbon(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1 block w-32`} />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Catatan
              <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className={`${input} mt-1 block w-full`} />
            </label>
            <button
              onClick={beriKasbon}
              disabled={pending}
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              Beri Kasbon
            </button>
          </div>
          {msg && <p className="text-xs text-red-600">{msg}</p>}

          {advances.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada kasbon.</p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {advances.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {formatRupiah(a.jumlah)}
                      {a.status === "dipotong" && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          sudah dipotong
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(a.createdAt)}{a.catatan ? ` · ${a.catatan}` : ""}
                    </p>
                  </div>
                  {a.status === "belum_dipotong" && (
                    <button
                      onClick={() => start(async () => { await settleAdvance(a.id); router.refresh(); })}
                      disabled={pending}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Tandai dipotong
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
