"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/b2b-actions";
import type { B2bClientRow } from "@/lib/b2b";

export function B2bList({
  clients,
  totalPiutang,
}: {
  clients: B2bClientRow[];
  totalPiutang: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Total Piutang Korporat (belum ditagihkan)
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          {formatRupiah(totalPiutang)}
        </p>
      </div>

      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {open ? "− Tutup" : "+ Tambah Klien"}
        </button>
        {open && (
          <ClientForm
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        )}
      </div>

      {clients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada klien korporat.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/b2b/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {c.perusahaan}
                  {!c.aktif && (
                    <span className="ml-2 text-xs text-slate-400">(nonaktif)</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {c.pic ? `${c.pic} · ` : ""}
                  {c.jumlahKonsumen} konsumen · termin {c.terminHari} hari
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {formatRupiah(c.outstanding)}
                </p>
                <p className="text-xs text-slate-400">tertunggak</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientForm({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  const [perusahaan, setPerusahaan] = useState("");
  const [pic, setPic] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [npwp, setNpwp] = useState("");
  const [termin, setTermin] = useState("30");
  const [msg, setMsg] = useState<string>();

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  function simpan() {
    setMsg(undefined);
    if (perusahaan.trim().length < 2) {
      setMsg("Nama perusahaan wajib diisi.");
      return;
    }
    start(async () => {
      const res = await createClient({
        perusahaan,
        pic,
        telepon,
        email,
        alamat,
        npwp,
        terminHari: Number(termin) || 30,
      });
      if (res.ok) onDone();
      else setMsg(res.error);
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <input value={perusahaan} onChange={(e) => setPerusahaan(e.target.value)} placeholder="Nama perusahaan" className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="PIC / kontak" className={input} />
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opsional)" className={input} />
      <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat (opsional)" className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="NPWP (opsional)" className={input} />
        <label className="text-xs text-slate-500">
          Termin (hari)
          <input value={termin} onChange={(e) => setTermin(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={simpan} disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
