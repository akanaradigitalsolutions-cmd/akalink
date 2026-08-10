"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createService, type ServiceFormState } from "@/lib/services-actions";
import { IconPlus } from "@/components/icons";

const satuanOptions = [
  { value: "kiloan", label: "Kiloan (KG)" },
  { value: "satuan", label: "Satuan (item)" },
  { value: "koin", label: "Koin / load" },
  { value: "luas", label: "Luas (M²)" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function ServiceForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(
    createService,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state?.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <IconPlus className="h-4 w-4" />
        Tambah Layanan
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
          Tambah Layanan Baru
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
          Layanan berhasil ditambahkan.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Layanan" error={state?.fieldErrors?.nama}>
          <input
            name="nama"
            required
            placeholder="mis. Cuci Setrika Reguler"
            className={inputClass}
          />
        </Field>
        <Field label="Tipe Satuan" error={state?.fieldErrors?.tipeSatuan}>
          <select name="tipeSatuan" defaultValue="kiloan" className={inputClass}>
            {satuanOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Harga (Rp)" error={state?.fieldErrors?.harga}>
          <input
            name="harga"
            type="number"
            min="0"
            step="500"
            required
            placeholder="mis. 7000"
            className={inputClass}
          />
        </Field>
        <Field
          label="Estimasi Selesai (jam)"
          error={state?.fieldErrors?.estimasiJam}
        >
          <input
            name="estimasiJam"
            type="number"
            min="0"
            placeholder="mis. 24"
            className={inputClass}
          />
        </Field>
        <Field label="Kategori (opsional)" error={state?.fieldErrors?.kategori}>
          <input
            name="kategori"
            placeholder="mis. Reguler / Express / Satuan"
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            name="expressTersedia"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
          />
          Tersedia opsi Express
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Layanan"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
