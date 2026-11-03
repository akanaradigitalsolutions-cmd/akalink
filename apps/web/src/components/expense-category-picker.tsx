"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpenseCategory } from "@/lib/expense-actions";

export type PickerKategori = { kode: string; nama: string; produk: string[] };
export type PickerGroup = {
  kode: string;
  nama: string;
  tipe: "beban" | "aset";
  kategori: PickerKategori[];
};

export type ExpenseSelection = {
  groupKode: string;
  kategoriKode: string;
  produk: string;
};

const CUSTOM = "__custom__";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function ExpenseCategoryPicker({
  groups,
  canAdd = false,
  onChange,
}: {
  groups: PickerGroup[];
  canAdd?: boolean;
  onChange: (sel: ExpenseSelection) => void;
}) {
  const router = useRouter();
  const [groupKode, setGroupKode] = useState(groups[0]?.kode ?? "");
  const [kategoriKode, setKategoriKode] = useState(
    groups[0]?.kategori[0]?.kode ?? "",
  );
  const [produkSel, setProdukSel] = useState("");
  const [customProduk, setCustomProduk] = useState("");

  // Kategori tambahan (optimistic) hasil "Tambah Kategori" owner, per kelompok.
  const [extra, setExtra] = useState<Record<string, PickerKategori[]>>({});

  const group = useMemo(
    () => groups.find((g) => g.kode === groupKode) ?? groups[0],
    [groups, groupKode],
  );

  const kategoriList = useMemo(() => {
    const base = group?.kategori ?? [];
    const add = (extra[group?.kode ?? ""] ?? []).filter(
      (e) => !base.some((b) => b.kode === e.kode),
    );
    return [...base, ...add];
  }, [group, extra]);

  const kategori = useMemo(
    () => kategoriList.find((k) => k.kode === kategoriKode) ?? kategoriList[0],
    [kategoriList, kategoriKode],
  );

  const produkOptions = kategori?.produk ?? [];
  const resolvedProduk =
    produkOptions.length === 0 || produkSel === CUSTOM
      ? customProduk.trim()
      : produkSel;

  // Saat kelompok berubah, pilih kategori pertama.
  useEffect(() => {
    if (!group) return;
    const first = kategoriList[0]?.kode ?? "";
    if (!kategoriList.some((k) => k.kode === kategoriKode)) {
      setKategoriKode(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKode, kategoriList]);

  // Saat kategori berubah, set produk default.
  useEffect(() => {
    if (produkOptions.length > 0) {
      setProdukSel((prev) =>
        produkOptions.includes(prev) ? prev : produkOptions[0],
      );
    } else {
      setProdukSel(CUSTOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategoriKode, kategori?.produk?.length]);

  // Laporkan seleksi ke parent.
  useEffect(() => {
    onChange({
      groupKode: group?.kode ?? "",
      kategoriKode: kategori?.kode ?? "",
      produk: resolvedProduk,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.kode, kategori?.kode, resolvedProduk]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Kelompok Akun">
        <select
          value={groupKode}
          onChange={(e) => setGroupKode(e.target.value)}
          className={`${inputBase} w-full`}
        >
          {groups.map((g) => (
            <option key={g.kode} value={g.kode}>
              {g.nama}
              {g.tipe === "aset" ? " (Dibayar Dimuka)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kategori">
        <div className="flex gap-2">
          <select
            value={kategori?.kode ?? ""}
            onChange={(e) => setKategoriKode(e.target.value)}
            className={`${inputBase} w-full`}
          >
            {kategoriList.map((k) => (
              <option key={k.kode} value={k.kode}>
                {k.nama}
              </option>
            ))}
          </select>
          {canAdd && (
            <AddKategori
              groupKode={group?.kode ?? ""}
              onAdded={(k) => {
                setExtra((prev) => ({
                  ...prev,
                  [group?.kode ?? ""]: [
                    ...(prev[group?.kode ?? ""] ?? []),
                    { kode: k.kode, nama: k.nama, produk: [] },
                  ],
                }));
                setKategoriKode(k.kode);
                router.refresh();
              }}
            />
          )}
        </div>
      </Field>

      <div className="sm:col-span-2">
        <Field label="Produk / Item">
          {produkOptions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={produkSel}
                onChange={(e) => setProdukSel(e.target.value)}
                className={`${inputBase} w-full`}
              >
                {produkOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={CUSTOM}>Lainnya (ketik sendiri)…</option>
              </select>
              {produkSel === CUSTOM && (
                <input
                  value={customProduk}
                  onChange={(e) => setCustomProduk(e.target.value)}
                  placeholder="Tulis nama item"
                  className={`${inputBase} w-full`}
                />
              )}
            </div>
          ) : (
            <input
              value={customProduk}
              onChange={(e) => setCustomProduk(e.target.value)}
              placeholder="Tulis nama item (mis. Deterjen)"
              className={`${inputBase} w-full`}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

function AddKategori({
  groupKode,
  onAdded,
}: {
  groupKode: string;
  onAdded: (k: { kode: string; nama: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Tambah kategori baru"
        className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        +
      </button>
    );
  }

  function submit() {
    setErr("");
    const n = nama.trim();
    if (n.length < 2) {
      setErr("Nama minimal 2 karakter.");
      return;
    }
    start(async () => {
      const r = await addExpenseCategory({ groupKode, nama: n });
      if (r.ok) {
        onAdded({ kode: r.kode, nama: r.nama });
        setNama("");
        setOpen(false);
      } else {
        setErr(r.error);
      }
    });
  }

  return (
    <div className="absolute right-0 z-20 mt-12 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Kategori baru
      </p>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama kategori"
        autoFocus
        className={`${inputBase} mb-2 w-full`}
      />
      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setErr("");
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
