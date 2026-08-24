import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { ChangePasswordForm } from "./change-password-form";
import { ProfilForm } from "./profil-form";

export const metadata: Metadata = { title: "Akun Saya — AkaLink" };

export default async function AkunPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);

  let nama = user.email ?? "Pengguna";
  try {
    if (tenantId) {
      const { me } = await getTenantContext(user.id, tenantId);
      nama = me?.nama ?? nama;
    }
  } catch {
    // biarkan default
  }
  const role = getRoleFromUser(user) === "owner" ? "Pemilik" : "Kasir";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Akun Saya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Informasi akun dan keamanan.
        </p>
      </div>

      {/* Info akun */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <dl className="mb-5 grid gap-4 sm:grid-cols-2">
          <Info label="Email" value={user.email ?? "—"} />
          <Info label="Peran" value={role} />
        </dl>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Ubah Profil
          </h2>
          <ProfilForm nama={nama} />
        </div>
      </section>

      {/* Ganti password */}
      <section
        id="password"
        className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
          Ganti Password
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Masukkan password lama untuk konfirmasi, lalu password baru minimal 8
          karakter.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}
