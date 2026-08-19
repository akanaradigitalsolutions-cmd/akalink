"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { recordCashMovement } from "@/lib/cash-actions";
import type { CashMovementRow } from "@/lib/cash";

const TIPE_META: Record<
  CashMovementRow["tipe"],
  { label: string; masuk: boolean }
> = {
  setor_bank: { label: "Setor ke Bank", masuk: false },
  ambil_owner: { label: "Diserahkan ke Pemilik", masuk: false },
  kas_masuk: { label: "Kas Masuk", masuk: true },
};

export function KasManager({
  kas,
  bank,
  movements,
  isOwner,
}: {
  kas: number;
  bank: number;
  movements: CashMovementRow[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tipe, setTipe] = useState<"setor_bank" | "ambil_owner" | "kas_masuk">(
    "setor_bank",
  );
  const [jumlah, setJumlah] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const amt = Number(jumlah) || 0;

  function simpan() {
    setMsg(undefined);
    if (amt <= 0) return setMsg({ text: "Masukkan nominal." });
    if (tipe !== "kas_masuk" && amt > kas)
      return setMsg({ text: "Nominal melebihi saldo kas di laundry." });
    start(async () => {
      const res = await recordCashMovement({ tipe, jumlah: amt, tujuan, catatan });
      if (res.ok) {
        setMsg({ ok: true, text: "Tercatat ✓" });
        setJumlah("");
        setTujuan("");
        setCatatan("");
        router.refresh();
      } else setMsg({ text: res.error });
    });
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
  const kasHabis = kas <= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Saldo */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-5 ${
            kasHabis
              ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              : "border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900 dark:from-brand-950/40 dark:to-slate-900"
          }`}
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            💵 Kas di Laundry
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(kas)}
          </p>
          <p className="mt-1 text-xs text-slate-400">uang tunai yang ada saat ini</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            🏦 Saldo Bank
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(bank)}
          </p>
          <p className="mt-1 text-xs text-slate-400">akumulasi setoran ke bank</p>
        </div>
      </div>

      {/* Catat pemindahan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Catat Pemindahan Kas
        </h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(["setor_bank", "ambil_owner", "kas_masuk"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipe(t)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                tipe === t
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/50 dark:text-brand-300"
                  : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {t === "setor_bank" ? "🏦 Setor Bank" : t === "ambil_owner" ? "👤 Ke Pemilik" : "➕ Kas Masuk"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">
            Nominal (Rp)
            <input value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            {tipe === "setor_bank" ? "Bank / no. rekening tujuan" : tipe === "ambil_owner" ? "Diserahkan kepada" : "Sumber"}
            <input value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder={tipe === "setor_bank" ? "mis. BCA 1234567890" : "mis. Pemilik"} className={`${input} mt-1`} />
          </label>
          <label className="text-xs text-slate-500">
            Catatan (opsional)
            <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className={`${input} mt-1`} />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={simpan}
              disabled={pending}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Catat"}
            </button>
            {msg && (
              <span className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Riwayat Pemindahan
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pemindahan kas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {movements.map((m) => {
              const meta = TIPE_META[m.tipe];
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {meta.label}
                      {m.tujuan ? <span className="text-slate-400"> · {m.tujuan}</span> : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(m.createdAt)}
                      {m.createdByNama ? ` · ${m.createdByNama}` : ""}
                      {m.catatan ? ` · ${m.catatan}` : ""}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${meta.masuk ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {meta.masuk ? "+" : "−"}{formatRupiah(m.jumlah)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isOwner && (
        <p className="text-xs text-slate-400">
          Semua pemindahan kas tercatat & dapat dipantau oleh pemilik.
        </p>
      )}
    </div>
  );
}
