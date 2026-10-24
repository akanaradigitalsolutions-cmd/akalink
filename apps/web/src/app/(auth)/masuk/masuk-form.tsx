"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { masuk, type ActionState } from "@/lib/auth-actions";
import { Field } from "../_components/field";
import { getAccounts, removeAccount, type SavedAccount } from "@/lib/accounts";

function initials(nama: string): string {
  return (
    nama
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function MasukForm({
  baruTerdaftar,
  setelahReset,
}: {
  baruTerdaftar?: boolean;
  setelahReset?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    masuk,
    undefined,
  );
  const [identifier, setIdentifier] = useState("");
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  function pilih(acc: SavedAccount) {
    setIdentifier(acc.id);
    // Fokuskan ke password — password tidak pernah disimpan.
    setTimeout(() => document.getElementById("password")?.focus(), 0);
  }

  function hapus(id: string) {
    removeAccount(id);
    setAccounts(getAccounts());
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Masuk
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selamat datang kembali di AkaLink.
        </p>
      </div>

      {baruTerdaftar && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Akun berhasil dibuat. Silakan masuk.
        </div>
      )}

      {setelahReset && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Data berhasil direset. Masuk kembali untuk menyiapkan laundry baru.
        </div>
      )}

      {/* Pengguna tersimpan di perangkat ini (Ganti Pengguna). */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Pengguna di perangkat ini — ketuk untuk pilih, lalu isi password:
          </p>
          <div className="flex flex-col gap-1.5">
            {accounts.map((a) => {
              const active = a.id.toLowerCase() === identifier.toLowerCase();
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                    active
                      ? "border-brand-500 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/40"
                      : "border-transparent hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => pilih(a)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                      {initials(a.nama)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {a.nama}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {a.id}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => hapus(a.id)}
                    aria-label="Lupakan akun ini"
                    className="shrink-0 rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email atau Username <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="email@contoh.com atau username"
          autoComplete="username"
          required
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
      />

      <div className="-mt-1 text-right">
        <Link
          href="/lupa-password"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Lupa password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Masuk"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-brand-600 hover:underline">
          Daftar laundry baru
        </Link>
      </p>
    </form>
  );
}
