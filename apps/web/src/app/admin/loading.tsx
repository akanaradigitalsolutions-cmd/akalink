export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="aka-skeleton h-6 w-56" />
        <div className="aka-skeleton h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="aka-skeleton h-3 w-24" />
            <div className="aka-skeleton mt-3 h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="aka-skeleton mb-4 h-4 w-32" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aka-skeleton h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
