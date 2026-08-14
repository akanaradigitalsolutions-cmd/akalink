"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMemberType,
  updateMemberType,
  deleteMemberType,
} from "@/lib/members-actions";
import { IconPlus, IconTrash } from "@/components/icons";

type MType = { id: string; nama: string; diskonPersen: string; aktif: boolean };

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const pct = (v: string) => `${Number(v)}%`;

export function MemberManager({ types }: { types: MType[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  function done(text: string) {
    setMsg({ ok: true, text });
    setAdding(false);
    setEditId(null);
    router.refresh();
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
          Tambah Jenis Member
        </button>
      )}

      {adding && (
        <Form
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={(d) =>
            start(async () => {
              const res = await createMemberType(d);
              if (res.ok) done("Jenis member ditambahkan ✓");
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

      {types.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Belum ada jenis member. Contoh: Reguler 0%, Silver 5%, Gold 10%.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {types.map((t) =>
            editId === t.id ? (
              <li key={t.id}>
                <Form
                  initial={t}
                  pending={pending}
                  onCancel={() => setEditId(null)}
                  onSubmit={(d) =>
                    start(async () => {
                      const res = await updateMemberType({ id: t.id, ...d });
                      if (res.ok) done("Jenis member diperbarui ✓");
                      else setMsg({ text: res.error });
                    })
                  }
                />
              </li>
            ) : (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    {t.nama}
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      Diskon {pct(t.diskonPersen)}
                    </span>
                    {!t.aktif && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                        Nonaktif
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setAdding(false);
                      setMsg(undefined);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Hapus jenis "${t.nama}"?`)) return;
                      start(async () => {
                        const res = await deleteMemberType({ id: t.id });
                        if (res.ok) done("Jenis member dihapus ✓");
                        else setMsg({ text: res.error });
                      });
                    }}
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
      )}
    </div>
  );
}

function Form({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: MType;
  pending: boolean;
  onSubmit: (d: { nama: string; diskonPersen: number }) => void;
  onCancel: () => void;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [diskon, setDiskon] = useState(
    initial ? String(Number(initial.diskonPersen)) : "",
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ nama, diskonPersen: Number(diskon) || 0 });
      }}
      className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/60 dark:bg-brand-950/20"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama (mis. Gold)"
          className={`${inputBase} w-full`}
        />
        <div className="flex items-center gap-2">
          <input
            value={diskon}
            onChange={(e) => setDiskon(e.target.value)}
            inputMode="decimal"
            placeholder="Diskon"
            className={`${inputBase} w-full`}
          />
          <span className="text-sm text-slate-500">% diskon</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
