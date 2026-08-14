"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/settings-actions";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

type Initial = {
  nama: string;
  kota: string;
  telepon: string;
  alamat: string;
  poinRupiah: number;
  syaratKetentuan: string[];
};

export function SettingsForm({
  initial,
  skDefault,
}: {
  initial: Initial;
  skDefault: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const [nama, setNama] = useState(initial.nama);
  const [kota, setKota] = useState(initial.kota);
  const [telepon, setTelepon] = useState(initial.telepon);
  const [alamat, setAlamat] = useState(initial.alamat);
  const [poinRupiah, setPoinRupiah] = useState(String(initial.poinRupiah || ""));
  const [sk, setSk] = useState<string[]>(
    initial.syaratKetentuan.length ? initial.syaratKetentuan : [""],
  );

  function setSkAt(i: number, v: string) {
    setSk((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }
  function addSk() {
    setSk((arr) => [...arr, ""]);
  }
  function removeSk(i: number) {
    setSk((arr) => (arr.length <= 1 ? [""] : arr.filter((_, idx) => idx !== i)));
  }

  function submit() {
    setMsg(undefined);
    if (nama.trim().length < 2) {
      setMsg({ text: "Nama usaha wajib diisi." });
      return;
    }
    start(async () => {
      const res = await updateSettings({
        nama,
        kota,
        telepon,
        alamat,
        poinRupiah: Number(poinRupiah) || 0,
        syaratKetentuan: sk,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Tersimpan ✓" });
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profil usaha */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Identitas Usaha
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Muncul sebagai kepala nota.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Usaha">
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Akanara Laundry"
              className={`${inputBase} w-full`}
            />
          </Field>
          <Field label="Kota">
            <input
              value={kota}
              onChange={(e) => setKota(e.target.value)}
              placeholder="mis. Bandung"
              className={`${inputBase} w-full`}
            />
          </Field>
          <Field label="Telepon / WhatsApp">
            <input
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              inputMode="tel"
              placeholder="mis. 0812-3456-7890"
              className={`${inputBase} w-full`}
            />
          </Field>
          <Field label="Alamat">
            <input
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="mis. Jl. Merdeka No. 10"
              className={`${inputBase} w-full`}
            />
          </Field>
        </div>
      </section>

      {/* Poin loyalitas */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Poin Loyalitas
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Setiap kelipatan rupiah ini memberi 1 poin ke konsumen saat transaksi
          <b> lunas</b>. Kosongkan / 0 untuk menonaktifkan poin.
        </p>
        <Field label="Rupiah untuk 1 poin">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Rp</span>
            <input
              value={poinRupiah}
              onChange={(e) =>
                setPoinRupiah(e.target.value.replace(/[^0-9]/g, ""))
              }
              inputMode="numeric"
              placeholder="mis. 10000 (Rp10.000 = 1 poin)"
              className={`${inputBase} w-full`}
            />
          </div>
        </Field>
      </section>

      {/* Syarat & Ketentuan */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Syarat &amp; Ketentuan Nota
          </h2>
          <button
            type="button"
            onClick={() => setSk(skDefault)}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Pakai contoh bawaan
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Tiap baris jadi satu poin bernomor di kaki nota.
        </p>

        <div className="flex flex-col gap-2">
          {sk.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-slate-400">
                {i + 1}.
              </span>
              <input
                value={line}
                onChange={(e) => setSkAt(i, e.target.value)}
                placeholder="Tulis satu poin ketentuan…"
                className={`${inputBase} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeSk(i)}
                aria-label="Hapus baris"
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:bg-red-950/40"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSk}
          className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          + Tambah baris
        </button>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Perubahan"}
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
