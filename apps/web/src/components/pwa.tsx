"use client";

import { useEffect, useState } from "react";

// Tipe minimal untuk event beforeinstallprompt (belum standar di TS DOM).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "aka-install-dismissed";

export function Pwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  // Daftarkan service worker.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Tangkap prompt pemasangan (Android/Chrome).
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* abaikan */
    }
    if (dismissed) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    function onInstalled() {
      setShow(false);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function pasang() {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(() => {
      setShow(false);
      setDeferred(null);
    });
  }

  function tutup() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* abaikan */
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg aka-fade-in dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
        A
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Pasang AkaLink
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          Akses cepat dari layar utama, seperti aplikasi.
        </p>
      </div>
      <button
        onClick={tutup}
        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        Nanti
      </button>
      <button
        onClick={pasang}
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
      >
        Pasang
      </button>
    </div>
  );
}
