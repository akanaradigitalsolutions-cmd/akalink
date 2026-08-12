import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Atur Ulang Password — AkaLink" };

export default async function AturUlangPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Tautan tidak valid
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sesi pemulihan tidak ditemukan atau sudah kedaluwarsa. Silakan minta
            tautan reset yang baru.
          </p>
        </div>
        <Link
          href="/lupa-password"
          className="text-center text-sm font-medium text-brand-600 hover:underline"
        >
          Minta tautan baru
        </Link>
      </div>
    );
  }

  return <ResetForm email={user.email ?? ""} />;
}
