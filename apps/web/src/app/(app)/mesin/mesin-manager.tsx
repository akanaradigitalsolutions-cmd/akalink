"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  createMachine,
  updateMachine,
  deleteMachine,
  regenerateToken,
  startSession,
  stopSession,
} from "@/lib/machines-actions";

type Machine = {
  id: string;
  nama: string;
  tipe: "mesin_cuci" | "pengering";
  kapasitasKg: string | null;
  hargaSesi: number;
  durasiMenit: number;
  status: "idle" | "running" | "maintenance";
  online: boolean;
  aktif: boolean;
  deviceToken: string;
  sesi?: {
    id: string;
    konsumen: string | null;
    selesaiEstimasi: string;
    biaya: number;
  } | null;
};

type SessionRow = {
  id: string;
  mesin: string | null;
  konsumen: string | null;
  mulai: string;
  durasiMenit: number;
  biaya: number;
  metodeBayar: string;
  status: "running" | "selesai" | "batal";
};

const TIPE_LABEL = { mesin_cuci: "Mesin Cuci", pengering: "Pengering" } as const;

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MesinManager({
  machines,
  sessions,
  konsumen,
  isOwner,
  deviceBase,
}: {
  machines: Machine[];
  sessions: SessionRow[];
  konsumen: { id: string; nama: string }[];
  isOwner: boolean;
  deviceBase: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [addOpen, setAddOpen] = useState(false);

  // Jam berdetak untuk hitung mundur.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {isOwner && (
        <div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {addOpen ? "− Tutup" : "+ Tambah Mesin"}
          </button>
          {addOpen && (
            <MachineForm
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {machines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada mesin.{" "}
          {isOwner ? "Tambah mesin untuk mulai." : "Hubungi pemilik."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {machines.map((m) => (
            <MachineCard
              key={m.id}
              m={m}
              now={now}
              konsumen={konsumen}
              isOwner={isOwner}
              deviceBase={deviceBase}
            />
          ))}
        </div>
      )}

      {/* Riwayat sesi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Riwayat Sesi
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada sesi.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {s.mesin ?? "—"}{" "}
                    <span className="text-slate-400">
                      · {s.konsumen ?? "Umum"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(s.mulai)} · {s.durasiMenit} mnt ·{" "}
                    {s.metodeBayar}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatRupiah(s.biaya)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.status === "running" ? "Berjalan" : s.status === "selesai" ? "Selesai" : "Batal"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MachineCard({
  m,
  now,
  konsumen,
  isOwner,
  deviceBase,
}: {
  m: Machine;
  now: number;
  konsumen: { id: string; nama: string }[];
  isOwner: boolean;
  deviceBase: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<"start" | "edit" | "device" | null>(null);
  const [durasi, setDurasi] = useState(String(m.durasiMenit));
  const [consumerId, setConsumerId] = useState("");
  const [msg, setMsg] = useState<string>();

  const remaining =
    m.sesi && m.status === "running"
      ? Math.max(0, Math.floor((new Date(m.sesi.selesaiEstimasi).getTime() - now) / 1000))
      : 0;

  const badge =
    m.status === "running"
      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      : m.status === "maintenance"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const badgeLabel =
    m.status === "running" ? "Berjalan" : m.status === "maintenance" ? "Perawatan" : "Siap";

  function doStart() {
    setMsg(undefined);
    start(async () => {
      const res = await startSession({
        machineId: m.id,
        durasiMenit: Number(durasi) || m.durasiMenit,
        consumerId: consumerId || null,
        metodeBayar: "tunai",
      });
      if (res.ok) {
        setPanel(null);
        router.refresh();
      } else setMsg(res.error);
    });
  }
  function doStop() {
    start(async () => {
      await stopSession(m.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">
            {m.nama}
          </p>
          <p className="text-xs text-slate-400">
            {TIPE_LABEL[m.tipe]}
            {m.kapasitasKg ? ` · ${m.kapasitasKg} kg` : ""} ·{" "}
            {formatRupiah(m.hargaSesi)}/sesi · {m.durasiMenit} mnt
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
            {badgeLabel}
          </span>
          <span
            className={`text-[10px] ${m.online ? "text-green-600" : "text-slate-400"}`}
            title="Status perangkat IoT"
          >
            ● {m.online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {m.status === "running" && m.sesi && (
        <div className="mt-3 rounded-xl bg-green-50 p-3 text-center dark:bg-green-950/30">
          <p className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-300">
            {mmss(remaining)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            sisa waktu · {m.sesi.konsumen ?? "Umum"}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {m.status === "running" ? (
          <button
            onClick={doStop}
            disabled={pending}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/40"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => setPanel(panel === "start" ? null : "start")}
            disabled={m.status === "maintenance" || !m.aktif}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Mulai Sesi
          </button>
        )}
        {isOwner && (
          <>
            <button
              onClick={() => setPanel(panel === "edit" ? null : "edit")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Edit
            </button>
            <button
              onClick={() => setPanel(panel === "device" ? null : "device")}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Perangkat
            </button>
          </>
        )}
      </div>

      {panel === "start" && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <label className="text-xs text-slate-500">
            Durasi (menit)
            <input
              value={durasi}
              onChange={(e) => setDurasi(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-xs text-slate-500">
            Konsumen (opsional)
            <select
              value={consumerId}
              onChange={(e) => setConsumerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Umum</option>
              {konsumen.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">
            Biaya {formatRupiah(m.hargaSesi)} · bayar tunai (prabayar).
          </p>
          <button
            onClick={doStart}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Memulai…" : "Mulai & Bayar Tunai"}
          </button>
          {msg && <p className="text-xs text-red-600">{msg}</p>}
        </div>
      )}

      {panel === "edit" && isOwner && (
        <MachineForm machine={m} onDone={() => { setPanel(null); router.refresh(); }} />
      )}

      {panel === "device" && isOwner && (
        <DevicePanel m={m} deviceBase={deviceBase} />
      )}
    </div>
  );
}

function DevicePanel({ m, deviceBase }: { m: Machine; deviceBase: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const url = `${deviceBase}/${m.deviceToken}`;
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
      <p className="text-slate-500 dark:text-slate-400">
        Endpoint perangkat (relay polling GET tiap ~5 detik):
      </p>
      <code className="block overflow-x-auto rounded-lg bg-white p-2 text-[11px] text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {url}
      </code>
      <p className="text-slate-400">
        Balasan: <code>{`{ on, remaining_sec }`}</code> — perangkat menyalakan
        relay saat <code>on=true</code>.
      </p>
      <button
        onClick={() =>
          start(async () => {
            await regenerateToken(m.id);
            router.refresh();
          })
        }
        disabled={pending}
        className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {pending ? "…" : "Ganti Token"}
      </button>
    </div>
  );
}

function MachineForm({
  machine,
  onDone,
}: {
  machine?: Machine;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [nama, setNama] = useState(machine?.nama ?? "");
  const [tipe, setTipe] = useState<"mesin_cuci" | "pengering">(
    machine?.tipe ?? "mesin_cuci",
  );
  const [kapasitas, setKapasitas] = useState(machine?.kapasitasKg ?? "");
  const [harga, setHarga] = useState(String(machine?.hargaSesi ?? ""));
  const [durasi, setDurasi] = useState(String(machine?.durasiMenit ?? "40"));
  const [maintenance, setMaintenance] = useState(machine?.status === "maintenance");
  const [msg, setMsg] = useState<string>();

  function simpan() {
    setMsg(undefined);
    if (nama.trim().length < 1) {
      setMsg("Nama wajib diisi.");
      return;
    }
    start(async () => {
      const payload = {
        nama,
        tipe,
        kapasitasKg: kapasitas || undefined,
        hargaSesi: Number(harga) || 0,
        durasiMenit: Number(durasi) || 40,
      };
      const res = machine
        ? await updateMachine({
            id: machine.id,
            ...payload,
            status: maintenance ? "maintenance" : "idle",
          })
        : await createMachine(payload);
      if (res.ok) onDone();
      else setMsg(res.error);
    });
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama mesin (mis. Cuci 1)"
        className={input}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={tipe}
          onChange={(e) => setTipe(e.target.value as "mesin_cuci" | "pengering")}
          className={input}
        >
          <option value="mesin_cuci">Mesin Cuci</option>
          <option value="pengering">Pengering</option>
        </select>
        <input
          value={kapasitas}
          onChange={(e) => setKapasitas(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Kapasitas (kg)"
          inputMode="decimal"
          className={input}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={harga}
          onChange={(e) => setHarga(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Harga/sesi (Rp)"
          inputMode="numeric"
          className={input}
        />
        <input
          value={durasi}
          onChange={(e) => setDurasi(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Durasi (menit)"
          inputMode="numeric"
          className={input}
        />
      </div>
      {machine && (
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={maintenance}
            onChange={(e) => setMaintenance(e.target.checked)}
          />
          Dalam perawatan (tidak bisa dipakai)
        </label>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={simpan}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {machine && (
          <DeleteButton id={machine.id} onDone={onDone} />
        )}
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>
    </div>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <button
        onClick={() => setConfirm(true)}
        className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
      >
        Hapus
      </button>
    );
  return (
    <button
      onClick={() =>
        start(async () => {
          await deleteMachine(id);
          onDone();
        })
      }
      disabled={pending}
      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "…" : "Yakin hapus?"}
    </button>
  );
}
