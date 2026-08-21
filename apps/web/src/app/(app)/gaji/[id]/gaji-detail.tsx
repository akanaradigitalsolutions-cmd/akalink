"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import {
  giveAdvance,
  repayAdvance,
  settleAdvance,
  deleteAdvance,
} from "@/lib/salary-actions";
import type { AdvanceDetail, EmployeeGajiDetail } from "@/lib/salary";

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function fmtTgl(s: string | null): string {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return s;
  return `${Number(d)} ${BULAN[mi]} ${y}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function GajiDetail({ detail }: { detail: EmployeeGajiDetail }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Mini label="Gaji / Bulan" value={formatRupiah(detail.employee.gaji)} />
        <Mini label="Kasbon Aktif" value={formatRupiah(detail.totalKasbon)} tone="amber" />
        <Mini label="Sudah Dibayar" value={formatRupiah(detail.totalDibayar)} tone="green" />
        <Mini
          label="Sisa Terutang"
          value={formatRupiah(detail.totalSisa)}
          tone={detail.totalSisa > 0 ? "red" : "muted"}
        />
      </div>

      {detail.overdueCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          ⚠ {detail.overdueCount} kasbon sudah lewat jatuh tempo dan belum lunas.
        </div>
      )}

      {/* Beri kasbon */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            + Beri Kasbon Baru
          </span>
          <span className="text-xs text-slate-400">{showForm ? "tutup" : "buka"}</span>
        </button>
        {showForm && (
          <GiveForm employeeId={detail.employee.id} onDone={() => setShowForm(false)} />
        )}
      </div>

      {/* Daftar kasbon */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Riwayat Kasbon ({detail.advances.length})
        </h2>
        {detail.advances.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Belum ada kasbon untuk karyawan ini.
          </p>
        ) : (
          detail.advances.map((a) => <AdvanceCard key={a.id} a={a} />)
        )}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "green" | "red" | "muted";
}) {
  const cls =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "green"
        ? "text-green-600 dark:text-green-400"
        : tone === "red"
          ? "text-red-600 dark:text-red-400"
          : tone === "muted"
            ? "text-slate-400"
            : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function GiveForm({
  employeeId,
  onDone,
}: {
  employeeId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(todayStr());
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [akun, setAkun] = useState<"1.1.02" | "1.1.04">("1.1.02");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();

  function submit() {
    setMsg(undefined);
    const n = Number(jumlah) || 0;
    if (n <= 0) return setMsg("Nominal kasbon tidak valid.");
    start(async () => {
      const res = await giveAdvance({
        employeeId,
        jumlah: n,
        catatan,
        akun,
        tanggal,
        jatuhTempo: jatuhTempo || undefined,
      });
      if (res.ok) {
        setJumlah("");
        setCatatan("");
        setJatuhTempo("");
        onDone();
        router.refresh();
      } else setMsg(res.error);
    });
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-slate-500">
        Nominal kasbon
        <input
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="0"
          className={`${inputCls} mt-1 block w-full text-right`}
        />
      </label>
      <label className="text-xs text-slate-500">
        Sumber dana
        <select
          value={akun}
          onChange={(e) => setAkun(e.target.value as "1.1.02" | "1.1.04")}
          className={`${inputCls} mt-1 block w-full`}
        >
          <option value="1.1.02">Kas Outlet</option>
          <option value="1.1.04">Bank</option>
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Tanggal kasbon
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className={`${inputCls} mt-1 block w-full`}
        />
      </label>
      <label className="text-xs text-slate-500">
        Jatuh tempo (opsional)
        <input
          type="date"
          value={jatuhTempo}
          min={tanggal}
          onChange={(e) => setJatuhTempo(e.target.value)}
          className={`${inputCls} mt-1 block w-full`}
        />
      </label>
      <label className="text-xs text-slate-500 sm:col-span-2">
        Catatan (opsional)
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="mis. untuk keperluan keluarga"
          className={`${inputCls} mt-1 block w-full`}
        />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Kasbon"}
        </button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}

function AdvanceCard({ a }: { a: AdvanceDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [cicil, setCicil] = useState("");
  const [metode, setMetode] = useState<"potong_gaji" | "tunai">("potong_gaji");
  const [tgl, setTgl] = useState(todayStr());
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();

  const pct = a.jumlah > 0 ? Math.min(100, Math.round((a.dibayar / a.jumlah) * 100)) : 0;
  const lunas = a.status === "dipotong";

  function bayar() {
    setMsg(undefined);
    const n = Number(cicil) || 0;
    if (n <= 0) return setMsg("Nominal pembayaran tidak valid.");
    start(async () => {
      const res = await repayAdvance({
        advanceId: a.id,
        jumlah: n,
        metode,
        tanggal: tgl,
        catatan,
      });
      if (res.ok) {
        setCicil("");
        setCatatan("");
        router.refresh();
      } else setMsg(res.error);
    });
  }
  function lunasiSemua() {
    setMsg(undefined);
    start(async () => {
      const res = await settleAdvance(a.id);
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }
  function hapus() {
    if (!confirm("Hapus kasbon ini beserta seluruh cicilan & jurnalnya?")) return;
    start(async () => {
      const res = await deleteAdvance(a.id);
      if (!res.ok) setMsg(res.error);
      else router.refresh();
    });
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${
        a.overdue
          ? "border-red-300 dark:border-red-900"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            {formatRupiah(a.jumlah)}
            {lunas ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                lunas
              </span>
            ) : a.overdue ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                jatuh tempo
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                berjalan
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Kasbon: {fmtTgl(a.tanggal)} · Jatuh tempo: {fmtTgl(a.jatuhTempo)}
          </p>
          {a.catatan && (
            <p className="mt-0.5 text-xs italic text-slate-400">“{a.catatan}”</p>
          )}
          {a.createdByNama && (
            <p className="mt-0.5 text-[11px] text-slate-400">oleh {a.createdByNama}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Sisa</p>
          <p
            className={`text-base font-bold ${
              a.sisa > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            }`}
          >
            {formatRupiah(a.sisa)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
          <span>Dibayar {formatRupiah(a.dibayar)}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${lunas ? "bg-green-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {open ? "− Tutup" : `Riwayat cicilan (${a.payments.length})`}
        </button>
        {!lunas && (
          <button
            onClick={lunasiSemua}
            disabled={pending}
            className="text-xs font-medium text-green-600 hover:underline disabled:opacity-60 dark:text-green-400"
          >
            Lunasi sisa (potong gaji)
          </button>
        )}
        <button
          onClick={hapus}
          disabled={pending}
          className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-60"
        >
          Hapus
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          {/* Form cicil */}
          {!lunas && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Nominal bayar
                <input
                  value={cicil}
                  onChange={(e) => setCicil(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={`maks ${formatRupiah(a.sisa)}`}
                  className={`${inputCls} mt-1 block w-full text-right`}
                />
              </label>
              <label className="text-xs text-slate-500">
                Metode
                <select
                  value={metode}
                  onChange={(e) => setMetode(e.target.value as "potong_gaji" | "tunai")}
                  className={`${inputCls} mt-1 block w-full`}
                >
                  <option value="potong_gaji">Potong gaji</option>
                  <option value="tunai">Dikembalikan tunai</option>
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Tanggal bayar
                <input
                  type="date"
                  value={tgl}
                  onChange={(e) => setTgl(e.target.value)}
                  className={`${inputCls} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs text-slate-500">
                Catatan (opsional)
                <input
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className={`${inputCls} mt-1 block w-full`}
                />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  onClick={bayar}
                  disabled={pending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {pending ? "Memproses…" : "Catat Pembayaran"}
                </button>
                {msg && <span className="text-xs text-red-600">{msg}</span>}
              </div>
            </div>
          )}

          {/* Riwayat pembayaran */}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Riwayat pembayaran
            </p>
            {a.payments.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada pembayaran.</p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
                {a.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {formatRupiah(p.jumlah)}
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {p.metode === "tunai" ? "tunai" : "potong gaji"}
                        </span>
                      </p>
                      <p className="text-slate-400">
                        {fmtTgl(p.tanggal)}
                        {p.catatan ? ` · ${p.catatan}` : ""}
                        {p.createdByNama ? ` · ${p.createdByNama}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
