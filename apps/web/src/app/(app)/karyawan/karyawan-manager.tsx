"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEmployee,
  setEmployeeStatus,
  deleteEmployee,
} from "@/lib/employees-actions";
import { IconPlus, IconTrash } from "@/components/icons";

type Emp = {
  id: string;
  nama: string;
  email: string | null;
  role: string;
  status: string;
  isSelf: boolean;
};

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function KaryawanManager({ daftar }: { daftar: Emp[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");

  function submit() {
    setMsg(undefined);
    if (nama.trim().length < 2) return setMsg({ text: "Nama minimal 2 huruf." });
    if (!email.trim()) return setMsg({ text: "Email wajib diisi." });
    if (password.length < 8)
      return setMsg({ text: "Password minimal 8 karakter." });
    start(async () => {
      const res = await createEmployee({ nama, email, password, role });
      if (res.ok) {
        setMsg({ ok: true, text: "Akun karyawan dibuat ✓" });
        setNama("");
        setEmail("");
        setPassword("");
        setRole("kasir");
        setOpen(false);
        router.refresh();
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  function toggleStatus(e: Emp) {
    const next = e.status === "active" ? "inactive" : "active";
    start(async () => {
      const res = await setEmployeeStatus({ id: e.id, status: next });
      if (res.ok) router.refresh();
      else setMsg({ text: res.error });
    });
  }

  function hapus(e: Emp) {
    if (
      !window.confirm(
        `Hapus akun ${e.nama}? Login karyawan ini akan dinonaktifkan permanen.`,
      )
    )
      return;
    start(async () => {
      const res = await deleteEmployee({ id: e.id });
      if (res.ok) router.refresh();
      else setMsg({ text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tombol / form tambah */}
      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setMsg(undefined);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Karyawan
        </button>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Karyawan Baru
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama">
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="mis. Sari"
                className={`${inputBase} w-full`}
              />
            </Field>
            <Field label="Peran">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`${inputBase} w-full`}
              >
                <option value="kasir">Kasir (akses terbatas)</option>
                <option value="owner">Pemilik (akses penuh)</option>
              </select>
            </Field>
            <Field label="Email (untuk login)">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                placeholder="kasir@contoh.com"
                className={`${inputBase} w-full`}
              />
            </Field>
            <Field label="Password (min. 8 karakter)">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="text"
                placeholder="beri password awal"
                className={`${inputBase} w-full`}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Bagikan email &amp; password ini ke karyawan. Mereka bisa mengganti
            password nanti. Peran <b>Kasir</b> tidak melihat menu Keuangan,
            Laporan, Pengaturan, maupun Karyawan.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Buat Akun"}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
          </div>
        </section>
      )}

      {msg && (
        <p className={msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}

      {/* Daftar karyawan */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {daftar.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {e.nama}
                  </p>
                  <RoleBadge role={e.role} />
                  {e.status !== "active" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                      Nonaktif
                    </span>
                  )}
                  {e.isSelf && (
                    <span className="text-[10px] text-slate-400">(Anda)</span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {e.email ?? "—"}
                </p>
              </div>

              {e.role !== "owner" && !e.isSelf && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(e)}
                    disabled={pending}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {e.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => hapus(e)}
                    disabled={pending}
                    aria-label="Hapus"
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/40"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const owner = role === "owner";
  return (
    <span
      className={
        owner
          ? "rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }
    >
      {owner ? "Pemilik" : "Kasir"}
    </span>
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
