"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/account-actions";

const inputBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function submit() {
    setMsg(undefined);
    if (!current) return setMsg({ text: "Isi password lama." });
    if (next.length < 8)
      return setMsg({ text: "Password baru minimal 8 karakter." });
    if (next !== confirm)
      return setMsg({ text: "Konfirmasi password tidak cocok." });
    start(async () => {
      const res = await changePassword({ current, next });
      if (res.ok) {
        setMsg({ ok: true, text: "Password berhasil diubah ✓" });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setMsg({ text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Password Lama">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className={`${inputBase} w-full`}
        />
      </Field>
      <Field label="Password Baru">
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="min. 8 karakter"
          className={`${inputBase} w-full`}
        />
      </Field>
      <Field label="Ulangi Password Baru">
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className={`${inputBase} w-full`}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Password"}
        </button>
        {msg && (
          <span
            className={
              msg.ok ? "text-sm text-green-600" : "text-sm text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
