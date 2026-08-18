import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { getConsumerDetail } from "@/lib/consumers";
import { getMemberTypes } from "@/lib/members";
import { getPointHistory } from "@/lib/loyalty";
import { getTenantSettings } from "@/lib/settings";
import { MemberControl } from "./member-control";
import { PointControl } from "./point-control";
import {
  formatRupiah,
  formatHp,
  formatDateTime,
  LABEL_STATUS_KERJA,
  LABEL_STATUS_BAYAR,
} from "@/lib/format";

export const metadata: Metadata = { title: "Detail Konsumen — AkaLink" };

const kerjaColor: Record<string, string> = {
  belum_dikerjakan:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  proses: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  selesai: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  diambil: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};
const bayarColor: Record<string, string> = {
  belum_dibayar: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  dp: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  lunas: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export default async function KonsumenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");

  const [data, settings] = await Promise.all([
    getConsumerDetail(tenantId, id),
    getTenantSettings(tenantId),
  ]);
  if (!data) notFound();
  const { consumer: c, jumlah, belanja, piutang, txs } = data;

  const fiturMember = settings?.fiturMember ?? false;
  const fiturPoin = settings?.fiturPoin ?? false;
  const memberTypes = fiturMember ? await getMemberTypes(tenantId) : [];
  const memberNow = memberTypes.find((m) => m.id === c.memberTypeId);
  const poin = Number(c.poin);
  const pointHistory =
    fiturPoin && poin > 0 ? await getPointHistory(tenantId, c.id, 10) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/konsumen"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← Konsumen
        </Link>
      </div>

      {/* Profil */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            {c.nama.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {c.nama}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatHp(c.hp)}
              {c.gender ? ` · ${c.gender}` : ""}
            </p>
          </div>
        </div>
        {(c.email || c.instansi || c.agama) && (
          <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800 sm:grid-cols-3">
            {c.instansi && <Info label="Instansi" value={c.instansi} />}
            {c.email && <Info label="Email" value={c.email} />}
            {c.agama && <Info label="Agama" value={c.agama} />}
          </dl>
        )}
      </section>

      {/* Keanggotaan & Poin (hanya bila fiturnya aktif) */}
      {(fiturMember || fiturPoin) && (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Keanggotaan
          </h2>
          {fiturMember && (
            <div className="flex items-center gap-2">
              {memberNow ? (
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  ★ {memberNow.nama} · diskon {Number(memberNow.diskonPersen)}%
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800">
                  Bukan member
                </span>
              )}
            </div>
          )}
        </div>
        {fiturMember && (
          <MemberControl
            consumerId={c.id}
            current={c.memberTypeId}
            types={memberTypes
              .filter((m) => m.aktif || m.id === c.memberTypeId)
              .map((m) => ({
                id: m.id,
                nama: m.nama,
                diskonPersen: m.diskonPersen,
              }))}
          />
        )}

        {/* Poin loyalitas */}
        {fiturPoin && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Saldo Poin:{" "}
              <span className="font-bold text-brand-700 dark:text-brand-300">
                {poin}
              </span>
            </span>
          </div>
          <PointControl consumerId={c.id} poin={poin} />
          {pointHistory.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-xs">
              {pointHistory.map((p) => {
                const plus = Number(p.delta) >= 0;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-slate-500"
                  >
                    <span className="truncate">
                      {p.keterangan ?? p.tipe} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span
                      className={
                        plus
                          ? "shrink-0 font-semibold text-green-600"
                          : "shrink-0 font-semibold text-red-600"
                      }
                    >
                      {plus ? "+" : ""}
                      {Number(p.delta)} poin
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        )}
      </section>
      )}

      {/* Ringkasan */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Transaksi" value={String(jumlah)} />
        <Stat label="Total Belanja" value={formatRupiah(belanja)} />
        <Stat
          label="Piutang (Belum Lunas)"
          value={formatRupiah(piutang)}
          tone={piutang > 0 ? "warn" : "default"}
        />
      </section>

      {/* Riwayat transaksi */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Riwayat Transaksi
          </h2>
        </div>
        {txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Belum ada transaksi untuk konsumen ini.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {txs.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transaksi/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      {t.noNota}
                      {t.isExpress && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Express
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(t.orderDiterima)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kerjaColor[t.statusPekerjaan]}`}
                    >
                      {LABEL_STATUS_KERJA[t.statusPekerjaan]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bayarColor[t.statusPembayaran]}`}
                    >
                      {LABEL_STATUS_BAYAR[t.statusPembayaran]}
                    </span>
                    <span className="w-24 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(t.grandTotal)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  const color =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
