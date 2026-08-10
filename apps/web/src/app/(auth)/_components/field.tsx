/**
 * Komponen input berlabel sederhana + pesan error per-field.
 */
export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
