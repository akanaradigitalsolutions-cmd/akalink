import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getEmployees } from "@/lib/employees";
import { KaryawanManager } from "./karyawan-manager";

export const metadata: Metadata = { title: "Karyawan — AkaLink" };

export default async function KaryawanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  // Pengaman ganda selain middleware.
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const daftar = await getEmployees(tenantId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Karyawan &amp; Hak Akses
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Buat akun login untuk kasir. Kasir hanya bisa mengakses Transaksi
          &amp; Konsumen — menu Keuangan, Laporan, Pengaturan, dan Karyawan
          khusus pemilik.
        </p>
      </div>

      <KaryawanManager
        daftar={daftar.map((e) => ({
          id: e.id,
          nama: e.nama,
          email:
            e.email ?? (e.authUserId === user.id ? (user.email ?? null) : null),
          role: e.role,
          status: e.status,
          isSelf: e.authUserId === user.id,
        }))}
      />
    </div>
  );
}
