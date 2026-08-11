"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/transactions-actions";
import { formatRupiah, SATUAN_SINGKAT } from "@/lib/format";
import { IconPlus, IconTrash } from "@/components/icons";

type Service = {
  id: string;
  nama: string;
  tipeSatuan: string;
  harga: string;
  kategori: string | null;
};
type Consumer = { id: string; nama: string; hp: string | null };
type Item = {
  serviceId: string;
  nama: string;
  tipeSatuan: string;
  harga: number;
  qty: string; // string mentah agar bisa mengetik desimal (mis. "1.5")
};

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

/** Ubah teks jumlah ("1,5" / "1.5") menjadi angka. */
function toNum(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function BuatTransaksi({
  services,
  consumers,
}: {
  services: Service[];
  consumers: Consumer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [consumerId, setConsumerId] = useState<string | null>(null);
  const [consumerQuery, setConsumerQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [isExpress, setIsExpress] = useState(false);
  const [biayaExpress, setBiayaExpress] = useState(0);
  const [diskon, setDiskon] = useState(0);
  const [catatan, setCatatan] = useState("");

  const selectedConsumer = consumers.find((c) => c.id === consumerId);
  const filteredConsumers = useMemo(() => {
    const q = consumerQuery.trim().toLowerCase();
    if (!q) return consumers.slice(0, 6);
    return consumers
      .filter(
        (c) =>
          c.nama.toLowerCase().includes(q) || (c.hp ?? "").includes(q),
      )
      .slice(0, 6);
  }, [consumerQuery, consumers]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.harga * toNum(it.qty), 0),
    [items],
  );
  const grandTotal = Math.max(
    0,
    subtotal + (isExpress ? biayaExpress : 0) - diskon,
  );

  function addService(s: Service) {
    setItems((prev) => {
      const found = prev.find((i) => i.serviceId === s.id);
      if (found)
        return prev.map((i) =>
          i.serviceId === s.id ? { ...i, qty: String(toNum(i.qty) + 1) } : i,
        );
      return [
        ...prev,
        {
          serviceId: s.id,
          nama: s.nama,
          tipeSatuan: s.tipeSatuan,
          harga: Number(s.harga),
          qty: "1",
        },
      ];
    });
  }

  function setQty(serviceId: string, qty: string) {
    setItems((prev) =>
      prev.map((i) => (i.serviceId === serviceId ? { ...i, qty } : i)),
    );
  }
  function removeItem(serviceId: string) {
    setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }

  function submit() {
    setError(undefined);
    if (items.length === 0) {
      setError("Tambahkan minimal satu layanan.");
      return;
    }
    const payloadItems = items
      .map((i) => ({ serviceId: i.serviceId, qty: toNum(i.qty) }))
      .filter((i) => i.qty > 0);
    if (payloadItems.length === 0) {
      setError("Isi jumlah setiap layanan (lebih dari 0).");
      return;
    }
    startTransition(async () => {
      const res = await createTransaction({
        consumerId,
        items: payloadItems,
        isExpress,
        biayaExpress: isExpress ? biayaExpress : 0,
        diskon,
        catatan: catatan || undefined,
      });
      if (res.ok) router.push(`/transaksi/${res.id}`);
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Kiri: pilih konsumen & layanan */}
      <div className="flex flex-col gap-6">
        {/* Konsumen */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            1. Konsumen
          </h3>
          {selectedConsumer ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-950/40">
              <div>
                <p className="font-semibold text-brand-800 dark:text-brand-200">
                  {selectedConsumer.nama}
                </p>
                <p className="text-sm text-brand-600 dark:text-brand-300">
                  {selectedConsumer.hp ?? "—"}
                </p>
              </div>
              <button
                onClick={() => setConsumerId(null)}
                className="text-sm text-brand-600 hover:underline"
              >
                Ganti
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <input
                value={consumerQuery}
                onChange={(e) => setConsumerQuery(e.target.value)}
                placeholder="Cari nama / HP konsumen…"
                className={`${inputBase} w-full`}
              />
              <div className="mt-2 flex flex-col gap-1">
                {filteredConsumers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setConsumerId(c.id)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {c.nama}
                    </span>
                    <span className="text-slate-400">{c.hp ?? ""}</span>
                  </button>
                ))}
                <p className="px-3 pt-1 text-xs text-slate-400">
                  Konsumen belum ada? Tambahkan dulu di menu Konsumen, atau
                  lanjut tanpa konsumen (umum).
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Layanan */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            2. Pilih Layanan
          </h3>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Belum ada layanan aktif. Tambahkan dulu di menu Layanan.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addService(s)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-brand-950/30"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {s.nama}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRupiah(s.harga)} /{" "}
                      {SATUAN_SINGKAT[s.tipeSatuan] ?? s.tipeSatuan}
                    </p>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300">
                    <IconPlus className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Kanan: keranjang */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Rincian Order
          </h3>

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada layanan dipilih.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((it) => (
                <li key={it.serviceId} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {it.nama}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRupiah(it.harga)} ×{" "}
                      {SATUAN_SINGKAT[it.tipeSatuan] ?? ""}
                    </p>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) =>
                      setQty(
                        it.serviceId,
                        e.target.value.replace(/[^0-9.,]/g, ""),
                      )
                    }
                    className={`${inputBase} w-20 text-right`}
                  />
                  <span className="w-24 text-right text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatRupiah(it.harga * toNum(it.qty))}
                  </span>
                  <button
                    onClick={() => removeItem(it.serviceId)}
                    aria-label="Hapus"
                    className="text-red-400 hover:text-red-600"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            {/* Express */}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isExpress}
                onChange={(e) => setIsExpress(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Express (tambah tarif)
            </label>
            {isExpress && (
              <input
                type="number"
                min="0"
                step="1000"
                value={biayaExpress}
                onChange={(e) => setBiayaExpress(Number(e.target.value) || 0)}
                placeholder="Biaya express (Rp)"
                className={`${inputBase} mt-2 w-full`}
              />
            )}

            {/* Diskon */}
            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-200">
              Diskon (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={diskon}
              onChange={(e) => setDiskon(Number(e.target.value) || 0)}
              className={`${inputBase} mt-1 w-full`}
            />

            {/* Catatan */}
            <label className="mt-3 block text-sm text-slate-700 dark:text-slate-200">
              Catatan (opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              className={`${inputBase} mt-1 w-full`}
            />
          </div>

          {/* Total */}
          <div className="flex flex-col gap-1 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <Row label="Subtotal" value={formatRupiah(subtotal)} />
            {isExpress && (
              <Row label="Express" value={`+ ${formatRupiah(biayaExpress)}`} />
            )}
            {diskon > 0 && (
              <Row label="Diskon" value={`− ${formatRupiah(diskon)}`} />
            )}
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white">
                Total
              </span>
              <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Simpan Transaksi"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
