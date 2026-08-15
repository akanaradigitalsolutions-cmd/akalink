"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import {
  createInvestor,
  hitungBagiHasil,
  recordPayout,
  type HitungResult,
} from "@/lib/investors-actions";
import type { InvestorRow } from "@/lib/investors";

export function InvestorList({
  investors,
  totalModal,
  totalDibayar,
  defaultAwal,
  defaultAkhir,
}: {
  investors: InvestorRow[];
  totalModal: number;
  totalDibayar: number;
  defaultAwal: string;
  defaultAkhir: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Modal Investor</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(totalModal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Bagi Hasil Dibayar</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(totalDibayar)}
          </p>
        </div>
      </div>

      {/* Kalkulator bagi hasil */}
      <BagiHasilPanel defaultAwal={defaultAwal} defaultAkhir={defaultAkhir} />

      {/* Investor */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Daftar Investor
          </h2>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {addOpen ? "− Tutup" : "+ Investor"}
          </button>
        </div>
        {addOpen && (
          <InvestorForm
            onDone={() => {
              setAddOpen(false);
              router.refresh();
            }}
          />
        )}
        {investors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Belum ada investor.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {investors.map((i) => (
              <Link
                key={i.id}
                href={`/investor/${i.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {i.nama}
                    {!i.aktif && <span className="ml-2 text-xs text-slate-400">(nonaktif)</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    Bagi hasil {i.persenAktif}% · dibayar {formatRupiah(i.totalDibayar)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatRupiah(i.totalModal)}
                  </p>
                  <p className="text-xs text-slate-400">modal</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BagiHasilPanel({
  defaultAwal,
  defaultAkhir,
}: {
  defaultAwal: string;
  defaultAkhir: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paying, startPay] = useTransition();
  const [awal, setAwal] = useState(defaultAwal);
  const [akhir, setAkhir] = useState(defaultAkhir);
  const [hasil, setHasil] = useState<HitungResult | null>(null);
  const [akun, setAkun] = useState<"1.1.02" | "1.1.04">("1.1.04");
  const [msg, setMsg] = useState<string>();

  function hitung() {
    setMsg(undefined);
    start(async () => {
      const res = await hitungBagiHasil({ periodeAwal: awal, periodeAkhir: akhir });
      setHasil(res);
    });
  }
  function bayar(investorId: string, jumlah: number, persen: number, laba: number) {
    startPay(async () => {
      const res = await recordPayout({
        investorId,
        jumlah,
        persen,
        labaPeriode: laba,
        periodeAwal: awal,
        periodeAkhir: akhir,
        akun,
      });
      if (res.ok) {
        setMsg("Bagi hasil tercatat ✓");
        router.refresh();
        hitung();
      } else setMsg(res.error);
    });
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-900 dark:bg-brand-950/20">
      <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
        Hitung Bagi Hasil
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Pilih periode → sistem menghitung laba usaha & bagian tiap investor.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-500">
          Dari
          <input type="date" value={awal} onChange={(e) => setAwal(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-xs text-slate-500">
          Sampai
          <input type="date" value={akhir} onChange={(e) => setAkhir(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <button
          onClick={hitung}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menghitung…" : "Hitung"}
        </button>
      </div>

      {hasil && hasil.ok && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Pendapatan" value={formatRupiah(hasil.pendapatan)} />
            <Stat label="Beban" value={formatRupiah(hasil.beban)} />
            <Stat
              label="Laba"
              value={formatRupiah(hasil.laba)}
              tone={hasil.laba >= 0 ? "pos" : "neg"}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">Bayar dari:</span>
            <select value={akun} onChange={(e) => setAkun(e.target.value as "1.1.02" | "1.1.04")} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950">
              <option value="1.1.04">Bank</option>
              <option value="1.1.02">Kas Outlet</option>
            </select>
          </div>

          {hasil.shares.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              Belum ada investor aktif dengan persentase bagi hasil.
            </p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {hasil.shares.map((s) => (
                <div key={s.investorId} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.nama}</p>
                    <p className="text-xs text-slate-400">{s.persen}% dari laba</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatRupiah(s.bagian)}
                    </span>
                    <button
                      onClick={() => bayar(s.investorId, s.bagian, s.persen, hasil.laba)}
                      disabled={paying || s.bagian <= 0}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      Bayar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {msg && <p className="mt-2 text-xs text-brand-700 dark:text-brand-300">{msg}</p>}
        </div>
      )}
      {hasil && !hasil.ok && (
        <p className="mt-2 text-xs text-red-600">{hasil.error}</p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl bg-white p-2 dark:bg-slate-900">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${tone === "neg" ? "text-red-600" : tone === "pos" ? "text-green-600" : "text-slate-800 dark:text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

function InvestorForm({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama investor" className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} />
      </div>
      <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional)" className={input} />
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (nama.trim().length < 2) { setMsg("Nama wajib diisi."); return; }
            start(async () => {
              const res = await createInvestor({ nama, telepon, email, catatan });
              if (res.ok) onDone();
              else setMsg(res.error);
            });
          }}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
