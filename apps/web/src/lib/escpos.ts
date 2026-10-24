// ESC/POS builder untuk printer struk termal 58mm (mis. iWare RPP02N).
// Menghasilkan byte mentah yang dikirim langsung ke printer via Web Bluetooth.
// 58mm Font A = 32 karakter per baris (384 dot / 12).

export type NotaPrintData = {
  namaToko: string;
  alamat?: string;
  kotaTelp?: string;
  tipe: string;
  noNota: string;
  pelanggan: string;
  hp?: string;
  terima: string;
  selesai: string;
  items: {
    nama: string;
    qtyLabel: string;
    harga: string;
    subtotal: string;
    selesai: boolean;
  }[];
  subtotal: string;
  express?: string;
  diskon?: string;
  grandTotal: string;
  sisa: string;
  status: string;
  link: string;
  sk: string[];
};

export type LabelPrintData = {
  namaToko: string;
  noNota: string;
  pelanggan: string;
  totalUnit: string;
  grandTotal: string;
  masuk: string;
  selesai: string;
  items: { label: string; subtotal: string }[];
  link: string;
};

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Ganti karakter non-ASCII (emoji, —, ·, ✓, −) agar tidak jadi sampah di printer.
function sanitize(s: string): string {
  return (s || "")
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "*")
    .replace(/✓/g, "v")
    .replace(/−/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/🙏|🖨️|🏷️/g, "")
    // buang sisa karakter di luar ASCII cetak
    .replace(/[^\x20-\x7E]/g, "");
}

class EscPos {
  private buf: number[] = [];
  readonly cols: number;

  constructor(cols = 32) {
    this.cols = cols;
    this.buf.push(ESC, 0x40); // init
  }

  raw(...b: number[]) {
    this.buf.push(...b);
    return this;
  }

  text(s: string) {
    const clean = sanitize(s);
    for (let i = 0; i < clean.length; i++) this.buf.push(clean.charCodeAt(i));
    return this;
  }

  lf(n = 1) {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  align(a: "left" | "center" | "right") {
    this.buf.push(ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0);
    return this;
  }

  bold(on: boolean) {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  // GS ! n — ukuran ganda (lebar+tinggi) bila big=true.
  size(big: boolean) {
    this.buf.push(GS, 0x21, big ? 0x11 : 0x00);
    return this;
  }

  line(s = "") {
    this.text(s).lf();
    return this;
  }

  divider() {
    return this.line("-".repeat(this.cols));
  }

  // Baris kiri-kanan: label di kiri, nilai rata kanan, dibungkus bila kepanjangan.
  kv(left: string, right: string) {
    const l = sanitize(left);
    const r = sanitize(right);
    const space = this.cols - l.length - r.length;
    if (space >= 1) {
      this.line(l + " ".repeat(space) + r);
    } else {
      // kepanjangan: label di baris sendiri, nilai rata kanan di bawahnya.
      this.wrap(l);
      this.line(" ".repeat(Math.max(0, this.cols - r.length)) + r);
    }
    return this;
  }

  // Bungkus teks panjang ke beberapa baris selebar kolom.
  wrap(s: string, indent = 0) {
    const clean = sanitize(s);
    const width = this.cols - indent;
    const pad = " ".repeat(indent);
    const words = clean.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if (!cur.length) cur = w;
      else if ((cur + " " + w).length <= width) cur += " " + w;
      else {
        this.line(pad + cur);
        cur = w;
      }
      // kata tunggal lebih panjang dari lebar → potong keras.
      while (cur.length > width) {
        this.line(pad + cur.slice(0, width));
        cur = cur.slice(width);
      }
    }
    if (cur.length) this.line(pad + cur);
    return this;
  }

  // Cetak QR code (QR model 2) — umum didukung RPP02N/GOOJPRT.
  qr(data: string, moduleSize = 5) {
    const d = sanitize(data);
    const store = d.length + 3;
    const pL = store & 0xff;
    const pH = (store >> 8) & 0xff;
    this.align("center");
    // pilih model 2
    this.raw(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // ukuran modul
    this.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);
    // koreksi error (M = 49)
    this.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // simpan data
    this.raw(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < d.length; i++) this.buf.push(d.charCodeAt(i));
    // cetak
    this.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

export function buildNotaEscPos(d: NotaPrintData, cols = 32): Uint8Array {
  const p = new EscPos(cols);

  // Header
  p.align("center").bold(true).size(true).line(d.namaToko).size(false);
  p.bold(false);
  if (d.alamat) p.wrap(d.alamat);
  if (d.kotaTelp) p.wrap(d.kotaTelp);
  p.line(`Faktur ${d.tipe}`);
  p.divider();

  // Info
  p.align("left");
  p.kv("No Nota", d.noNota);
  p.kv("Pelanggan", d.pelanggan);
  if (d.hp) p.kv("No. HP", d.hp);
  p.kv("Terima", d.terima);
  p.kv("Selesai", d.selesai);
  p.divider();

  // Item
  p.bold(true).line("DETAIL PESANAN").bold(false);
  for (const it of d.items) {
    p.wrap(`${it.selesai ? "v " : "* "}${it.nama} (${it.qtyLabel})`);
    p.kv(`  @ ${it.harga}`, it.subtotal);
  }
  p.divider();

  // Biaya
  p.kv("Subtotal", d.subtotal);
  if (d.express) p.kv("Express", `+${d.express}`);
  if (d.diskon) p.kv("Diskon", `-${d.diskon}`);
  p.bold(true).size(true).kv("TOTAL", d.grandTotal).size(false).bold(false);
  p.kv("Sisa Tagihan", d.sisa);
  p.kv("Status", d.status);
  p.divider();

  // QR + link
  p.qr(d.link, 5);
  p.align("center").line("Scan untuk cek status");
  p.wrap(d.link);
  p.divider();

  // S&K
  if (d.sk.length) {
    p.align("left").bold(true).line("Syarat & Ketentuan").bold(false);
    d.sk.forEach((s, i) => p.wrap(`${i + 1}. ${s}`));
    p.divider();
  }

  p.align("center").line("Terima kasih").lf(1);
  p.align("left");
  p.lf(3); // ruang sobek
  return p.bytes();
}

export function buildLabelEscPos(d: LabelPrintData, cols = 32): Uint8Array {
  const p = new EscPos(cols);

  // Header toko + nomor nota
  p.align("center").bold(true).line(d.namaToko).line(d.noNota).bold(false);
  p.divider();

  // Nama pelanggan besar
  p.align("left").bold(true).size(true).line(d.pelanggan).size(false);
  p.kv(d.totalUnit, d.grandTotal);
  p.bold(false);
  p.line(`Masuk  : ${d.masuk}`);
  p.line(`Selesai: ${d.selesai}`);
  p.divider();

  // Item
  for (const it of d.items) {
    p.kv(it.label, it.subtotal);
  }
  p.divider();

  // QR
  p.qr(d.link, 5);
  p.align("center").line("Scan untuk cek status");
  p.align("left").lf(3);
  return p.bytes();
}
