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
  fiturMember: boolean;
  fiturPoin: boolean;
  fiturPromo: boolean;
  fiturBayarDigital: boolean;
  bayarDigitalSetuju: boolean;
  fiturSelfService: boolean;
  fiturAntarJemput: boolean;
  syaratKetentuan: string[];
};

// Ketentuan biaya pembayaran digital (platform AkaLink).
const PG_ADMIN_PERSEN = 3.5;
const WITHDRAW_FEE = 5000;

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
  const [fiturMember, setFiturMember] = useState(initial.fiturMember);
  const [fiturPoin, setFiturPoin] = useState(initial.fiturPoin);
  const [fiturPromo, setFiturPromo] = useState(initial.fiturPromo);
  const [fiturBayarDigital, setFiturBayarDigital] = useState(
    initial.fiturBayarDigital,
  );
  const [setujuBayar, setSetujuBayar] = useState(initial.bayarDigitalSetuju);
  const [fiturSelfService, setFiturSelfService] = useState(
    initial.fiturSelfService,
  );
  const [fiturAntarJemput, setFiturAntarJemput] = useState(
    initial.fiturAntarJemput,
  );
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
    if (fiturBayarDigital && !initial.bayarDigitalSetuju && !setujuBayar) {
      setMsg({
        text: "Centang persetujuan syarat biaya sebelum mengaktifkan pembayaran digital.",
      });
      return;
    }
    start(async () => {
      const res = await updateSettings({
        nama,
        kota,
        telepon,
        alamat,
        poinRupiah: Number(poinRupiah) || 0,
        fiturMember,
        fiturPoin,
        fiturPromo,
        fiturBayarDigital,
        setujuBayarDigital: setujuBayar,
        fiturSelfService,
        fiturAntarJemput,
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

      {/* Fitur Loyalitas */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Fitur Loyalitas
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Aktifkan hanya bila laundry Anda memakainya. Saat nonaktif, menu &amp;
          kontrol terkait disembunyikan.
        </p>

        <div className="flex flex-col gap-3">
          <Toggle
            label="Membership"
            desc="Tingkatan member + diskon otomatis di POS."
            on={fiturMember}
            onChange={setFiturMember}
          />
          <Toggle
            label="Poin Loyalitas"
            desc="Konsumen dapat poin dari transaksi lunas & bisa ditukar."
            on={fiturPoin}
            onChange={setFiturPoin}
          />
          <Toggle
            label="Promo / Voucher"
            desc="Kode promo (diskon %/nominal) yang bisa dipakai di kasir."
            on={fiturPromo}
            onChange={setFiturPromo}
          />

          {fiturPoin && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
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
            </div>
          )}
        </div>
      </section>

      {/* Pembayaran Digital */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Pembayaran Digital
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Terima pembayaran konsumen lewat QRIS / e-wallet (via DOKU). Aktifkan
          hanya bila laundry Anda memakainya.
        </p>
        <Toggle
          label="Pembayaran Digital (QRIS / e-wallet)"
          desc="Tampilkan opsi bayar QRIS di kasir & nota konsumen."
          on={fiturBayarDigital}
          onChange={setFiturBayarDigital}
        />

        {fiturBayarDigital && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              Ketentuan Biaya (ditetapkan AkaLink)
            </p>
            <ul className="mb-3 flex flex-col gap-1 text-xs text-amber-900/90 dark:text-amber-200/90">
              <li>
                • <b>Biaya proses {PG_ADMIN_PERSEN}%</b> per transaksi, dipotong
                otomatis dari tiap pembayaran konsumen.
              </li>
              <li>
                • <b>Biaya transfer Rp
                {WITHDRAW_FEE.toLocaleString("id-ID")}</b> per penarikan dana ke
                rekening bank Anda.
              </li>
              <li>
                • Dana masuk ke <b>Saldo Pembayaran Digital</b> dan dapat ditarik
                (withdraw) ke rekening bank melalui menu <b>Dana Masuk</b>.
              </li>
            </ul>
            <p className="mb-3 text-xs text-amber-900/80 dark:text-amber-200/80">
              Contoh: konsumen bayar Rp100.000 → biaya {PG_ADMIN_PERSEN}% (Rp
              {Math.round((100000 * PG_ADMIN_PERSEN) / 100).toLocaleString(
                "id-ID",
              )}
              ) → masuk saldo Rp
              {(
                100000 - Math.round((100000 * PG_ADMIN_PERSEN) / 100)
              ).toLocaleString("id-ID")}
              . Biaya ini adalah beban laundry dan tercatat otomatis di
              pembukuan.
            </p>

            {initial.bayarDigitalSetuju ? (
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                ✓ Anda telah menyetujui ketentuan biaya ini.
              </p>
            ) : (
              <label className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={setujuBayar}
                  onChange={(e) => setSetujuBayar(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400"
                />
                <span>
                  Saya telah membaca dan <b>menyetujui</b> ketentuan biaya
                  pembayaran digital AkaLink di atas.
                </span>
              </label>
            )}
          </div>
        )}
      </section>

      {/* Self-Service (IoT) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Fitur Operasional
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Aktifkan fitur tambahan sesuai kebutuhan laundry Anda. Menu terkait
          muncul saat diaktifkan.
        </p>
        <div className="flex flex-col gap-3">
          <Toggle
            label="Self-Service Mesin"
            desc="Tampilkan menu Mesin untuk mengelola & menjalankan sesi."
            on={fiturSelfService}
            onChange={setFiturSelfService}
          />
          <Toggle
            label="Antar-Jemput"
            desc="Kelola penjemputan & pengantaran cucian (kurir, ongkir, status)."
            on={fiturAntarJemput}
            onChange={setFiturAntarJemput}
          />
        </div>
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

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          on ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
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
