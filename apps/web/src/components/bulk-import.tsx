"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importServices, type ImportResult } from "@/lib/services-actions";
import { importConsumers } from "@/lib/consumers-actions";

// Parser CSV sederhana: dukung tanda kutip, koma dalam kutip, dan baris baru.
function parseCsv(text: string): Record<string, string>[] {
  const norm = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < norm.length; i++) {
    const c = norm[i];
    if (inQuotes) {
      if (c === '"') {
        if (norm[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((c) => c.trim() === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (cells[idx] ?? "").trim()));
    out.push(obj);
  }
  return out;
}

function downloadCsv(filename: string, content: string) {
  // BOM agar Excel membaca UTF-8 dengan benar.
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Kind = "layanan" | "konsumen";

const CONFIG: Record<
  Kind,
  {
    filename: string;
    header: string;
    contoh: string[];
    petunjuk: string;
    run: (rows: Record<string, string>[]) => Promise<ImportResult>;
  }
> = {
  layanan: {
    filename: "template-layanan.csv",
    header: "nama,tipe_satuan,harga,estimasi_nilai,estimasi_satuan,kategori,express",
    contoh: [
      "Cuci Kering Lipat,kiloan,7000,1,hari,Cuci,tidak",
      "Cuci Setrika,kiloan,10000,2,hari,Cuci,ya",
      "Setrika Saja,kiloan,5000,6,jam,Setrika,tidak",
      "Bed Cover,satuan,25000,2,hari,Satuan,tidak",
    ],
    petunjuk:
      "tipe_satuan: kiloan/satuan/koin/luas · estimasi_satuan: jam/hari · express: ya/tidak",
    run: importServices,
  },
  konsumen: {
    filename: "template-konsumen.csv",
    header: "nama,hp,gender,email,instansi,tanggal_lahir,agama",
    contoh: [
      "Budi Santoso,081234567890,pria,budi@email.com,,,",
      "Siti Aminah,081298765432,wanita,,,,",
    ],
    petunjuk:
      "gender: pria/wanita · tanggal_lahir: YYYY-MM-DD · kolom selain nama boleh kosong",
    run: importConsumers,
  },
};

export function BulkImport({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function unduhTemplate() {
    downloadCsv(cfg.filename, [cfg.header, ...cfg.contoh].join("\n") + "\n");
  }

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr("");
    setResult(null);
    setRows(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setErr("File tidak berisi data.");
        return;
      }
      if (!("nama" in parsed[0])) {
        setErr('Kolom "nama" tidak ditemukan. Gunakan template yang disediakan.');
        return;
      }
      setRows(parsed);
    } catch {
      setErr("Gagal membaca file. Pastikan format CSV.");
    }
  }

  function impor() {
    if (!rows) return;
    setErr("");
    start(async () => {
      const r = await cfg.run(rows);
      setResult(r);
      if (r.error) setErr(r.error);
      if (r.ok && r.inserted > 0) router.refresh();
    });
  }

  function reset() {
    setRows(null);
    setResult(null);
    setErr("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        ⬆️ Impor CSV
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">
          Impor {kind === "layanan" ? "Layanan" : "Konsumen"} dari CSV
        </h3>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Tutup
        </button>
      </div>

      <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <li>
          1. Unduh template, isi di Excel/Spreadsheet, lalu simpan sebagai{" "}
          <strong>CSV</strong>.
          <button
            onClick={unduhTemplate}
            className="ml-2 rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300"
          >
            ⬇️ Unduh Template
          </button>
        </li>
        <li>2. Pilih file CSV yang sudah diisi:</li>
      </ol>

      <p className="mt-2 text-xs text-slate-400">{cfg.petunjuk}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={pilihFile}
        className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-300"
      />

      {rows && !result && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={impor}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Mengimpor…" : `Impor ${rows.length} baris`}
          </button>
          <span className="text-xs text-slate-400">{fileName}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
          <p className="font-semibold text-green-700 dark:text-green-400">
            ✓ {result.inserted} baris berhasil diimpor
            {result.failed > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}
                · {result.failed} gagal
              </span>
            )}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto text-xs text-amber-700 dark:text-amber-400">
              {result.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  Baris {e.baris}: {e.pesan}
                </li>
              ))}
              {result.errors.length > 20 && (
                <li>…dan {result.errors.length - 20} lainnya</li>
              )}
            </ul>
          )}
          <button
            onClick={reset}
            className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
          >
            Impor file lain
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
    </div>
  );
}
