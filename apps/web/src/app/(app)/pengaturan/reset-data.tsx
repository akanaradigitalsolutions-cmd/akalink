"use client";

import { useState, useTransition } from "react";
import { kirimKodeReset, konfirmasiReset } from "@/lib/reset-actions";

/**
 * Zona Berbahaya — Reset Total Data.
 * Alur: konfirmasi ketik → kirim kode OTP ke email → masukkan kode → reset.
 * Setelah reset, pengguna diarahkan ke halaman Masuk (sesi lama dicabut).
 */
export function ResetData({ email, namaUsaha }: { email: string; namaUsaha: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "code" | "done">("idle");
  const [frasa, setFrasa] = useState("");
  const [kode, setKode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const frasaBenar = frasa.trim().toUpperCase() === "RESET";

  function kirim() {
    setErr("");
    setMsg("");
    start(async () => {
      const r = await kirimKodeReset();
      if (!r.ok) {
        setErr(r.error ?? "Gagal mengirim kode.");
        return;
      }
      setStep("code");
      setMsg(`Kode 6 digit dikirim ke ${email}. Cek email (termasuk folder spam).`);
    });
  }

  function konfirmasi() {
    setErr("");
    start(async () => {
      const r = await konfirmasiReset(kode);
      if (!r.ok) {
        setErr(r.error ?? "Gagal mereset.");
        return;
      }
      setStep("done");
      // Sesi lama sudah dicabut di server → muat ulang ke halaman masuk.
      window.location.href = "/masuk?reset=1";
    });
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 dark:border-red-900 dark:bg-red-950/30">
      <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
        Zona Berbahaya — Reset Total Data
      </h2>
      <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
        Menghapus <strong>seluruh data</strong> usaha ini secara permanen:
        outlet, layanan, karyawan, konsumen, transaksi, kas, keuangan, dan
        laporan. Akun login Anda tetap, lalu Anda bisa menyiapkan profil laundry
        baru dari nol. <strong>Tidak dapat dibatalkan.</strong>
      </p>

      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Reset Total Data
        </button>
      )}

      {step === "confirm" && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-red-700 dark:text-red-300">
            Untuk melanjutkan, ketik <code className="font-bold">RESET</code>:
          </label>
          <input
            value={frasa}
            onChange={(e) => setFrasa(e.target.value)}
            placeholder="RESET"
            className="w-40 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!frasaBenar || pending}
              onClick={kirim}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Mengirim…" : "Kirim Kode ke Email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setFrasa("");
                setErr("");
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-red-700 dark:text-red-300">
            Masukkan 6 digit kode dari email:
          </label>
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="______"
            className="w-40 rounded-lg border border-red-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={kode.length !== 6 || pending}
              onClick={konfirmasi}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Mereset…" : "Konfirmasi Reset Total"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={kirim}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Kirim ulang kode
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <p className="mt-4 text-sm font-medium text-green-700 dark:text-green-400">
          Data berhasil direset. Mengarahkan ke halaman masuk…
        </p>
      )}

      {msg && <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
    </section>
  );
}
