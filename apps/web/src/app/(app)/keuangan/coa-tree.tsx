"use client";

import { useState } from "react";

type Acc = {
  id: string;
  kode: string;
  nama: string;
  tipe: string;
  saldoNormal: string;
  parentId: string | null;
  isKas: boolean;
};

const TIPE_LABEL: Record<string, string> = {
  aset: "Aset",
  kewajiban: "Kewajiban",
  modal: "Modal",
  pendapatan: "Pendapatan",
  beban: "Beban",
};
const TIPE_COLOR: Record<string, string> = {
  aset: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  kewajiban: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  modal: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  pendapatan: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  beban: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function CoaTree({ accounts }: { accounts: Acc[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const childrenOf = new Map<string | null, Acc[]>();
  for (const a of accounts) {
    const key = a.parentId;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(a);
  }
  const idSet = new Set(accounts.map((a) => a.id));
  const roots = accounts.filter((a) => !a.parentId || !idSet.has(a.parentId));

  function toggle(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function renderNode(node: Acc, depth: number): React.ReactNode {
    const kids = childrenOf.get(node.id) ?? [];
    const hasKids = kids.length > 0;
    const isCollapsed = collapsed.has(node.id);

    return (
      <div key={node.id}>
        <div className="grid grid-cols-1 gap-1 border-t border-slate-100 px-5 py-3 first:border-t-0 dark:border-slate-800 sm:grid-cols-12 sm:items-center sm:gap-4">
          <div className="col-span-2 font-mono text-sm text-slate-500">
            {node.kode}
          </div>
          <div
            className="col-span-6 flex items-center"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {hasKids ? (
              <button
                onClick={() => toggle(node.id)}
                aria-label={isCollapsed ? "Buka" : "Tutup"}
                className="mr-1.5 flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ) : (
              <span className="mr-1.5 inline-block h-5 w-5" />
            )}
            <button
              onClick={hasKids ? () => toggle(node.id) : undefined}
              className={
                depth === 0
                  ? "text-left font-bold text-slate-900 dark:text-white"
                  : "text-left text-slate-700 dark:text-slate-200"
              }
            >
              {node.nama}
            </button>
            {node.isKas && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                kas
              </span>
            )}
          </div>
          <div className="col-span-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPE_COLOR[node.tipe]}`}
            >
              {TIPE_LABEL[node.tipe]}
            </span>
          </div>
          <div className="col-span-2 text-left text-sm capitalize text-slate-500 sm:text-right">
            {node.saldoNormal}
          </div>
        </div>
        {hasKids && !isCollapsed && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  }

  return <div>{roots.map((r) => renderNode(r, 0))}</div>;
}
