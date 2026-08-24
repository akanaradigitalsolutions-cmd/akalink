import { formatRupiah } from "@/lib/format";
import type { RevenueDay } from "@/lib/dashboard";

// Bagan batang omzet 7 hari — SVG murni (tanpa library, ringan, tanpa JS klien).
export function RevenueChart({ data }: { data: RevenueDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.omzet));
  const total = data.reduce((s, d) => s + d.omzet, 0);
  const todayIdx = data.length - 1;

  // Geometri
  const W = 700;
  const H = 180;
  const padB = 26; // ruang label bawah
  const padT = 8;
  const gap = 14;
  const n = data.length;
  const bw = (W - gap * (n - 1)) / n;
  const chartH = H - padB - padT;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Omzet 7 Hari Terakhir
          </h3>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(total)}
            <span className="ml-2 text-xs font-medium text-slate-400">total</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Hari ini</p>
          <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
            {formatRupiah(data[todayIdx]?.omzet ?? 0)}
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-44 w-full min-w-[520px]"
          role="img"
          aria-label="Bagan omzet 7 hari terakhir"
        >
          {data.map((d, i) => {
            const h = Math.max(2, (d.omzet / max) * chartH);
            const x = i * (bw + gap);
            const y = padT + (chartH - h);
            const isToday = i === todayIdx;
            return (
              <g key={d.date}>
                <title>{`${d.label} — ${formatRupiah(d.omzet)}`}</title>
                {/* jalur latar */}
                <rect
                  x={x}
                  y={padT}
                  width={bw}
                  height={chartH}
                  rx={6}
                  className="fill-slate-100 dark:fill-slate-800"
                />
                {/* batang nilai */}
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={6}
                  className={
                    isToday
                      ? "fill-brand-600 dark:fill-brand-500"
                      : "fill-brand-300 dark:fill-brand-700"
                  }
                />
                {/* label hari */}
                <text
                  x={x + bw / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className={
                    isToday
                      ? "fill-brand-700 text-[13px] font-semibold dark:fill-brand-300"
                      : "fill-slate-400 text-[13px]"
                  }
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
