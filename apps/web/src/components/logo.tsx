/**
 * Logo AkaLink dalam bentuk SVG (tajam di segala ukuran, ringan, adaptif
 * light/dark). Terinspirasi logo Aka Express Laundry: pusaran biru air +
 * monogram "A" + tetesan air.
 */

export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="AkaLink"
    >
      <defs>
        <linearGradient
          id="akaGrad"
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {/* Badge */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#akaGrad)" />
      {/* Pusaran air */}
      <path
        d="M12.5 31.5 A13 13 0 1 1 35 30"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Huruf A */}
      <path
        d="M16.5 34.5 L24 13.5 L31.5 34.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 27.5 H28"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* Tetesan air */}
      <path
        d="M33 9 C35.4 12 36 13.6 36 15 A3 3 0 1 1 30 15 C30 13.6 30.6 12 33 9 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function Logo({
  size = 40,
  showText = true,
  subtitle = "Sistem Manajemen Laundry",
  className,
}: {
  size?: number;
  showText?: boolean;
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark size={size} />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Aka<span className="text-brand-600 dark:text-brand-400">Link</span>
          </span>
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
