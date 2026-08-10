"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createConsumer, type ConsumerFormState } from "@/lib/consumers-actions";
import { IconPlus } from "@/components/icons";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const inputClass = `${inputBase} w-full`;

export function ConsumerForm() {
  const [open, setOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [state, action, pending] = useActionState<ConsumerFormState, FormData>(
    createConsumer,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <IconPlus className="h-4 w-4" />
        Tambah Konsumen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Tambah Konsumen
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Tutup
        </button>
      </div>

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Konsumen berhasil ditambahkan.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nama" error={state?.fieldErrors?.nama} required>
          <input name="nama" required placeholder="Nama konsumen" className={inputClass} />
        </Field>
        <Field label="No. HP" error={state?.fieldErrors?.hp}>
          <input
            name="hp"
            inputMode="tel"
            placeholder="0812xxxx / 62812xxxx"
            className={inputClass}
          />
        </Field>
        <Field label="Gender" error={state?.fieldErrors?.gender}>
          <select name="gender" defaultValue="" className={inputClass}>
            <option value="">—</option>
            <option value="pria">Pria</option>
            <option value="wanita">Wanita</option>
          </select>
        </Field>
      </div>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="mt-4 text-sm font-medium text-brand-600 hover:underline"
      >
        {showOptional ? "− Sembunyikan data opsional" : "+ Tambah data opsional"}
      </button>

      {showOptional && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Instansi (opsional)">
            <input name="instansi" className={inputClass} placeholder="mis. PT / Sekolah / Hotel" />
          </Field>
          <Field label="Email (opsional)" error={state?.fieldErrors?.email}>
            <input name="email" type="email" className={inputClass} placeholder="email@contoh.com" />
          </Field>
          <Field label="Tanggal Lahir (opsional)">
            <input name="tanggalLahir" type="date" className={inputClass} />
          </Field>
          <Field label="Agama (opsional)">
            <input name="agama" className={inputClass} />
          </Field>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Konsumen"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
