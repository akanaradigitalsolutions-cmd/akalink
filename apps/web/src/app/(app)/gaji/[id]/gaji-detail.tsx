"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import {
  giveAdvance,
  repayAdvance,
  deleteAdvance,
  setEmployeeStart,
  runPayroll,
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
  const [showGive, setShowGive] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Siklus gaji */}
      <CycleCard detail={detail} />

      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Mini label="Gaji / Bulan" value={formatRupiah(detail.employee.gaji)} />
        <Mini label="Kasbon Aktif" value={formatRupiah(detail.totalKasbon)} tone="amber" />
        <Mini
          label="Sisa Kasbon"
          value={formatRupiah(detail.totalSisa)}
          tone={detail.totalSisa > 0 ? "red" : "muted"}
        />
        <Mini
          label="Perkiraan Bawa Pulang"
          value={formatRupiah(detail.estimasiGajiBersih)}
          tone="green"
        />
      </div>

      {detail.overdueCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          ⚠ {detail.overdueCount} kasbon sudah lewat jatuh tempo dan belum lunas.
        </div>
      )}

      {/* Proses Gaji */}
      <PayrollPanel detail={detail} />

      {/* Riwayat penggajian */}
      <PayrollHistory detail={detail} />

      {/* Beri kasbon */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setShowGive((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            + Beri Kasbon Baru
          </span>
          <span className="text-xs text-slate-400">{showGive ? "tutup" : "buka"}</span>
        </button>
        {showGive && (
          <GiveForm employeeId={detail.employee.id} onDone={() => setShowGive(false)} />
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

function CycleCard({ detail }: { detail: EmployeeGajiDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tgl, setTgl] = useState(detail.employee.tanggalMulai ?? "");
  const [saved, setSaved] = useState(false);
  const c = detail.cycle;

  function simpan() {
    setSaved(false);
    start(async () => {
      const res = await setEmployeeStart({
        employeeId: detail.employee.id,
        tanggalMulai: tgl || null,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Siklus Gaji
          </p>
          <label className="mt-2 block text-xs text-slate-500">
            Tanggal mulai kerja
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                value={tgl}
                onChange={(e) => {
                  setTgl(e.target.value);
                  setSaved(false);
                }}
                className={`${inputCls}`}
              />
              <button
                onClick={simpan}
                disabled={pending}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saved ? "✓" : "Simpan"}
              </button>
            </div>
          </label>
        </div>
        {c.nextPayDate ? (
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-right dark:bg-brand-950/40">
            <p className="text-[11px] text-brand-700 dark:text-brand-300">
              Gajian berikutnya
            </p>
            <p className="text-lg font-bold text-brand-800 dark:text-brand-200">
              {fmtTgl(c.nextPayDate)}
            </p>
            <p className="text-[11px] text-brand-600 dark:text-brand-400">
              {c.daysUntil !== null && c.daysUntil >= 0
                ? `${c.daysUntil} hari lagi`
                : ""}{" "}
              · periode {fmtTgl(c.periodeMulai)}–{fmtTgl(c.periodeAkhir)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Isi tanggal mulai kerja untuk menghitung jadwal gajian.
          </p>
        )}
      </div>
    </div>
  );
}

function PayrollPanel({ detail }: { detail: EmployeeGajiDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [tanggalBayar, setTanggalBayar] = useState(
    detail.cycle.nextPayDate ?? todayStr(),
  );
  const [gajiPokok, setGajiPokok] = useState(String(detail.employee.gaji || ""));
  const [akun, setAkun] = useState<"1.1.02" | "1.1.04">("1.1.02");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const outstanding = useMemo(
    () => detail.advances.filter((a) => a.status === "belum_dipotong" && a.sisa > 0),
    [detail.advances],
  );
  // Map advanceId → jumlah potong (default = sisa, dipilih semua).
  const [potong, setPotong] = useState<Record<string, string>>(() =>
    Object.fromEntries(outstanding.map((a) => [a.id, String(a.sisa)])),
  );
  const [pilih, setPilih] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(outstanding.map((a) => [a.id, true])),
  );

  const totalPotong = outstanding.reduce(
    (s, a) => s + (pilih[a.id] ? Math.min(Number(potong[a.id]) || 0, a.sisa) : 0),
    0,
  );
  const pokok = Number(gajiPokok) || 0;
  const bersih = Math.max(0, pokok - totalPotong);
  const lebih = totalPotong > pokok;

  function proses() {
    setMsg(undefined);
    if (pokok <= 0) return setMsg({ text: "Gaji pokok tidak valid." });
    if (lebih) return setMsg({ text: "Potongan kasbon melebihi gaji pokok." });
    const potongan = outstanding
      .filter((a) => pilih[a.id] && (Number(potong[a.id]) || 0) > 0)
      .map((a) => ({ advanceId: a.id, jumlah: Math.min(Number(potong[a.id]) || 0, a.sisa) }));
    start(async () => {
      const res = await runPayroll({
        employeeId: detail.employee.id,
        tanggalBayar,
        gajiPokok: pokok,
        potongan,
        akun,
        catatan,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Gaji berhasil diproses ✓" });
        setCatatan("");
        setOpen(false);
        router.refresh();
      } else setMsg({ text: res.error });
    });
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">
          💰 Proses Gaji (Penggajian)
        </span>
        <span className="text-xs text-brand-500">{open ? "tutup" : "buka"}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-500">
              Tanggal bayar
              <input
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
                className={`${inputCls} mt-1 block w-full`}
              />
            </label>
            <label className="text-xs text-slate-500">
              Gaji pokok
              <input
                value={gajiPokok}
                onChange={(e) => setGajiPokok(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className={`${inputCls} mt-1 block w-full text-right`}
              />
            </label>
            <label className="text-xs text-slate-500">
              Sumber dana (gaji bersih)
              <select
                value={akun}
                onChange={(e) => setAkun(e.target.value as "1.1.02" | "1.1.04")}
                className={`${inputCls} mt-1 block w-full`}
              >
                <option value="1.1.02">Kas Outlet</option>
                <option value="1.1.04">Bank</option>
              </select>
            </label>
          </div>

          {/* Potongan kasbon */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Potongan kasbon periode ini
            </p>
            {outstanding.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada kasbon aktif.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {outstanding.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!pilih[a.id]}
                      onChange={(e) =>
                        setPilih((p) => ({ ...p, [a.id]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">
                      Kasbon {fmtTgl(a.tanggal)} · sisa {formatRupiah(a.sisa)}
                      {a.overdue && (
                        <span className="ml-1 text-red-600 dark:text-red-400">(jatuh tempo)</span>
                      )}
                    </span>
                    <span className="text-slate-400">potong</span>
                    <input
                      value={potong[a.id] ?? ""}
                      onChange={(e) =>
                        setPotong((p) => ({
                          ...p,
                          [a.id]: e.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      inputMode="numeric"
                      disabled={!pilih[a.id]}
                      className={`${inputCls} w-28 text-right disabled:opacity-50`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan hitung */}
          <div className="rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
            <Line label="Gaji pokok" value={formatRupiah(pokok)} />
            <Line label="Potongan kasbon" value={`− ${formatRupiah(totalPotong)}`} tone="amber" />
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">
                Gaji bersih dibayar
              </span>
              <span className={`text-lg font-bold ${lebih ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>
                {formatRupiah(bersih)}
              </span>
            </div>
          </div>

          <label className="text-xs text-slate-500">
            Catatan (opsional)
            <input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className={`${inputCls} mt-1 block w-full`}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={proses}
              disabled={pending || lebih}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Memproses…" : "Proses & Bayar Gaji"}
            </button>
            {msg && (
              <span className={msg.ok ? "text-xs text-green-600" : "text-xs text-red-600"}>
                {msg.text}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Tercatat sebagai jurnal: Dr Beban Gaji / Cr Piutang Karyawan (potongan) /
            Cr Kas·Bank (bersih). Otomatis masuk Laba-Rugi &amp; Neraca.
          </p>
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber";
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={
          tone === "amber"
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-800 dark:text-slate-100"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PayrollHistory({ detail }: { detail: EmployeeGajiDetail }) {
  if (detail.payrolls.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Riwayat Penggajian ({detail.payrolls.length})
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Tgl Bayar</th>
              <th className="px-3 py-2 text-left font-medium">Periode</th>
              <th className="px-3 py-2 text-right font-medium">Pokok</th>
              <th className="px-3 py-2 text-right font-medium">Potong</th>
              <th className="px-3 py-2 text-right font-medium">Bersih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {detail.payrolls.map((p) => (
              <tr key={p.id} className="bg-white dark:bg-slate-900">
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {fmtTgl(p.tanggalBayar)}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {fmtTgl(p.periodeMulai)}–{fmtTgl(p.periodeAkhir)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                  {formatRupiah(p.gajiPokok)}
                </td>
                <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                  {p.potonganKasbon > 0 ? formatRupiah(p.potonganKasbon) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                  {formatRupiah(p.gajiBersih)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [tunai, setTunai] = useState("");
  const [tgl, setTgl] = useState(todayStr());
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();

  const pct = a.jumlah > 0 ? Math.min(100, Math.round((a.dibayar / a.jumlah) * 100)) : 0;
  const lunas = a.status === "dipotong";

  function bayarTunai() {
    setMsg(undefined);
    const n = Number(tunai) || 0;
    if (n <= 0) return setMsg("Nominal tidak valid.");
    start(async () => {
      const res = await repayAdvance({
        advanceId: a.id,
        jumlah: n,
        tanggal: tgl,
        catatan,
      });
      if (res.ok) {
        setTunai("");
        setCatatan("");
        router.refresh();
      } else setMsg(res.error);
    });
  }
  function hapus() {
    if (!confirm("Hapus kasbon ini beserta jurnalnya?")) return;
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
          {open ? "− Tutup" : `Riwayat & pengembalian (${a.payments.length})`}
        </button>
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
          {!lunas && (
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-[11px] text-slate-500 sm:col-span-2">
                Terima pengembalian <b>tunai</b> dari karyawan (menambah Kas Outlet).
                Untuk memotong dari gaji, gunakan <b>Proses Gaji</b> di atas.
              </p>
              <label className="text-xs text-slate-500">
                Nominal tunai
                <input
                  value={tunai}
                  onChange={(e) => setTunai(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={`maks ${formatRupiah(a.sisa)}`}
                  className={`${inputCls} mt-1 block w-full text-right`}
                />
              </label>
              <label className="text-xs text-slate-500">
                Tanggal
                <input
                  type="date"
                  value={tgl}
                  onChange={(e) => setTgl(e.target.value)}
                  className={`${inputCls} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs text-slate-500 sm:col-span-2">
                Catatan (opsional)
                <input
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className={`${inputCls} mt-1 block w-full`}
                />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  onClick={bayarTunai}
                  disabled={pending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {pending ? "Memproses…" : "Catat Pengembalian Tunai"}
                </button>
                {msg && <span className="text-xs text-red-600">{msg}</span>}
              </div>
            </div>
          )}

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
