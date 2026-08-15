"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime, formatHp } from "@/lib/format";
import {
  createDelivery,
  assignKurir,
  updateDeliveryStatus,
  deleteDelivery,
} from "@/lib/deliveries-actions";
import type { DeliveryRow } from "@/lib/deliveries";

const STATUS_META: Record<
  DeliveryRow["status"],
  { label: string; cls: string }
> = {
  menunggu: { label: "Menunggu", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  dijadwalkan: { label: "Dijadwalkan", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  dalam_perjalanan: { label: "Dalam Perjalanan", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  selesai: { label: "Selesai", cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  batal: { label: "Batal", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export function AntarJemputManager({
  list,
  konsumen,
  kurir,
  isOwner,
}: {
  list: DeliveryRow[];
  konsumen: { id: string; nama: string; hp: string | null }[];
  kurir: { id: string; nama: string }[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const aktif = list.filter((d) => d.status !== "selesai" && d.status !== "batal");
  const selesai = list.filter((d) => d.status === "selesai" || d.status === "batal");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {addOpen ? "− Tutup" : "+ Permintaan Antar-Jemput"}
        </button>
        {addOpen && (
          <AddForm
            konsumen={konsumen}
            onDone={() => {
              setAddOpen(false);
              router.refresh();
            }}
          />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Aktif ({aktif.length})
        </h2>
        {aktif.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Tidak ada permintaan aktif.
          </p>
        ) : (
          aktif.map((d) => (
            <Card key={d.id} d={d} kurir={kurir} isOwner={isOwner} />
          ))
        )}
      </section>

      {selesai.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Riwayat
          </h2>
          {selesai.map((d) => (
            <Card key={d.id} d={d} kurir={kurir} isOwner={isOwner} />
          ))}
        </section>
      )}
    </div>
  );
}

function Card({
  d,
  kurir,
  isOwner,
}: {
  d: DeliveryRow;
  kurir: { id: string; nama: string }[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const meta = STATUS_META[d.status];
  const waLink = d.hp
    ? `https://wa.me/${d.hp.replace(/[^0-9]/g, "").replace(/^0/, "62")}`
    : null;

  function setStatus(status: string) {
    start(async () => {
      await updateDeliveryStatus({ id: d.id, status });
      router.refresh();
    });
  }
  function setKurir(kurirId: string) {
    start(async () => {
      await assignKurir({ id: d.id, kurirId: kurirId || null });
      router.refresh();
    });
  }
  function hapus() {
    start(async () => {
      await deleteDelivery(d.id);
      router.refresh();
    });
  }

  const final = d.status === "selesai" || d.status === "batal";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              {d.tipe === "jemput" ? "🛵 Jemput" : "📦 Antar"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
              {meta.label}
            </span>
            {d.noNota && (
              <span className="text-[11px] text-slate-400">{d.noNota}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {d.kontak ?? "Umum"}{" "}
            {d.hp && <span className="text-slate-400">· {formatHp(d.hp)}</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{d.alamat}</p>
          <p className="mt-1 text-xs text-slate-400">
            {d.jadwal ? `⏰ ${formatDateTime(d.jadwal)} · ` : ""}
            Ongkir {formatRupiah(d.biayaAntar)}
            {d.kurirNama ? ` · Kurir: ${d.kurirNama}` : ""}
          </p>
          {d.catatan && (
            <p className="mt-1 text-xs italic text-slate-400">{d.catatan}</p>
          )}
        </div>
      </div>

      {!final && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={d.kurirId ?? ""}
              onChange={(e) => setKurir(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Pilih kurir…</option>
              {kurir.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-green-300 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-950/40"
              >
                WhatsApp
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {d.status === "dijadwalkan" && (
              <button
                onClick={() => setStatus("dalam_perjalanan")}
                disabled={pending}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                Berangkat
              </button>
            )}
            {(d.status === "dalam_perjalanan" || d.status === "dijadwalkan") && (
              <button
                onClick={() => setStatus("selesai")}
                disabled={pending}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                Selesai
              </button>
            )}
            <button
              onClick={() => setStatus("batal")}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {final && isOwner && (
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button
            onClick={hapus}
            disabled={pending}
            className="text-xs text-red-500 hover:underline disabled:opacity-60"
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

function AddForm({
  konsumen,
  onDone,
}: {
  konsumen: { id: string; nama: string; hp: string | null }[];
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [tipe, setTipe] = useState<"jemput" | "antar">("jemput");
  const [consumerId, setConsumerId] = useState("");
  const [kontakNama, setKontakNama] = useState("");
  const [kontakHp, setKontakHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [jadwal, setJadwal] = useState("");
  const [biaya, setBiaya] = useState("");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState<string>();

  function simpan() {
    setMsg(undefined);
    if (alamat.trim().length < 3) {
      setMsg("Alamat wajib diisi.");
      return;
    }
    start(async () => {
      const res = await createDelivery({
        tipe,
        alamat,
        consumerId: consumerId || null,
        kontakNama: consumerId ? undefined : kontakNama,
        kontakHp: consumerId ? undefined : kontakHp,
        jadwal: jadwal || null,
        biayaAntar: Number(biaya) || 0,
        catatan,
      });
      if (res.ok) onDone();
      else setMsg(res.error);
    });
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipe("jemput")}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
            tipe === "jemput"
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
              : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          🛵 Penjemputan
        </button>
        <button
          type="button"
          onClick={() => setTipe("antar")}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
            tipe === "antar"
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
              : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          📦 Pengantaran
        </button>
      </div>

      <label className="text-xs text-slate-500">
        Konsumen terdaftar (opsional)
        <select
          value={consumerId}
          onChange={(e) => setConsumerId(e.target.value)}
          className={`${input} mt-1`}
        >
          <option value="">— Kontak manual —</option>
          {konsumen.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama} {k.hp ? `(${k.hp})` : ""}
            </option>
          ))}
        </select>
      </label>

      {!consumerId && (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={kontakNama}
            onChange={(e) => setKontakNama(e.target.value)}
            placeholder="Nama kontak"
            className={input}
          />
          <input
            value={kontakHp}
            onChange={(e) => setKontakHp(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="No. HP"
            inputMode="numeric"
            className={input}
          />
        </div>
      )}

      <textarea
        value={alamat}
        onChange={(e) => setAlamat(e.target.value)}
        placeholder="Alamat lengkap penjemputan/pengantaran"
        rows={2}
        className={input}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Jadwal (opsional)
          <input
            type="datetime-local"
            value={jadwal}
            onChange={(e) => setJadwal(e.target.value)}
            className={`${input} mt-1`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Ongkir (Rp)
          <input
            value={biaya}
            onChange={(e) => setBiaya(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="mis. 10000"
            inputMode="numeric"
            className={`${input} mt-1`}
          />
        </label>
      </div>

      <input
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Catatan (opsional)"
        className={input}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={simpan}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Permintaan"}
        </button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
