"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPromo,
  updatePromo,
  deletePromo,
} from "@/lib/promos-actions";
import { formatRupiah } from "@/lib/format";
import { IconPlus, IconTrash } from "@/components/icons";

type Promo = {
  id: string;
  kode: string;
  nama: string;
  tipe: string;
  nilai: string;
  minBelanja: string;
  maxPotongan: string;
  berlakuSampai: string | null;
  aktif: boolean;
};

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function PromoManager({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();
  const [adding, setAdding] = useState(false);

  function done(text: string) {
    setMsg({ ok: true, text });
    setAdding(false);
    router.refresh();
  }

  function ringkas(p: Promo) {
    const potongan =
      p.tipe === "persen"
        ? `${Number(p.nilai)}%${Number(p.maxPotongan) > 0 ? ` (maks ${formatRupiah(p.maxPotongan)})` : ""}`
        : formatRupiah(p.nilai);
    const parts = [`Diskon ${potongan}`];
    if (Number(p.minBelanja) > 0)
      parts.push(`min ${formatRupiah(p.minBelanja)}`);
    if (p.berlakuSampai)
      parts.push(
        `s/d ${new Date(`${p.berlakuSampai}T12:00:00`).toLocaleDateString(
          "id-ID",
          { day: "numeric", month: "short", year: "numeric" },
        )}`,
      );
    return parts.join(" · ");
  }

  return (
    <div className="flex flex-col gap-4">
      {!adding && (
        <button
          onClick={() => {
            setAdding(true);
            setMsg(undefined);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Promo
        </button>
      )}

      {adding && (
        <AddForm
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={(d) =>
            start(async () => {
              const res = await createPromo(d);
              if (res.ok) done("Promo dibuat ✓");
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

      {promos.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Belum ada promo. Contoh: kode <b>HEMAT10</b> diskon 10%.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {promos.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                    {p.kode}
                  </span>
                  {p.nama}
                  {!p.aktif && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                      Nonaktif
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{ringkas(p)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    start(async () => {
                      const res = await updatePromo({
                        id: p.id,
                        nama: p.nama,
                        aktif: !p.aktif,
                      });
                      if (res.ok) router.refresh();
                      else setMsg({ text: res.error });
                    })
                  }
                  disabled={pending}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm(`Hapus promo "${p.kode}"?`)) return;
                    start(async () => {
                      const res = await deletePromo({ id: p.id });
                      if (res.ok) done("Promo dihapus ✓");
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
          ))}
        </ul>
      )}
    </div>
  );
}

function AddForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (d: {
    kode: string;
    nama: string;
    tipe: string;
    nilai: number;
    minBelanja: number;
    maxPotongan: number;
    berlakuSampai?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState("persen");
  const [nilai, setNilai] = useState("");
  const [minBelanja, setMin] = useState("");
  const [maxPotongan, setMax] = useState("");
  const [sampai, setSampai] = useState("");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        Promo Baru
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            kode,
            nama,
            tipe,
            nilai: Number(nilai) || 0,
            minBelanja: Number(minBelanja) || 0,
            maxPotongan: Number(maxPotongan) || 0,
            berlakuSampai: sampai || undefined,
          });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          placeholder="Kode (mis. HEMAT10)"
          className={`${inputBase} w-full font-mono`}
        />
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama promo (mis. Promo Bulan Ini)"
          className={`${inputBase} w-full`}
        />
        <select
          value={tipe}
          onChange={(e) => setTipe(e.target.value)}
          className={`${inputBase} w-full`}
        >
          <option value="persen">Diskon persen (%)</option>
          <option value="nominal">Diskon nominal (Rp)</option>
        </select>
        <input
          value={nilai}
          onChange={(e) => setNilai(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder={tipe === "persen" ? "Nilai % (mis. 10)" : "Nilai Rp"}
          className={`${inputBase} w-full`}
        />
        <input
          value={minBelanja}
          onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="Min. belanja Rp (opsional)"
          className={`${inputBase} w-full`}
        />
        {tipe === "persen" && (
          <input
            value={maxPotongan}
            onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="Maks. potongan Rp (opsional)"
            className={`${inputBase} w-full`}
          />
        )}
        <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
          Berlaku sampai (opsional)
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className={`${inputBase} w-full`}
          />
        </label>
        <div className="flex items-center gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Buat Promo"}
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
    </section>
  );
}
