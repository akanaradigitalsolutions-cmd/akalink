"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { topupManual } from "@/lib/app-coin-actions";
import type { CoinConfig, CoinLedgerRow } from "@/lib/app-coin";

const NOMINAL = [25_000, 50_000, 100_000, 250_000];

const TIPE_LABEL: Record<CoinLedgerRow["tipe"], string> = {
  topup: "Isi ulang",
  pemakaian: "Pemakaian",
  bonus: "Bonus",
  penyesuaian: "Penyesuaian",
};

const REF_LABEL: Record<string, string> = {
  nota: "Nota",
  whatsapp: "WhatsApp",
  manual: "Manual",
  doku: "DOKU",
};

export function TagihanClient({
  config,
  ledger,
}: {
  config: CoinConfig;
  ledger: CoinLedgerRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState<string>("50000");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const saldo = config.saldoKoin;
  const habis = saldo <= 0;
  const menipis = saldo > 0 && saldo <= config.biayaPerNota * 20;

  const notaTersisa =
    config.biayaPerNota > 0 ? Math.floor(Math.max(0, saldo) / config.biayaPerNota) : 0;

  function isiUlang() {
    setMsg(undefined);
    const n = Number(amount) || 0;
    if (n <= 0) {
      setMsg({ text: "Masukkan nominal yang benar." });
      return;
    }
    start(async () => {
      const res = await topupManual({ amount: n });
      if (res.ok) {
        setMsg({ ok: true, text: "Saldo berhasil ditambah ✓" });
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Kartu saldo */}
      <div
        className={`rounded-2xl border p-5 ${
          habis
            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
            : "border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900 dark:from-brand-950/40 dark:to-slate-900"
        }`}
      >
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Saldo Koin AkaLink
        </p>
        <p
          className={`mt-1 text-3xl font-bold ${
            habis
              ? "text-red-600 dark:text-red-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {formatRupiah(saldo)}
        </p>
        {config.biayaPerNota > 0 && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ± {notaTersisa.toLocaleString("id-ID")} nota lagi ·{" "}
            {formatRupiah(config.biayaPerNota)}/nota
          </p>
        )}
      </div>

      {(habis || menipis) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            habis
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {habis
            ? "⚠️ Saldo koin habis. Transaksi tetap bisa berjalan, namun segera isi ulang agar saldo tidak minus."
            : "Saldo menipis. Sebaiknya isi ulang agar layanan tetap lancar."}
        </div>
      )}

      {/* Isi ulang */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Isi Ulang Saldo
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Pilih nominal lalu tambahkan ke saldo. (Sementara top-up manual —
          pembayaran otomatis via DOKU menyusul.)
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {NOMINAL.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                Number(amount) === n
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/50 dark:text-brand-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {formatRupiah(n)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Rp</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <button
            onClick={isiUlang}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Memproses…" : "Isi Ulang"}
          </button>
          {msg && (
            <span
              className={
                msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"
              }
            >
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Riwayat mutasi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Riwayat Saldo
        </h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada mutasi saldo.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {ledger.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {r.keterangan ?? TIPE_LABEL[r.tipe]}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(r.createdAt)}
                    {r.refType ? ` · ${REF_LABEL[r.refType] ?? r.refType}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      r.delta >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {r.delta >= 0 ? "+" : "−"}
                    {formatRupiah(Math.abs(r.delta))}
                  </p>
                  <p className="text-xs text-slate-400">
                    Saldo {formatRupiah(r.saldoSesudah)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
