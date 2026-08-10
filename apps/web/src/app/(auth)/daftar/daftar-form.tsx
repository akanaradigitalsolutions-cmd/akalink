"use client";

import { useActionState } from "react";
import Link from "next/link";
import { daftarTenant, type ActionState } from "@/lib/auth-actions";
import { Field } from "../_components/field";

export function DaftarForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    daftarTenant,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Daftar Laundry Baru
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buat akun pemilik untuk mulai memakai AkaLink.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <Field
        label="Nama Laundry"
        name="namaLaundry"
        placeholder="mis. Aka Express Laundry"
        required
        error={state?.fieldErrors?.namaLaundry}
      />
      <Field
        label="Kota"
        name="kota"
        placeholder="mis. Bandung"
        error={state?.fieldErrors?.kota}
      />
      <Field
        label="Nama Anda (Pemilik)"
        name="namaOwner"
        placeholder="mis. Budi Santoso"
        required
        error={state?.fieldErrors?.namaOwner}
      />
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
        placeholder="Minimal 8 karakter"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Daftar"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-brand-600 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
