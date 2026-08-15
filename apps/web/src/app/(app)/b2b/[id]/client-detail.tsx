"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  updateClient,
  deleteClient,
  linkConsumer,
  unlinkConsumer,
  createInvoice,
} from "@/lib/b2b-actions";

type Client = {
  id: string;
  perusahaan: string;
  pic: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  npwp: string | null;
  terminHari: number;
  aktif: boolean;
};
type Consumer = { id: string; nama: string; hp: string | null };
type Tx = { id: string; noNota: string; tanggal: string; konsumen: string | null; grandTotal: number };
type Inv = { id: string; nomor: string; total: number; status: string; tanggalTerbit: string; jatuhTempo: string | null };

export function ClientDetail({
  client,
  linkedConsumers,
  outstandingTx,
  outstandingTotal,
  invoices,
  unlinked,
}: {
  client: Client;
  linkedConsumers: Consumer[];
  outstandingTx: Tx[];
  outstandingTotal: number;
  invoices: Inv[];
  unlinked: Consumer[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [linkId, setLinkId] = useState("");
  const [awal, setAwal] = useState("");
  const [akhir, setAkhir] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  function doLink() {
    if (!linkId) return;
    start(async () => {
      await linkConsumer({ clientId: client.id, consumerId: linkId });
      setLinkId("");
      router.refresh();
    });
  }
  function doUnlink(consumerId: string) {
    start(async () => {
      await unlinkConsumer({ clientId: client.id, consumerId });
      router.refresh();
    });
  }
  function buatInvoice() {
    setMsg(undefined);
    start(async () => {
      const res = await createInvoice({
        clientId: client.id,
        periodeAwal: awal || undefined,
        periodeAkhir: akhir || undefined,
      });
      if (res.ok) {
        router.push(`/b2b/invoice/${res.id}`);
      } else setMsg({ text: res.error });
    });
  }

  const badge = (s: string) =>
    s === "lunas"
      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : s === "batal"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/b2b" className="text-sm text-slate-400 hover:text-slate-600">
          ← B2B
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {client.perusahaan}
        </h1>
      </div>

      {/* Info klien */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p>{client.pic ?? "—"} · {client.telepon ?? "—"}</p>
            <p className="text-xs text-slate-400">{client.email ?? ""}</p>
            <p className="text-xs text-slate-400">{client.alamat ?? ""}</p>
            <p className="mt-1 text-xs text-slate-400">
              Termin {client.terminHari} hari{client.npwp ? ` · NPWP ${client.npwp}` : ""}
            </p>
          </div>
          <button
            onClick={() => setEditOpen((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Edit
          </button>
        </div>
        {editOpen && (
          <EditForm client={client} onDone={() => { setEditOpen(false); router.refresh(); }} />
        )}
      </div>

      {/* Konsumen tertaut */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Konsumen Tertaut ({linkedConsumers.length})
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Transaksi dari konsumen berikut akan masuk ke tagihan korporat ini.
        </p>
        {linkedConsumers.length > 0 && (
          <div className="mb-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {linkedConsumers.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  {k.nama} <span className="text-slate-400">{k.hp ?? ""}</span>
                </span>
                <button
                  onClick={() => doUnlink(k.id)}
                  disabled={pending}
                  className="text-xs text-red-500 hover:underline disabled:opacity-60"
                >
                  Lepas
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Pilih konsumen untuk ditautkan…</option>
            {unlinked.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} {c.hp ? `(${c.hp})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={doLink}
            disabled={pending || !linkId}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Tautkan
          </button>
        </div>
      </div>

      {/* Tertunggak + buat invoice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Transaksi Tertunggak
          </h2>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatRupiah(outstandingTotal)}
          </span>
        </div>
        {outstandingTx.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada transaksi tertunggak yang belum ditagihkan.
          </p>
        ) : (
          <>
            <div className="mb-4 flex max-h-56 flex-col divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {outstandingTx.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-slate-700 dark:text-slate-200">{t.noNota}</p>
                    <p className="text-xs text-slate-400">
                      {t.konsumen ?? "—"} · {formatDateTime(t.tanggal)}
                    </p>
                  </div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {formatRupiah(t.grandTotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                Buat Invoice (opsional filter periode)
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-500">
                  Dari
                  <input type="date" value={awal} onChange={(e) => setAwal(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="text-xs text-slate-500">
                  Sampai
                  <input type="date" value={akhir} onChange={(e) => setAkhir(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <button
                  onClick={buatInvoice}
                  disabled={pending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {pending ? "Membuat…" : "Buat Invoice"}
                </button>
              </div>
              {msg && <p className="mt-2 text-xs text-red-600">{msg.text}</p>}
            </div>
          </>
        )}
      </div>

      {/* Daftar invoice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Invoice
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada invoice.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {invoices.map((i) => (
              <Link
                key={i.id}
                href={`/b2b/invoice/${i.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{i.nomor}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(i.tanggalTerbit)}
                    {i.jatuhTempo ? ` · jatuh tempo ${i.jatuhTempo}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatRupiah(i.total)}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge(i.status)}`}>
                    {i.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <DeleteClient id={client.id} onDone={() => router.push("/b2b")} />
    </div>
  );
}

function EditForm({ client, onDone }: { client: Client; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [perusahaan, setPerusahaan] = useState(client.perusahaan);
  const [pic, setPic] = useState(client.pic ?? "");
  const [telepon, setTelepon] = useState(client.telepon ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [alamat, setAlamat] = useState(client.alamat ?? "");
  const [npwp, setNpwp] = useState(client.npwp ?? "");
  const [termin, setTermin] = useState(String(client.terminHari));
  const [aktif, setAktif] = useState(client.aktif);
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <input value={perusahaan} onChange={(e) => setPerusahaan(e.target.value)} placeholder="Perusahaan" className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="PIC" className={input} />
        <input value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="Telepon" className={input} />
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} />
      <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="NPWP" className={input} />
        <input value={termin} onChange={(e) => setTermin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Termin (hari)" inputMode="numeric" className={input} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} /> Aktif
      </label>
      <button
        onClick={() =>
          start(async () => {
            await updateClient({ id: client.id, perusahaan, pic, telepon, email, alamat, npwp, terminHari: Number(termin) || 30, aktif });
            onDone();
          })
        }
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}

function DeleteClient({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      {!confirm ? (
        <button onClick={() => setConfirm(true)} className="text-xs text-red-500 hover:underline">
          Hapus klien ini
        </button>
      ) : (
        <button
          onClick={() => start(async () => { await deleteClient(id); onDone(); })}
          disabled={pending}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "…" : "Yakin hapus? (konsumen dilepas, transaksi tetap)"}
        </button>
      )}
    </div>
  );
}
