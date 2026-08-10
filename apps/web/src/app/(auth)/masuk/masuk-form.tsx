"use client";

import { useActionState } from "react";
import Link from "next/link";
import { masuk, type ActionState } from "@/lib/auth-actions";
import { Field } from "../_components/field";

export function MasukForm({ baruTerdaftar }: { baruTerdaftar?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    masuk,
    undefined,
  );

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

      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="email@contoh.com"
        autoComplete="email"
        required
        error={state?.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
      />

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
