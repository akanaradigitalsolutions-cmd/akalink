import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getSessionUser,
  getTenantIdFromUser,
  getRoleFromUser,
} from "@/lib/auth";
import { getEmployeeGajiDetail } from "@/lib/salary";
import { GajiDetail } from "./gaji-detail";

export const metadata: Metadata = { title: "Detail Gaji Karyawan — AkaLink" };

export default async function GajiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) redirect("/masuk");
  if (getRoleFromUser(user) !== "owner") redirect("/dashboard");

  const { id } = await params;
  const detail = await getEmployeeGajiDetail(tenantId, id);
  if (!detail) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/gaji"
          className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ← Gaji Karyawan
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          {detail.employee.nama}
        </h1>
        <p className="text-sm capitalize text-slate-500 dark:text-slate-400">
          {detail.employee.role} · Kelola kasbon &amp; cicilan
        </p>
      </div>

      <GajiDetail detail={detail} />
    </div>
  );
}
