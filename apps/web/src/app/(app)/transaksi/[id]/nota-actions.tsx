"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      🖨️ Cetak Nota
    </button>
  );
}

export function WhatsappButton({
  hp,
  message,
}: {
  hp?: string | null;
  message: string;
}) {
  if (!hp) return null;
  const url = `https://wa.me/${hp}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
    >
      💬 Kirim WhatsApp
    </a>
  );
}
