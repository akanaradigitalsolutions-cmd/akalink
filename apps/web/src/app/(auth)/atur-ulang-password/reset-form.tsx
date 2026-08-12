"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPasswordBaru } from "@/lib/auth-actions";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900";

export function ResetForm({ email }: { email: string }) {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (next.length < 8) return setError("Password baru minimal 8 karakter.");
    if (next !== confirm) return setError("Konfirmasi password tidak cocok.");
    start(async () => {
      const res = await setPasswordBaru({ next });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.replace("/dashboard"), 1200);
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-lg font-semibold text-green-600">Password diubah ✓</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Mengalihkan ke dashboard…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Atur Ulang Password
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {email ? (
            <>
              Untuk akun <b>{email}</b>. Buat password baru minimal 8 karakter.
            </>
          ) : (
            "Buat password baru minimal 8 karakter."
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Password Baru
        </label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="min. 8 karakter"
          className={inputBase}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Ulangi Password Baru
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputBase}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan Password Baru"}
      </button>
    </form>
  );
}
