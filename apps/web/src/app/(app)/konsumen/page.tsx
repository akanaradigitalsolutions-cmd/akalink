import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getTenantIdFromUser } from "@/lib/auth";
import { searchConsumers, countConsumers } from "@/lib/consumers";
import { deleteConsumer } from "@/lib/consumers-actions";
import { formatHp } from "@/lib/format";
import { ConsumerForm } from "./consumer-form";
import { IconUsers, IconTrash } from "@/components/icons";

export const metadata: Metadata = {
  title: "Konsumen — AkaLink",
};

export default async function KonsumenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  const tenantId = getTenantIdFromUser(user);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const total = tenantId ? await countConsumers(tenantId) : 0;
  const results =
    tenantId && query ? await searchConsumers(tenantId, query) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Konsumen
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} konsumen terdaftar. Cari untuk menemukan data (demi privasi,
            daftar tidak ditampilkan penuh).
          </p>
        </div>
        <ConsumerForm />
      </header>

      {/* Pencarian */}
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cari nama atau nomor HP…"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Cari
        </button>
      </form>

      {/* Hasil */}
      {!query ? (
        <EmptyHint total={total} />
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Tidak ada konsumen yang cocok dengan “{query}”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    {c.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {c.nama}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatHp(c.hp)}
                      {c.gender ? ` · ${c.gender}` : ""}
                    </p>
                  </div>
                </div>
                <form action={deleteConsumer}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    aria-label="Hapus"
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
        <IconUsers className="h-6 w-6" />
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-200">
        {total === 0 ? "Belum ada konsumen" : "Cari konsumen"}
      </p>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {total === 0
          ? "Klik Tambah Konsumen untuk mendaftarkan konsumen pertama Anda."
          : "Ketik nama atau nomor HP di kotak pencarian di atas untuk menemukan konsumen."}
      </p>
    </div>
  );
}
