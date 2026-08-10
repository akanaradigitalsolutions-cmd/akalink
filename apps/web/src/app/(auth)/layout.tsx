export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-300">
          AkaLink
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sistem Manajemen Laundry
        </p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}
