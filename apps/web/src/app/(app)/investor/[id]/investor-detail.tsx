"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  updateInvestor,
  deleteInvestor,
  addInvestment,
} from "@/lib/investors-actions";

type Investor = {
  id: string;
  nama: string;
  telepon: string | null;
  email: string | null;
  catatan: string | null;
  aktif: boolean;
};
type Inv = { id: string; modal: number; persen: number; tanggalMulai: string | null; aktif: boolean };
type Payout = {
  id: string;
  jumlah: number;
  persen: number;
  labaPeriode: number;
  periodeAwal: string | null;
  periodeAkhir: string | null;
  createdAt: string;
};

export function InvestorDetail({
  investor,
  investments,
  payouts,
}: {
  investor: Investor;
  investments: Inv[];
  payouts: Payout[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const totalModal = investments.reduce((s, i) => s + i.modal, 0);
  const totalDibayar = payouts.reduce((s, p) => s + p.jumlah, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/investor" className="text-sm text-slate-400 hover:text-slate-600">
          ← Investor
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{investor.nama}</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p>{investor.telepon ?? "—"} · {investor.email ?? "—"}</p>
            {investor.catatan && <p className="text-xs text-slate-400">{investor.catatan}</p>}
            <p className="mt-2 text-xs text-slate-400">
              Total modal <b>{formatRupiah(totalModal)}</b> · dibayar{" "}
              <b>{formatRupiah(totalDibayar)}</b>
            </p>
          </div>
          <button
            onClick={() => setEditOpen((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Edit
          </button>
        </div>
        {editOpen && (
          <EditForm investor={investor} onDone={() => { setEditOpen(false); router.refresh(); }} />
        )}
      </div>

      {/* Investasi / setoran modal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Setoran Modal</h2>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            {addOpen ? "− Tutup" : "+ Setoran"}
          </button>
        </div>
        {addOpen && (
          <AddInvestmentForm investorId={investor.id} onDone={() => { setAddOpen(false); router.refresh(); }} />
        )}
        {investments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada setoran modal.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {investments.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {formatRupiah(i.modal)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Bagi hasil {i.persen}%{i.tanggalMulai ? ` · sejak ${i.tanggalMulai}` : ""}
                    {!i.aktif ? " · nonaktif" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat bagi hasil */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Riwayat Bagi Hasil
        </h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pembayaran bagi hasil.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {formatRupiah(p.jumlah)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(p.createdAt)} · {p.persen}% dari laba {formatRupiah(p.labaPeriode)}
                    {p.periodeAwal ? ` · ${p.periodeAwal}–${p.periodeAkhir ?? ""}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteInvestor id={investor.id} onDone={() => router.push("/investor")} />
    </div>
  );
}

function AddInvestmentForm({ investorId, onDone }: { investorId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [modal, setModal] = useState("");
  const [persen, setPersen] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [akun, setAkun] = useState<"1.1.02" | "1.1.04">("1.1.04");
  const [msg, setMsg] = useState<string>();
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Modal (Rp)
          <input value={modal} onChange={(e) => setModal(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          Bagi hasil (%)
          <input value={persen} onChange={(e) => setPersen(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="mis. 20" className={`${input} mt-1`} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Tanggal mulai
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          Masuk ke
          <select value={akun} onChange={(e) => setAkun(e.target.value as "1.1.02" | "1.1.04")} className={`${input} mt-1`}>
            <option value="1.1.04">Bank</option>
            <option value="1.1.02">Kas Outlet</option>
          </select>
        </label>
      </div>
      <button
        onClick={() =>
          start(async () => {
            const res = await addInvestment({ investorId, modal: Number(modal) || 0, persenBagiHasil: Number(persen) || 0, tanggalMulai: tanggal || undefined, akun });
            if (res.ok) onDone();
            else setMsg(res.error);
          })
        }
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan Setoran"}
      </button>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}

function EditForm({ investor, onDone }: { investor: Investor; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [nama, setNama] = useState(investor.nama);
  const [telepon, setTelepon] = useState(investor.telepon ?? "");
  const [email, setEmail] = useState(investor.email ?? "");
  const [catatan, setCatatan] = useState(investor.catatan ?? "");
  const [aktif, setAktif] = useState(investor.aktif);
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <input value={nama} onChange={(e) => setNama(e.target.value)} className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} />
      </div>
      <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan" className={input} />
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} /> Aktif
      </label>
      <button
        onClick={() => start(async () => { await updateInvestor({ id: investor.id, nama, telepon, email, catatan, aktif }); onDone(); })}
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "…" : "Simpan"}
      </button>
    </div>
  );
}

function DeleteInvestor({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return !confirm ? (
    <button onClick={() => setConfirm(true)} className="text-xs text-red-500 hover:underline">
      Hapus investor ini
    </button>
  ) : (
    <button
      onClick={() => start(async () => { await deleteInvestor(id); onDone(); })}
      disabled={pending}
      className="self-start rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "…" : "Yakin hapus? (data setoran & bagi hasil ikut terhapus)"}
    </button>
  );
}
