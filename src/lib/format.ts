/* ---------- Formatting & date helpers ---------- */

export function TODAY() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function rupiah(value: number, opts: { decimals?: boolean } = {}) {
  const neg = value < 0;
  const abs = Math.abs(value);
  const s = abs.toLocaleString("id-ID", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  });
  return `${neg ? "-" : ""}Rp ${s}`;
}

export function rupiahShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1).replace(".", ",")} Jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
  return `${sign}Rp ${abs}`;
}

/** Nominal tanpa prefix "Rp" — untuk tampilan tabel yang rapi (angka rata kanan). */
export function rupiahPlain(value: number, opts: { decimals?: boolean } = {}) {
  const neg = value < 0;
  const abs = Math.abs(value);
  const s = abs.toLocaleString("id-ID", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  });
  return `${neg ? "-" : ""}${s}`;
}

export function num(value: number, digits = 0) {
  return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function d(dt: Date) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

/** ISO yyyy-mm-dd for <input type="date"> */
export function iso(dt: Date) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function parseISO(value: string | null | undefined) {
  if (!value) return new Date();
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, day || 1);
}

export function addDays(dt: Date, days: number) {
  const c = new Date(dt);
  c.setDate(c.getDate() + days);
  return c;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Kunci bulan dari string tanggal ISO (YYYY-MM-DD) → "YYYY-MM". */
export function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function prevYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function nextYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** "2026-10" → "Oktober 2026" */
export function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function monthLabel(dt: Date) {
  return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function withinRange(dateStr: string, from: string, to: string) {
  return dateStr >= from && dateStr <= to;
}

/** Deterministic PRNG so the demo dataset is stable between reloads. */
export function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function csvDownload(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function initials(name: string) {
  return name
    .replace(/[^A-Za-z ]/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 || /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
