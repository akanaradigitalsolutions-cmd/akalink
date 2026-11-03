"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { catatKeuangan } from "@/lib/finance-actions";
import { formatRupiah } from "@/lib/format";
import {
  ExpenseCategoryPicker,
  type PickerGroup,
  type ExpenseSelection,
} from "@/components/expense-category-picker";

type Acc = { kode: string; nama: string };

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function PengeluaranForm({
  kas,
  groups,
  canAdd = false,
}: {
  kas: Acc[];
  groups: PickerGroup[];
  canAdd?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [exp, setExp] = useState<ExpenseSelection>({
    groupKode: "",
    kategoriKode: "",
    produk: "",
  });
  const [kasKode, setKas] = useState(
    kas.find((k) => k.kode === "1.1.02")?.kode ?? kas[0]?.kode ?? "",
  );

  const jml = Number(jumlah.replace(/[^0-9]/g, ""));
  const noData = groups.length === 0 || kas.length === 0;

  function submit() {
    setMsg(undefined);
    if (!(jml > 0)) {
      setMsg({ text: "Jumlah harus lebih dari 0." });
      return;
    }
    if (!exp.kategoriKode) {
      setMsg({ text: "Pilih kategori pengeluaran." });
      return;
    }
    const ket =
      [exp.produk, keterangan].filter((s) => s && s.trim()).join(" — ") ||
      undefined;

    start(async () => {
      const res = await catatKeuangan({
        jenis: "pengeluaran",
        jumlah: jml,
        keterangan: ket,
        tanggal: tanggal || undefined,
        akunBebanKode: exp.kategoriKode,
        kasKode,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Pengeluaran tersimpan ✓" });
        setJumlah("");
        setKeterangan("");
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <ExpenseCategoryPicker groups={groups} canAdd={canAdd} onChange={setExp} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Sumber Kas">
          <select
            value={kasKode}
            onChange={(e) => setKas(e.target.value)}
            className={`${inputBase} w-full`}
          >
            {kas.map((k) => (
              <option key={k.kode} value={k.kode}>
                {k.nama}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Jumlah (Rp)">
          <input
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            inputMode="numeric"
            placeholder="mis. 50000"
            className={`${inputBase} w-full`}
          />
          {jml > 0 && (
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
              {formatRupiah(jml)}
            </span>
          )}
        </Field>
        <Field label="Tanggal (opsional)">
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={`${inputBase} w-full`}
          />
        </Field>
        <div className="sm:col-span-1">
          <Field label="Catatan (opsional)">
            <input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="mis. merk / jumlah"
              className={`${inputBase} w-full`}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={pending || noData}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Pengeluaran"}
        </button>
        {msg && (
          <span
            className={
              msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>

      {noData && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Daftar akun belum lengkap. Minta pemilik membuka menu Keuangan sekali
          agar akun kas & kategori tersedia.
        </p>
      )}
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
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
