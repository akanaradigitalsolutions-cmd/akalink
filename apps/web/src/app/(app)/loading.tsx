/**
 * Kerangka (skeleton) saat berpindah halaman di area aplikasi. Muncul instan
 * lewat Suspense sementara data halaman tujuan diambil di server, sehingga
 * navigasi terasa cepat & mulus. Kerangka sidebar/topbar tetap dari layout.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Judul */}
      <div className="flex flex-col gap-2">
        <div className="aka-skeleton h-6 w-48" />
        <div className="aka-skeleton h-4 w-72 max-w-full" />
      </div>

      {/* Baris kartu ringkas */}
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="aka-skeleton h-3 w-20" />
            <div className="aka-skeleton mt-3 h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Daftar */}
      <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="aka-skeleton mb-4 h-4 w-32" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="aka-skeleton h-4 w-2/3" />
                <div className="aka-skeleton mt-2 h-3 w-1/3" />
              </div>
              <div className="aka-skeleton h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
