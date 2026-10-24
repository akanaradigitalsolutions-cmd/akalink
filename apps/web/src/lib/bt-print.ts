// Cetak langsung ke printer termal Bluetooth (BLE) via Web Bluetooth API.
// Didesain untuk printer 58mm generik seperti iWare RPP02N / GOOJPRT / MTP.
//
// Catatan penting kompatibilitas:
//  - Web Bluetooth hanya mendukung Bluetooth LE (GATT), bukan Bluetooth Classic (SPP).
//  - RPP02N umumnya mengekspos salah satu service serial di bawah ini.
//  - Wajib HTTPS + dipicu oleh ketukan tombol (user gesture).

// Service GATT yang umum pada printer termal murah (urutan dicoba).
const KNOWN_SERVICES: BluetoothServiceUUID[] = [
  0x18f0, // 000018f0 — paling umum (RPP02N/GOOJPRT/MTP), char tulis 00002af1
  0xff00, // 0000ff00 — char tulis 0000ff02
  0xffe0, // 0000ffe0 — char tulis 0000ffe1
  0xfff0, // 0000fff0
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC/Microchip transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // beberapa modul HM
];

// Nama Bluetooth yang umum (RPP02N muncul sebagai "RPP02N").
const NAME_PREFIXES = ["RPP", "MTP", "PT-", "MPT", "BlueTooth Printer", "Printer"];

export type BtPrinter = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
};

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { bluetooth?: unknown }).bluetooth !==
      "undefined"
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minta pengguna memilih printer, lalu sambungkan & cari karakteristik tulis. */
export async function connectPrinter(): Promise<BtPrinter> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Perangkat/browser ini tidak mendukung Bluetooth web. Gunakan Chrome di Android.",
    );
  }
  const bt = navigator.bluetooth;

  const device = await bt.requestDevice({
    filters: NAME_PREFIXES.map((namePrefix) => ({ namePrefix })),
    optionalServices: KNOWN_SERVICES,
  });

  const server = await device.gatt!.connect();

  // Cari service + karakteristik yang bisa ditulis.
  let characteristic: BluetoothRemoteGATTCharacteristic | undefined;
  for (const svc of KNOWN_SERVICES) {
    try {
      const service = await server.getPrimaryService(svc);
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          characteristic = c;
          break;
        }
      }
      if (characteristic) break;
    } catch {
      // service tidak ada di printer ini — coba berikutnya.
    }
  }

  // Fallback: telusuri semua primary service bila daftar di atas tak cocok.
  if (!characteristic) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            characteristic = c;
            break;
          }
        }
        if (characteristic) break;
      }
    } catch {
      // abaikan
    }
  }

  if (!characteristic) {
    server.disconnect();
    throw new Error(
      "Printer tersambung tapi tidak ditemukan jalur cetak. Pastikan printer dalam mode Bluetooth (bukan hanya terpasang di pengaturan HP).",
    );
  }

  return { device, characteristic };
}

/** Kirim byte ESC/POS ke printer secara bertahap (BLE butuh potongan kecil). */
export async function writeToPrinter(
  printer: BtPrinter,
  bytes: Uint8Array,
  chunkSize = 180,
): Promise<void> {
  const ch = printer.characteristic;
  const useNoResponse = ch.properties.writeWithoutResponse;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    if (useNoResponse && ch.writeValueWithoutResponse) {
      await ch.writeValueWithoutResponse(chunk);
    } else {
      await ch.writeValue(chunk);
    }
    // jeda kecil agar buffer printer tidak luber.
    await sleep(20);
  }
}

/** Alur lengkap: pilih printer → cetak → putuskan. */
export async function printBytes(bytes: Uint8Array): Promise<void> {
  const printer = await connectPrinter();
  try {
    await writeToPrinter(printer, bytes);
    // beri jeda agar seluruh data terkirim sebelum putus.
    await sleep(400);
  } finally {
    try {
      printer.device.gatt?.disconnect();
    } catch {
      // abaikan
    }
  }
}
