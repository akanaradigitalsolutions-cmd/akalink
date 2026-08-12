"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { kirimResetPassword } from "@/lib/auth-actions";

export function LupaForm({ linkGagal }: { linkGagal?: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [terkirim, setTerkirim] = useState(false);
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = await kirimResetPassword({ email });
      if (res.ok) setTerkirim(true);
      else setError(res.error);
    });
  }

  if (terkirim) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Cek email Anda
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Jika <b>{email}</b> terdaftar, kami mengirim tautan untuk mengatur
            ulang password. Buka email tersebut lalu klik tautannya.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Tidak ada email? Periksa folder spam, atau coba lagi beberapa menit
          kemudian.
        </p>
        <Link
          href="/masuk"
          className="text-center text-sm font-medium text-brand-600 hover:underline"
        >
          ← Kembali ke Masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Lupa Password
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Masukkan email akun Anda. Kami kirim tautan untuk mengatur ulang
          password.
        </p>
      </div>

      {linkGagal && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@contoh.com"
          autoComplete="email"
          required
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Mengirim…" : "Kirim Tautan Reset"}
      </button>

      <Link
        href="/masuk"
        className="text-center text-sm font-medium text-brand-600 hover:underline"
      >
        ← Kembali ke Masuk
      </Link>
    </form>
  );
}
