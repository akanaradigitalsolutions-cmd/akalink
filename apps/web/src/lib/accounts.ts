"use client";

// Daftar akun yang pernah login di perangkat ini (hanya identifier + nama,
// TIDAK pernah menyimpan password). Dipakai untuk fitur "Ganti Pengguna".

export type SavedAccount = { id: string; nama: string; at: number };

const KEY = "akalink_accounts";
const MAX = 6;

export function getAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return (arr as SavedAccount[])
      .filter((a) => a && typeof a.id === "string" && a.id.length > 0)
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  } catch {
    return [];
  }
}

export function saveAccount(id: string, nama: string): void {
  try {
    const clean = (id ?? "").trim();
    if (!clean) return;
    const list = getAccounts().filter(
      (a) => a.id.toLowerCase() !== clean.toLowerCase(),
    );
    list.unshift({ id: clean, nama: (nama ?? "").trim() || clean, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage tidak tersedia — abaikan.
  }
}

export function removeAccount(id: string): void {
  try {
    const list = getAccounts().filter(
      (a) => a.id.toLowerCase() !== (id ?? "").toLowerCase(),
    );
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // abaikan
  }
}
