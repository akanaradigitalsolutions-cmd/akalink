import type {
  Transaction,
  Consumer,
  Tenant,
  TransactionItem,
} from "@akalink/db";
import {
  formatRupiah,
  formatDateTime,
  formatHp,
  SATUAN_SINGKAT,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";

/**
 * Tampilan nota lengkap (faktur elektronik). Dipakai di halaman publik /n/[id]
 * dan saat mencetak. Kelas `.printable` membuatnya ikut tercetak.
 */
export function NotaView({
  tenant,
  consumer,
  tx,
  items,
  qr,
  link,
  sk,
}: {
  tenant: Tenant | null;
  consumer: Consumer | null;
  tx: Transaction;
  items: TransactionItem[];
  qr: string;
  link: string;
  sk: string[];
}) {
  const sisa =
    tx.statusPembayaran === "lunas" ? 0 : Number(tx.grandTotal);

  return (
    <div className="printable mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-800 dark:border-slate-800 dark:bg-white dark:text-slate-800">
      {/* Header */}
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Faktur Elektronik · Transaksi {tx.tipe}
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">
          {tenant?.nama ?? "AkaLink"}
        </p>
        {tenant?.alamat && (
          <p className="text-xs text-slate-500">{tenant.alamat}</p>
        )}
        {(tenant?.kota || tenant?.telepon) && (
          <p className="text-xs text-slate-500">
            {[tenant?.kota, tenant?.telepon].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <Divider />

      <div className="space-y-1">
        <RowKV k="Nomor Nota" v={tx.noNota} bold />
        <RowKV k="Pelanggan" v={consumer?.nama ?? "Umum"} />
        {consumer?.hp && <RowKV k="No. HP" v={formatHp(consumer.hp)} />}
        <RowKV k="Terima" v={formatDateTime(tx.orderDiterima)} />
        <RowKV k="Selesai" v={formatDateTime(tx.estimasiSelesai)} />
      </div>

      <Divider label="Detail Pesanan" />

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <p className="flex items-start gap-1">
              <span>{it.status === "selesai" ? "✅" : "⬜"}</span>
              <span className="flex-1">
                {it.namaLayanan} — {Number(it.qty)}{" "}
                {SATUAN_SINGKAT[it.tipeSatuan] ?? ""}
              </span>
            </p>
            <p className="pl-5 text-xs text-slate-500">
              @ {formatRupiah(it.harga)} = {formatRupiah(it.subtotal)}
            </p>
          </li>
        ))}
      </ul>

      <Divider label="Detail Biaya" />

      <div className="space-y-1">
        <RowKV k="Subtotal" v={formatRupiah(tx.subtotal)} />
        {Number(tx.biayaExpress) > 0 && (
          <RowKV k="Express" v={`+ ${formatRupiah(tx.biayaExpress)}`} />
        )}
        {Number(tx.diskon) > 0 && (
          <RowKV k="Diskon" v={`− ${formatRupiah(tx.diskon)}`} />
        )}
        <div className="flex justify-between font-bold text-slate-900">
          <span>Grand Total</span>
          <span>{formatRupiah(tx.grandTotal)}</span>
        </div>
        <RowKV k="Sisa Tagihan" v={formatRupiah(sisa)} />
        <RowKV k="Status" v={LABEL_STATUS_BAYAR[tx.statusPembayaran]} />
      </div>

      {/* QR */}
      <div className="mt-5 flex flex-col items-center gap-1">
        <div
          className="h-[132px] w-[132px]"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-[11px] text-slate-500">
          Scan untuk cek status transaksi
        </p>
        <a
          href={link}
          className="break-all text-center text-[10px] text-brand-600 underline"
        >
          {link}
        </a>
      </div>

      <Divider label="Syarat & Ketentuan" />
      <ol className="list-decimal space-y-0.5 pl-4 text-[11px] text-slate-500">
        {sk.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <p className="mt-4 text-center text-xs font-medium text-slate-600">
        Terima kasih 🙏
      </p>
    </div>
  );
}

function Divider({ label }: { label?: string }) {
  if (!label)
    return (
      <div className="my-3 border-t border-dashed border-slate-300" />
    );
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="h-px flex-1 border-t border-dashed border-slate-300" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="h-px flex-1 border-t border-dashed border-slate-300" />
    </div>
  );
}

function RowKV({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span
        className={
          bold
            ? "text-right font-bold text-slate-900"
            : "text-right text-slate-800"
        }
      >
        {v}
      </span>
    </div>
  );
}
