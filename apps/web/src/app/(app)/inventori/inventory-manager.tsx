"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createItem,
  updateItem,
  deleteItem,
  buyStock,
  useStock,
  adjustStock,
  transferStock,
} from "@/lib/inventory-actions";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/suppliers-actions";
import { formatRupiah } from "@/lib/format";
import { IconPlus, IconTrash } from "@/components/icons";

type Supplier = {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  aktif: boolean;
};
type Item = {
  id: string;
  nama: string;
  satuan: string;
  stok: string;
  harga: string;
  minStok: string;
  aktif: boolean;
};
type Kas = { kode: string; nama: string };
type Mov = {
  id: string;
  tipe: string;
  qtyDelta: string;
  saldoSesudah: string;
  keterangan: string | null;
  itemNama: string | null;
  satuan: string | null;
  createdAt: string;
};

const SATUAN = ["pcs", "botol", "liter", "ml", "kg", "gram", "pack", "roll", "lembar"];
const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function fmtQty(v: string | number) {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

type Mode = "beli" | "pakai" | "opname" | "edit" | "transfer";
type OutletOpt = { id: string; nama: string };

export function InventoryManager({
  items,
  kas,
  suppliers,
  transferOutlets = [],
  movements,
}: {
  items: Item[];
  kas: Kas[];
  suppliers: Supplier[];
  transferOutlets?: OutletOpt[];
  movements: Mov[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState<{ id: string; mode: Mode } | null>(null);

  function done(text: string) {
    setMsg({ ok: true, text });
    setActive(null);
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {!adding && (
        <button
          onClick={() => {
            setAdding(true);
            setActive(null);
            setMsg(undefined);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Bahan
        </button>
      )}

      {adding && (
        <AddForm
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={(data) =>
            start(async () => {
              const res = await createItem(data);
              if (res.ok) done("Bahan ditambahkan ✓");
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

      <SupplierSection suppliers={suppliers} />

      {/* Daftar bahan */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Belum ada bahan. Klik <b>Tambah Bahan</b> untuk mulai.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => {
            const low =
              Number(it.minStok) > 0 && Number(it.stok) <= Number(it.minStok);
            const open = active?.id === it.id;
            return (
              <li
                key={it.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      {it.nama}
                      {low && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                          Stok menipis
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stok:{" "}
                      <span
                        className={
                          low
                            ? "font-semibold text-red-600"
                            : "font-semibold text-slate-700 dark:text-slate-200"
                        }
                      >
                        {fmtQty(it.stok)} {it.satuan}
                      </span>{" "}
                      · {formatRupiah(it.harga)}/{it.satuan}
                      {Number(it.minStok) > 0 &&
                        ` · min ${fmtQty(it.minStok)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Act label="Beli" onClick={() => setActive({ id: it.id, mode: "beli" })} />
                    <Act label="Pakai" onClick={() => setActive({ id: it.id, mode: "pakai" })} />
                    {transferOutlets.length > 0 && (
                      <Act label="Transfer" onClick={() => setActive({ id: it.id, mode: "transfer" })} />
                    )}
                    <Act label="Opname" onClick={() => setActive({ id: it.id, mode: "opname" })} />
                    <Act label="Edit" onClick={() => setActive({ id: it.id, mode: "edit" })} />
                  </div>
                </div>

                {open && active.mode === "beli" && (
                  <BuyForm
                    item={it}
                    kas={kas}
                    suppliers={suppliers.filter((s) => s.aktif)}
                    pending={pending}
                    onCancel={() => setActive(null)}
                    onSubmit={(d) =>
                      start(async () => {
                        const res = await buyStock({ itemId: it.id, ...d });
                        if (res.ok) done("Pembelian stok tercatat ✓");
                        else setMsg({ text: res.error });
                      })
                    }
                  />
                )}
                {open && active.mode === "pakai" && (
                  <SimpleQtyForm
                    label="Jumlah dipakai"
                    item={it}
                    pending={pending}
                    onCancel={() => setActive(null)}
                    onSubmit={(qty, ket) =>
                      start(async () => {
                        const res = await useStock({
                          itemId: it.id,
                          qty,
                          keterangan: ket,
                        });
                        if (res.ok) done("Pemakaian stok tercatat ✓");
                        else setMsg({ text: res.error });
                      })
                    }
                  />
                )}
                {open && active.mode === "transfer" && (
                  <TransferForm
                    item={it}
                    outlets={transferOutlets}
                    pending={pending}
                    onCancel={() => setActive(null)}
                    onSubmit={(qty, toOutletId) =>
                      start(async () => {
                        const res = await transferStock({
                          itemId: it.id,
                          qty,
                          toOutletId,
                        });
                        if (res.ok) done("Stok ditransfer ✓");
                        else setMsg({ text: res.error });
                      })
                    }
                  />
                )}
                {open && active.mode === "opname" && (
                  <SimpleQtyForm
                    label={`Stok fisik (sistem: ${fmtQty(it.stok)})`}
                    item={it}
                    defaultQty={fmtQty(it.stok)}
                    pending={pending}
                    onCancel={() => setActive(null)}
                    onSubmit={(qty, ket) =>
                      start(async () => {
                        const res = await adjustStock({
                          itemId: it.id,
                          stokFisik: qty,
                          keterangan: ket,
                        });
                        if (res.ok) done("Stok disesuaikan ✓");
                        else setMsg({ text: res.error });
                      })
                    }
                  />
                )}
                {open && active.mode === "edit" && (
                  <EditForm
                    item={it}
                    pending={pending}
                    onCancel={() => setActive(null)}
                    onDelete={() => {
                      if (!window.confirm(`Hapus bahan "${it.nama}"?`)) return;
                      start(async () => {
                        const res = await deleteItem({ id: it.id });
                        if (res.ok) done("Bahan dihapus ✓");
                        else setMsg({ text: res.error });
                      });
                    }}
                    onSubmit={(d) =>
                      start(async () => {
                        const res = await updateItem({ id: it.id, ...d });
                        if (res.ok) done("Bahan diperbarui ✓");
                        else setMsg({ text: res.error });
                      })
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Riwayat stok */}
      {movements.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Riwayat Stok
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {movements.map((m) => {
              const masuk = Number(m.qtyDelta) >= 0;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {m.itemNama ?? "—"}{" "}
                      <span className="text-xs font-normal capitalize text-slate-400">
                        · {m.tipe}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.keterangan ? ` · ${m.keterangan}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={
                        masuk
                          ? "font-semibold text-green-600"
                          : "font-semibold text-red-600"
                      }
                    >
                      {masuk ? "+" : ""}
                      {fmtQty(m.qtyDelta)} {m.satuan ?? ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      sisa {fmtQty(m.saldoSesudah)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Act({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      {children}
    </div>
  );
}

function Buttons({
  pending,
  onCancel,
  submitLabel = "Simpan",
}: {
  pending: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white dark:border-slate-700 dark:text-slate-300"
      >
        Batal
      </button>
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
    nama: string;
    satuan: string;
    minStok: number;
    stokAwal: number;
    harga: number;
  }) => void;
  onCancel: () => void;
}) {
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("pcs");
  const [minStok, setMin] = useState("");
  const [stokAwal, setStok] = useState("");
  const [harga, setHarga] = useState("");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        Bahan Baru
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            nama,
            satuan,
            minStok: Number(minStok) || 0,
            stokAwal: Number(stokAwal) || 0,
            harga: Number(harga) || 0,
          });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama bahan (mis. Deterjen)"
          className={`${inputBase} w-full`}
        />
        <select
          value={satuan}
          onChange={(e) => setSatuan(e.target.value)}
          className={`${inputBase} w-full`}
        >
          {SATUAN.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={stokAwal}
          onChange={(e) => setStok(e.target.value)}
          inputMode="decimal"
          placeholder="Stok awal (opsional)"
          className={`${inputBase} w-full`}
        />
        <input
          value={harga}
          onChange={(e) => setHarga(e.target.value)}
          inputMode="numeric"
          placeholder="Harga per satuan (opsional)"
          className={`${inputBase} w-full`}
        />
        <input
          value={minStok}
          onChange={(e) => setMin(e.target.value)}
          inputMode="decimal"
          placeholder="Batas minimum (alert)"
          className={`${inputBase} w-full sm:col-span-2`}
        />
        <div className="sm:col-span-2">
          <Buttons pending={pending} onCancel={onCancel} submitLabel="Tambah" />
        </div>
      </form>
    </section>
  );
}

function BuyForm({
  item,
  kas,
  suppliers,
  pending,
  onSubmit,
  onCancel,
}: {
  item: Item;
  kas: Kas[];
  suppliers: Supplier[];
  pending: boolean;
  onSubmit: (d: {
    qty: number;
    totalHarga: number;
    kasKode: string;
    supplierId?: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [kasKode, setKas] = useState(
    kas.find((k) => k.kode === "1.1.02")?.kode ?? kas[0]?.kode ?? "",
  );
  const [supplierId, setSupplier] = useState("");
  return (
    <Panel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            qty: Number(qty) || 0,
            totalHarga: Number(total) || 0,
            kasKode,
            supplierId: supplierId || null,
          });
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            placeholder={`Jumlah beli (${item.satuan})`}
            className={`${inputBase} w-full`}
          />
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            inputMode="numeric"
            placeholder="Total bayar (Rp)"
            className={`${inputBase} w-full`}
          />
          <select
            value={kasKode}
            onChange={(e) => setKas(e.target.value)}
            className={`${inputBase} w-full`}
          >
            {kas.map((k) => (
              <option key={k.kode} value={k.kode}>
                Bayar dari: {k.nama}
              </option>
            ))}
            <option value="HUTANG">Bayar nanti (Hutang)</option>
          </select>
          <select
            value={supplierId}
            onChange={(e) => setSupplier(e.target.value)}
            className={`${inputBase} w-full`}
          >
            <option value="">Tanpa supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                Supplier: {s.nama}
              </option>
            ))}
          </select>
        </div>
        <Buttons pending={pending} onCancel={onCancel} submitLabel="Catat Pembelian" />
      </form>
    </Panel>
  );
}

function SimpleQtyForm({
  label,
  item,
  defaultQty = "",
  pending,
  onSubmit,
  onCancel,
}: {
  label: string;
  item: Item;
  defaultQty?: string;
  pending: boolean;
  onSubmit: (qty: number, ket?: string) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(defaultQty);
  const [ket, setKet] = useState("");
  return (
    <Panel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(Number(qty) || 0, ket || undefined);
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            placeholder={`${label} (${item.satuan})`}
            autoFocus
            className={`${inputBase} w-full`}
          />
          <input
            value={ket}
            onChange={(e) => setKet(e.target.value)}
            placeholder="Keterangan (opsional)"
            className={`${inputBase} w-full`}
          />
        </div>
        <Buttons pending={pending} onCancel={onCancel} />
      </form>
    </Panel>
  );
}

function TransferForm({
  item,
  outlets,
  pending,
  onSubmit,
  onCancel,
}: {
  item: Item;
  outlets: OutletOpt[];
  pending: boolean;
  onSubmit: (qty: number, toOutletId: string) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState("");
  const [toOutletId, setTo] = useState(outlets[0]?.id ?? "");
  return (
    <Panel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(Number(qty) || 0, toOutletId);
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder={`Jumlah transfer (${item.satuan})`}
            className={`${inputBase} w-full`}
          />
          <select
            value={toOutletId}
            onChange={(e) => setTo(e.target.value)}
            className={`${inputBase} w-full`}
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                Ke: {o.nama}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-400">
          Stok pindah ke outlet tujuan (dibuat otomatis bila belum ada).
        </p>
        <Buttons pending={pending} onCancel={onCancel} submitLabel="Transfer" />
      </form>
    </Panel>
  );
}

function EditForm({
  item,
  pending,
  onSubmit,
  onDelete,
  onCancel,
}: {
  item: Item;
  pending: boolean;
  onSubmit: (d: {
    nama: string;
    satuan: string;
    minStok: number;
    aktif: boolean;
  }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [nama, setNama] = useState(item.nama);
  const [satuan, setSatuan] = useState(item.satuan);
  const [minStok, setMin] = useState(item.minStok);
  return (
    <Panel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            nama,
            satuan,
            minStok: Number(minStok) || 0,
            aktif: true,
          });
        }}
        className="flex flex-col gap-2"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={`${inputBase} w-full`}
          />
          <select
            value={satuan}
            onChange={(e) => setSatuan(e.target.value)}
            className={`${inputBase} w-full`}
          >
            {SATUAN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={minStok}
            onChange={(e) => setMin(e.target.value)}
            inputMode="decimal"
            placeholder="Batas minimum"
            className={`${inputBase} w-full sm:col-span-2`}
          />
        </div>
        <div className="flex items-center justify-between">
          <Buttons pending={pending} onCancel={onCancel} />
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Hapus bahan"
            className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/40"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </form>
    </Panel>
  );
}

function SupplierSection({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();

  function refresh() {
    setAdding(false);
    setEditId(null);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Supplier ({suppliers.length})
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          {!adding && editId === null && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <IconPlus className="h-4 w-4" />
              Tambah Supplier
            </button>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}

          {adding && (
            <SupplierForm
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(d) =>
                start(async () => {
                  const res = await createSupplier(d);
                  if (res.ok) refresh();
                  else setErr(res.error);
                })
              }
            />
          )}

          <ul className="flex flex-col gap-2">
            {suppliers.map((s) =>
              editId === s.id ? (
                <li key={s.id}>
                  <SupplierForm
                    initial={s}
                    pending={pending}
                    onCancel={() => setEditId(null)}
                    onSubmit={(d) =>
                      start(async () => {
                        const res = await updateSupplier({ id: s.id, ...d });
                        if (res.ok) refresh();
                        else setErr(res.error);
                      })
                    }
                  />
                </li>
              ) : (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {s.nama}
                      {!s.aktif && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          (nonaktif)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[s.telepon, s.alamat].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditId(s.id);
                        setAdding(false);
                      }}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm(`Hapus supplier "${s.nama}"?`))
                          return;
                        start(async () => {
                          const res = await deleteSupplier({ id: s.id });
                          if (res.ok) refresh();
                          else setErr(res.error);
                        });
                      }}
                      disabled={pending}
                      aria-label="Hapus"
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/40"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function SupplierForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Supplier;
  pending: boolean;
  onSubmit: (d: { nama: string; telepon: string; alamat: string }) => void;
  onCancel: () => void;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [telepon, setTelepon] = useState(initial?.telepon ?? "");
  const [alamat, setAlamat] = useState(initial?.alamat ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ nama, telepon, alamat });
      }}
      className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama supplier"
          className={`${inputBase} w-full`}
        />
        <input
          value={telepon}
          onChange={(e) => setTelepon(e.target.value)}
          placeholder="Telepon (opsional)"
          className={`${inputBase} w-full`}
        />
        <input
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Alamat (opsional)"
          className={`${inputBase} w-full`}
        />
      </div>
      <Buttons pending={pending} onCancel={onCancel} />
    </form>
  );
}
