"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { catatKeuangan } from "@/lib/finance-actions";

type Acc = { kode: string; nama: string };

const JENIS: { v: string; label: string }[] = [
  { v: "pengeluaran", label: "Pengeluaran" },
  { v: "modal", label: "Setoran Modal" },
  { v: "prive", label: "Prive" },
  { v: "transfer", label: "Transfer Kas" },
];

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function FinanceForms({ kas, beban }: { kas: Acc[]; beban: Acc[] }) {
  const router = useRouter();
  const [jenis, setJenis] = useState("pengeluaran");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [akunBebanKode, setBeban] = useState(beban[0]?.kode ?? "");
  const [kasKode, setKas] = useState(
    kas.find((k) => k.kode === "1.1.02")?.kode ?? kas[0]?.kode ?? "",
  );
  const [dariKode, setDari] = useState(kas[0]?.kode ?? "");
  const [keKode, setKe] = useState(kas[1]?.kode ?? kas[0]?.kode ?? "");

  function submit() {
    setMsg(undefined);
    const jml = Number(jumlah.replace(/[^0-9.]/g, ""));
    if (!(jml > 0)) {
      setMsg({ text: "Jumlah harus lebih dari 0." });
      return;
    }
    start(async () => {
      const res = await catatKeuangan({
        jenis,
        jumlah: jml,
        keterangan,
        tanggal: tanggal || undefined,
        akunBebanKode,
        kasKode,
        dariKode,
        keKode,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Tersimpan ✓" });
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
      {/* Jenis */}
      <div className="mb-5 flex flex-wrap gap-2">
        {JENIS.map((j) => (
          <button
            key={j.v}
            type="button"
            onClick={() => {
              setJenis(j.v);
              setMsg(undefined);
            }}
            className={
              jenis === j.v
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            {j.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {jenis === "pengeluaran" && (
          <>
            <Field label="Kategori Beban">
              <select
                value={akunBebanKode}
                onChange={(e) => setBeban(e.target.value)}
                className={`${inputBase} w-full`}
              >
                {beban.map((b) => (
                  <option key={b.kode} value={b.kode}>
                    {b.kode} · {b.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sumber Kas">
              <KasSelect kas={kas} value={kasKode} onChange={setKas} />
            </Field>
          </>
        )}

        {jenis === "modal" && (
          <Field label="Masuk ke Kas">
            <KasSelect kas={kas} value={kasKode} onChange={setKas} />
          </Field>
        )}

        {jenis === "prive" && (
          <Field label="Diambil dari Kas">
            <KasSelect kas={kas} value={kasKode} onChange={setKas} />
          </Field>
        )}

        {jenis === "transfer" && (
          <>
            <Field label="Dari Kas">
              <KasSelect kas={kas} value={dariKode} onChange={setDari} />
            </Field>
            <Field label="Ke Kas">
              <KasSelect kas={kas} value={keKode} onChange={setKe} />
            </Field>
          </>
        )}

        <Field label="Jumlah (Rp)">
          <input
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            inputMode="numeric"
            placeholder="mis. 50000"
            className={`${inputBase} w-full`}
          />
        </Field>
        <Field label="Tanggal (opsional)">
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={`${inputBase} w-full`}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Keterangan (opsional)">
            <input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="mis. Beli deterjen"
              className={`${inputBase} w-full`}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
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

function KasSelect({
  kas,
  value,
  onChange,
}: {
  kas: Acc[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} w-full`}
    >
      {kas.map((k) => (
        <option key={k.kode} value={k.kode}>
          {k.nama}
        </option>
      ))}
    </select>
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
