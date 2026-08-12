"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOutlet,
  updateOutlet,
  deleteOutlet,
} from "@/lib/outlets-actions";
import { IconPlus, IconTrash } from "@/components/icons";

type Outlet = {
  id: string;
  nama: string;
  telepon: string | null;
  kota: string | null;
  alamat: string | null;
};

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function OutletManager({ daftar }: { daftar: Outlet[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function refresh(text: string) {
    setMsg({ ok: true, text });
    setEditId(null);
    setAdding(false);
    router.refresh();
  }

  function hapus(o: Outlet) {
    if (!window.confirm(`Hapus outlet "${o.nama}"?`)) return;
    start(async () => {
      const res = await deleteOutlet({ id: o.id });
      if (res.ok) refresh("Outlet dihapus ✓");
      else setMsg({ text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!adding && editId === null && (
        <button
          onClick={() => {
            setAdding(true);
            setMsg(undefined);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Outlet
        </button>
      )}

      {adding && (
        <OutletForm
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={(data) =>
            start(async () => {
              const res = await createOutlet(data);
              if (res.ok) refresh("Outlet ditambahkan ✓");
              else setMsg({ text: res.error });
            })
          }
        />
      )}

      {msg && (
        <p className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {daftar.map((o) =>
          editId === o.id ? (
            <li key={o.id}>
              <OutletForm
                initial={o}
                pending={pending}
                onCancel={() => setEditId(null)}
                onSubmit={(data) =>
                  start(async () => {
                    const res = await updateOutlet({ id: o.id, ...data });
                    if (res.ok) refresh("Outlet diperbarui ✓");
                    else setMsg({ text: res.error });
                  })
                }
              />
            </li>
          ) : (
            <li
              key={o.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {o.nama}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {[o.alamat, o.kota, o.telepon].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setEditId(o.id);
                    setAdding(false);
                    setMsg(undefined);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => hapus(o)}
                  disabled={pending}
                  aria-label="Hapus"
                  className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/40"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function OutletForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Outlet;
  pending: boolean;
  onSubmit: (data: {
    nama: string;
    telepon: string;
    kota: string;
    alamat: string;
  }) => void;
  onCancel: () => void;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [telepon, setTelepon] = useState(initial?.telepon ?? "");
  const [kota, setKota] = useState(initial?.kota ?? "");
  const [alamat, setAlamat] = useState(initial?.alamat ?? "");

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/60 dark:bg-brand-950/20">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama outlet"
          className={`${inputBase} w-full`}
        />
        <input
          value={telepon}
          onChange={(e) => setTelepon(e.target.value)}
          placeholder="Telepon (opsional)"
          className={`${inputBase} w-full`}
        />
        <input
          value={kota}
          onChange={(e) => setKota(e.target.value)}
          placeholder="Kota (opsional)"
          className={`${inputBase} w-full`}
        />
        <input
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Alamat (opsional)"
          className={`${inputBase} w-full`}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onSubmit({ nama, telepon, kota, alamat })}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
