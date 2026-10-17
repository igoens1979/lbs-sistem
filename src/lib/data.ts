import { addDays, daysBetween, iso, mulberry32, TODAY } from "./format";

/* =========================================================
   LBS SYSTEM 1.0 — Model data & seed (deterministic)
   PT LOGAM BUMI SANTOSA — Site Golo Mori
   ========================================================= */

export type ID = string;

export interface Customer {
  id: ID;
  code: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  term: number;
  segment: "Enterprise" | "Korporasi" | "UMKM";
  status: "Aktif" | "Nonaktif";
  since: string;
}
export interface Supplier {
  id: ID;
  code: string;
  name: string;
  category: "Sparepart" | "Solar & BBM" | "Sewa Alat" | "Jasa";
  contact: string;
  phone: string;
  hutang: number;
  dueDays: number;
}
export interface Commodity {
  id: ID;
  name: string;
  unit: string;
  price: number;
  stock: number;
}
export interface Vehicle {
  id: ID;
  plate: string;
  model: string;
  type: "Dump Truck" | "Excavator" | "Wheel Loader";
  capacity: number;
  status: "Aktif" | "Servis" | "Nonaktif";
  driverId?: ID;
  /** Odometer berjalan saat ini (km / jam kerja alat berat) */
  odometer: number;
  /** Odometer saat servis berkala terakhir dilakukan */
  lastServiceOdometer: number;
  /** Interval servis berikutnya (km) — bisa diatur per unit */
  serviceIntervalKm: number;
  lastServiceDate: string;
  serviceNote?: string;
}
export interface Driver {
  id: ID;
  name: string;
  phone: string;
  sim: string;
  rating: number;
  status: "Aktif" | "Cuti" | "Nonaktif";
}
export type SJStatus = "Draft" | "Terkirim" | "Diinvoice" | "Batal";
export interface SJ {
  id: ID;
  no: string;
  date: string;
  customerId: ID;
  commodityId: ID;
  volume: number;
  trips: number;
  vehicleId: ID;
  driverId: ID;
  price: number;
  status: SJStatus;
  invoiceId: ID | null;
  site: string;
  note?: string;
}
export type InvoiceStatus = "Belum Jatuh Tempo" | "Jatuh Tempo" | "Terlambat" | "Sebagian" | "Lunas";
export type OpeningSource = "sistem" | "manual" | "rollforward";

/** Saldo awal bulan per akun — BUKAN pemasukan, hanya posisi awal periode. */
export interface OpeningBalanceEntry {
  amount: number;
  type: OpeningSource;
  note: string;
  by: string;
  at: string;
  /** bulan sumber saat roll forward (mis. saldo akhir September 2026) */
  refMonth?: string;
}

export interface OpeningLogEntry {
  id: string;
  ym: string;
  accountId: ID;
  amount: number;
  by: string;
  at: string;
  note: string;
  type: OpeningSource | "koreksi";
}

export interface InvoiceRevision {
  id: ID;
  date: string;
  by: string;
  type: "Terbit" | "Revisi" | "Carry Forward" | "Pembayaran";
  detail: string;
}

export interface Invoice {
  id: ID;
  no: string;
  /** Pelanggan yang ditagih (bill to) */
  customerId: ID;
  date: string;
  dueDate: string;
  dpp: number;
  ppn: number;
  total: number;
  /** Tarif pajak (PPN) yang dipakai saat invoice diterbitkan — dapat diisi manual, mis. 0.11 = 11%. */
  ppnRate?: number;
  status: InvoiceStatus;
  sjIds: ID[];
  note?: string;
  /** Reguler = satu pelanggan asal muatan • Gabungan = beberapa pelanggan asal muatan */
  kind?: "Reguler" | "Gabungan";
  /** Daftar pelanggan asal surat jalan yang tercakup */
  coveredCustomerIds?: ID[];
  /** Audit trail revisi / carry forward / pembayaran */
  revisions?: InvoiceRevision[];
  carryFromInvoiceId?: ID;
}
export interface Payment {
  id: ID;
  invoiceId: ID;
  date: string;
  amount: number;
  method: "Transfer" | "Tunai" | "Giro";
  accountId: ID;
  ref: string;
}
export interface Account {
  id: ID;
  code: string;
  name: string;
  bank: string;
  accountNo: string;
  opening: number;
  type: "Bank" | "Kas";
  role?: string;
  isOperational?: boolean;
}
export interface BankTx {
  id: ID;
  accountId: ID;
  date: string;
  desc: string;
  category: string;
  direction: "in" | "out";
  amount: number;
  allocation?: "LBS" | "KMS";
  ref?: string;
}
export interface FuelLog {
  id: ID;
  date: string;
  accountId: ID;
  supplierId: ID | null;
  liter: number;
  pricePerLiter: number;
  note: string;
}
export interface LegacyDebt {
  id: ID;
  tahap: string;
  pokok: number;
  tenor: number;
  cicilan: number;
  paidCount: number;
  nextDue: string;
  kreditur: string;
}
export interface Employee {
  id: ID;
  code: string;
  name: string;
  role: "Driver" | "Staff" | "Supervisor" | "Manajemen" | "Security";
  division: string;
  joinDate: string;
  basic: number;
  allowance: number;
  bank: string;
  status: "Aktif" | "Cuti" | "Resign";
  hadir: number;
  izin: number;
  alpha: number;
}
export interface PayrollRun {
  id: ID;
  period: string;
  date: string;
  gross: number;
  potongan: number;
  net: number;
  headcount: number;
  status: "Draft" | "Disetujui" | "Dibayar";
}
export type LeadStage = "Prospek" | "Penawaran" | "Negosiasi" | "Deal" | "Gagal";
export interface Lead {
  id: ID;
  company: string;
  contact: string;
  phone: string;
  value: number;
  stage: LeadStage;
  probability: number;
  owner: string;
  source: string;
  need: string;
  nextAction: string;
  nextDate: string;
  activities: { id: ID; date: string; type: "Telepon" | "Meeting" | "Survey" | "WhatsApp"; note: string; by: string }[];
}

/* ---------------------- Master data ---------------------- */

export const CUSTOMERS: Customer[] = [
  { id: "C-001", code: "MJ-001", name: "PT Sentra Beton Nusantara", city: "Kupang", contact: "Ir. Bagus Prasetyo", phone: "0812-3900-1145", term: 30, segment: "Enterprise", status: "Aktif", since: "2021-03-14" },
  { id: "C-002", code: "MJ-002", name: "PT Manggarai Pasir Jaya", city: "Labuan Bajo", contact: "Marten Jalal", phone: "0813-5522-8890", term: 14, segment: "Korporasi", status: "Aktif", since: "2022-01-08" },
  { id: "C-003", code: "MJ-003", name: "PT Golo Mori Mandiri Sejahtera", city: "Golo Mori", contact: "Yulius Tamat", phone: "0821-4477-1201", term: 30, segment: "Enterprise", status: "Aktif", since: "2020-07-30" },
  { id: "C-004", code: "MJ-004", name: "PT Karya Rekayasa Sirkuit", city: "Manggarai Barat", contact: "Rina Oktaviani", phone: "0857-1188-4410", term: 45, segment: "Enterprise", status: "Aktif", since: "2023-05-19" },
  { id: "C-005", code: "MJ-005", name: "CV Tunas Konstruksi Flores", city: "Ende", contact: "Andreas Bria", phone: "0812-7700-3388", term: 21, segment: "Korporasi", status: "Aktif", since: "2022-11-02" },
  { id: "C-006", code: "MJ-006", name: "PT Adhi Pratama Infrastruktur", city: "Mataram", contact: "Hendra Wijaya", phone: "0811-3399-7620", term: 30, segment: "Enterprise", status: "Aktif", since: "2024-02-11" },
  { id: "C-007", code: "MJ-007", name: "CV Mitra Tambang Komodo", city: "Labuan Bajo", contact: "Ferdi Sulaeman", phone: "0822-6655-9091", term: 14, segment: "UMKM", status: "Aktif", since: "2025-06-23" },
  { id: "CUS-GP5H", code: "CTM-001", name: "BPK VEDI", city: "LENTENG GOLO MORI", contact: "", phone: "", term: 7, segment: "Korporasi", status: "Aktif", since: "2026-10-15" },
];

export const SUPPLIERS: Supplier[] = [
  { id: "S-001", code: "SP-001", name: "PT Sumber Sparepart Kupang", category: "Sparepart", contact: "Tomy Halim", phone: "0812-3311-7700", hutang: 34_200_000, dueDays: 14 },
  { id: "S-002", code: "SP-002", name: "PT Solar Prima NTT", category: "Solar & BBM", contact: "Yohanes Dappa", phone: "0813-9900-2211", hutang: 42_000_000, dueDays: 14 },
  { id: "S-003", code: "SP-003", name: "CV Teknik Mandiri Flores", category: "Sewa Alat", contact: "Sarlota Kewa", phone: "0821-5566-8080", hutang: 18_000_000, dueDays: 30 },
  { id: "S-004", code: "SP-004", name: "Toko Bangunan Sinar Abadi", category: "Jasa", contact: "Antonius Jehamin", phone: "0857-4400-1122", hutang: 0, dueDays: 7 },
];

export const COMMODITIES: Commodity[] = [
  { id: "K-001", name: "Pasir Cor", unit: "m³", price: 420_000, stock: 4_850 },
  { id: "K-002", name: "Batu Belah 10-20 mm", unit: "m³", price: 475_000, stock: 2_140 },
  { id: "K-003", name: "Base B (Agregat)", unit: "m³", price: 455_000, stock: 3_320 },
  { id: "K-004", name: "Sirtu Pilihan", unit: "m³", price: 395_000, stock: 1_780 },
  { id: "K-005", name: "Tanah Urug", unit: "m³", price: 365_000, stock: 2_460 },
];

const DRIVER_NAMES = [
  "Sahrul Gunawan", "Maksimus Name", "Agus Setiawan", "Yosef Ratu", "Bahrum Ilham", "Karolus Leki",
  "Dedi Kurniawan", "Antonius Suban", "Ruslan Hakim", "Yulianus Beda", "Herman Saputra", "Niko Anselmus",
];

export const DRIVERS: Driver[] = DRIVER_NAMES.map((name, i) => ({
  id: `D-${String(i + 1).padStart(3, "0")}`,
  name,
  phone: `0812-3${String(100 + i * 7).padStart(3, "0")}-${String(4100 + i * 13).slice(0, 4)}`,
  sim: `SIM-B${String(1200 + i * 3)}`,
  rating: Math.round((4.3 + ((i * 37) % 7) / 10) * 10) / 10,
  status: i === 9 ? "Cuti" : "Aktif",
}));

export const VEHICLES: Vehicle[] = [
  { id: "V-001", plate: "DH 8143 AA", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-001", odometer: 214_500, lastServiceOdometer: 205_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-09-28", serviceNote: "Ganti oli mesin + filter solar" },
  { id: "V-002", plate: "DH 8144 AB", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-002", odometer: 198_300, lastServiceOdometer: 190_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-09-12" },
  { id: "V-003", plate: "DH 8145 AC", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-003", odometer: 176_400, lastServiceOdometer: 168_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-09-05" },
  { id: "V-004", plate: "DH 8146 AD", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-004", odometer: 163_900, lastServiceOdometer: 155_000, serviceIntervalKm: 8_000, lastServiceDate: "2026-09-18", serviceNote: "Jadwal dipercepat 8.000 km (medan tanjakan)" },
  { id: "V-005", plate: "DH 8147 AE", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-005", odometer: 241_750, lastServiceOdometer: 232_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-09-30" },
  { id: "V-006", plate: "DH 8148 AF", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-006", odometer: 231_100, lastServiceOdometer: 221_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-08-30", serviceNote: "Terlambat — menunggu jadwal bengkel" },
  { id: "V-007", plate: "DH 8149 AG", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-007", odometer: 152_640, lastServiceOdometer: 145_000, serviceIntervalKm: 12_000, lastServiceDate: "2026-09-20" },
  { id: "V-008", plate: "DH 8150 AH", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-008", odometer: 149_280, lastServiceOdometer: 140_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-08-26" },
  { id: "V-009", plate: "DH 8151 AI", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-010", odometer: 132_410, lastServiceOdometer: 125_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-09-08" },
  { id: "V-010", plate: "DH 8152 AJ", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-011", odometer: 118_960, lastServiceOdometer: 110_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-08-24" },
  { id: "V-011", plate: "DH 8153 AK", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Servis", driverId: "D-012", odometer: 208_330, lastServiceOdometer: 200_000, serviceIntervalKm: 10_000, lastServiceDate: "2026-10-12", serviceNote: "Di bengkel mitra — perbaikan sistem rem" },
  { id: "V-012", plate: "DH 8154 AL", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-005", odometer: 96_120, lastServiceOdometer: 90_000, serviceIntervalKm: 8_000, lastServiceDate: "2026-09-22" },
  { id: "V-013", plate: "DH 9001 EX", model: "Komatsu PC200-8", type: "Excavator", capacity: 0, status: "Aktif", odometer: 12_480, lastServiceOdometer: 12_000, serviceIntervalKm: 500, lastServiceDate: "2026-09-25", serviceNote: "Interval dalam jam kerja alat" },
  { id: "V-014", plate: "DH 9002 WL", model: "XCMG ZL50GN", type: "Wheel Loader", capacity: 0, status: "Aktif", odometer: 9_315, lastServiceOdometer: 8_900, serviceIntervalKm: 500, lastServiceDate: "2026-09-02" },
];

export const ACCOUNTS: Account[] = [
  { id: "A-002", code: "1-1102", name: "Bank MANDIRI", bank: "Mandiri", accountNo: "181-00-7788787-6", opening: 120_000_000, type: "Bank", isOperational: true },
  { id: "A-001", code: "1-1101", name: "Bank BCA", bank: "BCA", accountNo: "822-0199-3000", opening: 210_000_000, type: "Bank", isOperational: true },
  { id: "A-003", code: "1-1201", name: "Kas Operasional Lapangan", bank: "Tunai", accountNo: "PC-GOLOMORI-01", opening: 25_000_000, type: "Kas", role: "Petty Cash", isOperational: true },
];

/* ---------------------- Seeded transactional data ---------------------- */

const rand = mulberry32(27102026);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function genSuratJalan(): { rows: SJ[]; invoices: Invoice[]; payments: Payment[] } {
  const rows: SJ[] = [];
  const plan: { date: Date; count: number }[] = [];

  // Periode laporan 01/10 – 15/10/2026 => tepat 148 surat jalan
  const octCounts = [9, 10, 8, 9, 11, 7, 9, 10, 9, 8, 12, 10, 9, 13, 14];
  octCounts.forEach((count, i) => plan.push({ date: addDays(new Date(2026, 9, 1), i), count }));
  // Riwayat September (untuk profil aging piutang berjalan)
  for (let i = 1; i <= 30; i++) plan.push({ date: new Date(2026, 8, i), count: 7 + Math.floor(rand() * 4) });
  // Riwayat Juni–Agustus (membentuk piutang kritis > 60 hari)
  for (let dt = new Date(2026, 5, 15); dt < new Date(2026, 8, 1); dt = addDays(dt, 1)) {
    plan.push({ date: new Date(dt), count: 6 + Math.floor(rand() * 3) });
  }

  const activeVehicles = VEHICLES.filter((v) => v.type === "Dump Truck" && v.status !== "Nonaktif");
  let counter = 1;
  plan.forEach(({ date, count }) => {
    for (let k = 0; k < count; k++) {
      const vehicle = pick(activeVehicles);
      const commodity = pick(COMMODITIES);
      const trips = 1;
      const volume = commodity.id === "K-005" ? 30 + Math.floor(rand() * 4) : 24 + Math.floor(rand() * 9);
      const customer = rand() < 0.34 ? CUSTOMERS[2] : pick(CUSTOMERS);
      const no = `SJ/LBS/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(counter++).padStart(4, "0")}`;
      rows.push({
        id: `SJ-${String(rows.length + 1).padStart(4, "0")}`,
        no,
        date: iso(date),
        customerId: customer.id,
        commodityId: commodity.id,
        volume,
        trips,
        vehicleId: vehicle.id,
        driverId: vehicle.driverId ?? "D-001",
        price: commodity.price,
        status: "Terkirim",
        invoiceId: null,
        site: rand() < 0.55 ? "SITE GOLO MORI" : "STOCKPILE LABUAN BAJO",
        note: rand() < 0.12 ? "Perlu pengecekan timbangan ulang" : "",
      });
    }
  });

  // 36 surat jalan periode berjalan (sejak 13/10) belum diterbitkan invoice
  const cut = iso(new Date(2026, 9, 13));
  const invoiced = rows.filter((r) => r.date < cut);

  // Invoice harian per pelanggan — granularitas tagihan mengikuti ritase harian
  const groups = new Map<string, SJ[]>();
  invoiced.forEach((r) => {
    const key = `${r.customerId}|${r.date}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  });

  const invoices: Invoice[] = [];
  const monthSeq = new Map<string, number>();
  [...groups.values()]
    .sort((a, b) => (a[0].date < b[0].date ? -1 : 1))
    .forEach((sjList) => {
      const customer = CUSTOMERS.find((c) => c.id === sjList[0].customerId)!;
      const date = new Date(sjList[0].date);
      const dpp = sjList.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
      const ppn = Math.round(dpp * 0.11);
      const ppnRate = 0.11;
      const seqKey = `${date.getFullYear()}-${date.getMonth()}`;
      const seq = (monthSeq.get(seqKey) ?? 0) + 1;
      monthSeq.set(seqKey, seq);
      const inv: Invoice = {
        id: `INV-${String(invoices.length + 1).padStart(4, "0")}`,
        no: `INV/LBS/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(seq).padStart(4, "0")}`,
        customerId: customer.id,
        date: iso(date),
        dueDate: iso(addDays(date, customer.term)),
        dpp,
        ppn,
        total: dpp + ppn,
        ppnRate,
        status: "Belum Jatuh Tempo",
        sjIds: sjList.map((r) => r.id),
        note: `Tagihan ${sjList.length} surat jalan`,
        kind: "Reguler",
        coveredCustomerIds: [customer.id],
        revisions: [
          {
            id: `RV-${invoices.length + 1}-T`,
            date: iso(date),
            by: "Admin Penagihan",
            type: "Terbit",
            detail: `Invoice diterbitkan • ${sjList.length} surat jalan • total ${dpp + ppn}`,
          },
        ],
      };
      invoices.push(inv);
      sjList.forEach((r) => {
        r.invoiceId = inv.id;
        r.status = "Diinvoice";
      });
    });

  // --- Profil aging: 6 invoice belum jatuh tempo, 3 (1-30 hari),
  // 2 (31-60 hari), 1 (> 60 hari), plus 3 pembayaran sebagian ---
  const byDueDesc = [...invoices].sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  const late = (inv: Invoice) => daysBetween(new Date(inv.dueDate), TODAY());
  const take = (pred: (inv: Invoice) => boolean, n: number) => byDueDesc.filter(pred).slice(0, n);

  const openSet = new Set<string>();
  take((inv) => late(inv) <= 0, 6).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 0 && late(inv) <= 30, 3).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 30 && late(inv) <= 60, 2).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 60, 1).forEach((inv) => openSet.add(inv.id));

  const partialSet = new Set(
    byDueDesc
      .filter((inv) => !openSet.has(inv.id) && late(inv) > 10 && late(inv) <= 52)
      .slice(0, 3)
      .map((inv) => inv.id),
  );

  const payments: Payment[] = [];
  invoices.forEach((inv) => {
    if (openSet.has(inv.id)) {
      inv.status = late(inv) > 0 ? "Terlambat" : "Belum Jatuh Tempo";
      return;
    }
    if (partialSet.has(inv.id)) {
      inv.status = "Sebagian";
      const amount = Math.round(inv.total * 0.4);
      const payDate = iso(addDays(new Date(inv.date), 9));
      payments.push({
        id: `PAY-${String(payments.length + 1).padStart(4, "0")}`,
        invoiceId: inv.id,
        date: payDate,
        amount,
        method: "Transfer",
        accountId: "A-001",
        ref: `TRF/${inv.no}/PT`,
      });
      inv.revisions?.push({ id: `RV-${inv.id}-P`, date: payDate, by: "Finance Supervisor", type: "Pembayaran", detail: `Pembayaran sebagian diterima • sisa tagihan belum dibayar` });
      return;
    }
    inv.status = "Lunas";
    const payRaw = addDays(new Date(inv.date), Math.min(inv.sjIds.length + 5, 20));
    const payDate = iso(payRaw > TODAY() ? TODAY() : payRaw);
    payments.push({
      id: `PAY-${String(payments.length + 1).padStart(4, "0")}`,
      invoiceId: inv.id,
      date: payDate,
      amount: inv.total,
      method: rand() < 0.75 ? "Transfer" : "Giro",
      accountId: "A-001",
      ref: `TRF/${inv.no}/PT`,
    });
    inv.revisions?.push({ id: `RV-${inv.id}-P`, date: payDate, by: "Finance Supervisor", type: "Pembayaran", detail: "Pelunasan penuh diterima • invoice lunas" });
  });

  return {
    rows: rows.sort((a, b) => (a.date < b.date ? 1 : -1)),
    invoices: invoices.sort((a, b) => (a.date < b.date ? 1 : -1)),
    payments,
  };
}

const SEED = genSuratJalan();
export const SURAT_JALAN: SJ[] = SEED.rows;
export const SEED_INVOICES: Invoice[] = SEED.invoices;
export const SEED_PAYMENTS: Payment[] = SEED.payments;

/* ---------------------- Kas / Bank ledger (matching sample matrix) ---------------------- */

export const BANK_TX: BankTx[] = [
  { id: "TX-001", accountId: "A-001", date: "2026-10-02", desc: "Penerimaan termin mitra (batch Sept)", category: "Penerimaan Piutang", direction: "in", amount: 58_000_000, ref: "TRF/INV/LBS/2026/09" },
  { id: "TX-002", accountId: "A-001", date: "2026-10-05", desc: "Penerimaan pelunasan PT Golo Mori Mandiri", category: "Penerimaan Piutang", direction: "in", amount: 47_450_000 },
  { id: "TX-003", accountId: "A-001", date: "2026-10-08", desc: "Penerimaan termin proyek sirkuit", category: "Penerimaan Piutang", direction: "in", amount: 62_300_000 },
  { id: "TX-004", accountId: "A-001", date: "2026-10-13", desc: "Penerimaan giro CV Tunas Konstruksi", category: "Penerimaan Piutang", direction: "in", amount: 27_700_000 },
  { id: "TX-005", accountId: "A-001", date: "2026-10-03", desc: "Pembayaran sparepart & ban armada", category: "Sparepart", direction: "out", amount: 32_500_000, ref: "SP-001" },
  { id: "TX-006", accountId: "A-001", date: "2026-10-07", desc: "Transfer kas operasional site Golo Mori", category: "Operasional Site", direction: "out", amount: 18_250_000 },
  { id: "TX-007", accountId: "A-001", date: "2026-10-09", desc: "Pelunasan angsuran Hutang Lama LBS Tahap 2", category: "Kewajiban Historis", direction: "out", amount: 24_100_000 },
  { id: "TX-008", accountId: "A-001", date: "2026-10-12", desc: "Jasa perawatan dump truck (bengkel mitra)", category: "Pemeliharaan", direction: "out", amount: 12_150_000 },
  { id: "TX-009", accountId: "A-001", date: "2026-10-14", desc: "Biaya administrasi & materai bank", category: "Bank Charge", direction: "out", amount: 6_000_000 },

  { id: "TX-010", accountId: "A-002", date: "2026-10-04", desc: "Dana operasional BBM dari holding", category: "Internal Transfer", direction: "in", amount: 74_600_000 },
  { id: "TX-011", accountId: "A-002", date: "2026-10-11", desc: "Setoran pendapatan hauling lokal", category: "Pendapatan Lain", direction: "in", amount: 40_000_000 },
  { id: "TX-012", accountId: "A-002", date: "2026-10-06", desc: "Pembelian solar industrial 8.000 L", category: "BBM & Solar", direction: "out", amount: 28_000_000, ref: "SP-002" },
  { id: "TX-013", accountId: "A-002", date: "2026-10-10", desc: "Pembayaran tol, retribusi & timbangan", category: "Operasional Armada", direction: "out", amount: 11_500_000 },
  { id: "TX-014", accountId: "A-002", date: "2026-10-14", desc: "Servis berkala excavator Komatsu", category: "Pemeliharaan", direction: "out", amount: 5_500_000 },

  { id: "TX-015", accountId: "A-003", date: "2026-10-05", desc: "Petty cash lapangan dari BCA", category: "Internal Transfer", direction: "in", amount: 16_000_000 },
  { id: "TX-016", accountId: "A-003", date: "2026-10-10", desc: "Penerimaan tunai jasa hauling lokal", category: "Pendapatan Lain", direction: "in", amount: 12_500_000 },
  { id: "TX-017", accountId: "A-003", date: "2026-10-14", desc: "Setoran tunai penjualan lokal stockpile", category: "Operasional Site", direction: "in", amount: 11_500_000 },
  { id: "TX-018", accountId: "A-003", date: "2026-10-06", desc: "Konsumsi tim & air bersih terminal", category: "Operasional Site", direction: "out", amount: 8_250_000 },
  { id: "TX-019", accountId: "A-003", date: "2026-10-09", desc: "Isi ulang genset & lampu site", category: "Operasional Site", direction: "out", amount: 5_000_000 },
  { id: "TX-020", accountId: "A-003", date: "2026-10-13", desc: "Biaya keamanan & kebersihan", category: "Operasional Site", direction: "out", amount: 3_000_000 },
];

export const LEGACY_DEBTS: LegacyDebt[] = [
  { id: "HD-001", tahap: "Tahap 1 — Restrukturisasi 2024", pokok: 50_302_004, tenor: 24, cicilan: 2_095_917, paidCount: 24, nextDue: "2026-10-25", kreditur: "Bank Mandiri (KMK)" },
  { id: "HD-002", tahap: "Tahap 2 — Penjadwalan Aktif", pokok: 60_362_005, tenor: 24, cicilan: 2_515_084, paidCount: 9, nextDue: "2026-10-25", kreditur: "Bank Mandiri (KMK)" },
  { id: "HD-003", tahap: "Tahap 3 — Termin Vendor Alat", pokok: 40_242_005, tenor: 24, cicilan: 1_676_750, paidCount: 3, nextDue: "2026-11-05", kreditur: "CV Teknik Mandiri Flores" },
];

export const FUEL_LOGS: FuelLog[] = [
  { id: "FL-001", date: "2026-10-06", accountId: "A-002", supplierId: "S-002", liter: 8_000, pricePerLiter: 8_900, note: "Pembelian solar industrial batch 1" },
  { id: "FL-002", date: "2026-10-09", accountId: "A-002", supplierId: "S-002", liter: 6_400, pricePerLiter: 8_950, note: "Pembelian solar industrial batch 2" },
  { id: "FL-003", date: "2026-10-13", accountId: "A-002", supplierId: "S-002", liter: 4_216, pricePerLiter: 8_900, note: "Pembelian solar industrial batch 3" },
];

export const FUEL_STATE = { capacity: 20_000, literPerRit: 42, pricePerLiter: 8_900 };

export const EMPLOYEES: Employee[] = (() => {
  const list: Employee[] = [];
  DRIVERS.forEach((drv, i) => {
    list.push({
      id: `E-${String(i + 1).padStart(3, "0")}`,
      code: `DRV-${String(i + 1).padStart(3, "0")}`,
      name: drv.name,
      role: "Driver",
      division: "Operasional Armada",
      joinDate: `20${19 + (i % 6)}-0${(i % 9) + 1}-1${i % 9}`,
      basic: 4_950_000 + (i % 4) * 150_000,
      allowance: 1_450_000,
      bank: "Bank NTT",
      status: drv.status === "Cuti" ? "Cuti" : "Aktif",
      hadir: 24 - (i % 3),
      izin: i % 3,
      alpha: i % 5 === 0 ? 1 : 0,
    });
  });
  const staff = [
    ["Rosalia Mendonca", "Staff", "Keuangan & Pajak", 6_400_000],
    ["Bernadus Laja", "Staff", "Logistik & Gudang", 5_850_000],
    ["Kristina Wungubelen", "Staff", "Admin Penagihan", 5_400_000],
    ["Yohanes Pareira", "Staff", "HRD & Umum", 5_600_000],
    ["Paulus Aran", "Supervisor", "Operasional Site", 8_400_000],
    ["Gunawan Santosa", "Manajemen", "Finance & Strategy", 18_500_000],
    ["Maria Fatima", "Manajemen", "Commercial & CRM", 16_200_000],
    ["Simon Duling", "Security", "Keamanan Terminal", 3_950_000],
    ["Aloysius Koten", "Supervisor", "Maintenance Armada", 8_100_000],
    ["Febrianto Sila", "Staff", "CRM Support", 5_200_000],
    ["Rudolf Nahak", "Security", "Keamanan Stockpile", 3_950_000],
  ] as const;
  staff.forEach(([name, role, division, basic], i) => {
    list.push({
      id: `E-${String(DRIVERS.length + i + 1).padStart(3, "0")}`,
      code: `${division.split(" ")[0].slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      name,
      role: role as Employee["role"],
      division,
      joinDate: `20${18 + (i % 7)}-${String((i % 9) + 1).padStart(2, "0")}-0${(i % 9) + 1}`,
      basic,
      allowance: role === "Manajemen" ? 6_500_000 : role === "Supervisor" ? 3_200_000 : 1_250_000,
      bank: i % 3 === 0 ? "Bank Mandiri" : "Bank NTT",
      status: "Aktif",
      hadir: 24 - (i % 2),
      izin: i % 2,
      alpha: 0,
    });
  });
  return list;
})();

export const PAYROLL_RUNS: PayrollRun[] = [
  { id: "PR-001", period: "Agustus 2026", date: "2026-08-28", gross: 0, potongan: 0, net: 0, headcount: 23, status: "Dibayar" },
  { id: "PR-002", period: "September 2026", date: "2026-09-28", gross: 0, potongan: 0, net: 0, headcount: 23, status: "Dibayar" },
];

export const LEADS: Lead[] = [
  { id: "L-001", company: "PT Nusa Karya Beton Mandiri", contact: "Ibu Sri Handayani", phone: "0812-3300-8811", value: 780_000_000, stage: "Negosiasi", probability: 75, owner: "Maria Fatima", source: "Rujukan Mitra", need: "Hauling pasir cor 8.000 m³ proyek hotel", nextAction: "Finalisasi draft kontrak & jaminan bank", nextDate: "2026-10-18", activities: [
    { id: "A1", date: "2026-10-02", type: "Meeting", note: "Presentasi profil armada 14 unit dump truck", by: "Maria Fatima" },
    { id: "A2", date: "2026-10-09", type: "Survey", note: "Survey jalur hauling & kondisi stockpile tujuan", by: "Paulus Aran" },
  ] },
  { id: "L-002", company: "PT Sirkuit Komodo Development", contact: "Bapak Aryo Dinata", phone: "0857-2211-4400", value: 1_250_000_000, stage: "Penawaran", probability: 55, owner: "Maria Fatima", source: "Tender", need: "Suplai Base B & agregat tahap II sirkuit", nextAction: "Kirim revisi penawaran harga per m³", nextDate: "2026-10-17", activities: [
    { id: "A3", date: "2026-10-05", type: "Telepon", note: "Konfirmasi volume tahap II 12.500 m³", by: "Febrianto Sila" },
  ] },
  { id: "L-003", company: "CV Bahari Quarry Bajo", contact: "Bapak Iqbal Muri", phone: "0821-7788-1199", value: 420_000_000, stage: "Prospek", probability: 30, owner: "Febrianto Sila", source: "WhatsApp Inbound", need: "Angkutan quarry base course 5.000 m³", nextAction: "Jadwalkan kunjungan awal ke quarry", nextDate: "2026-10-21", activities: [
    { id: "A4", date: "2026-10-12", type: "WhatsApp", note: "Permintaan price list hauling jarak 22 km", by: "Febrianto Sila" },
  ] },
  { id: "L-004", company: "PT Manggarai Pasir Jaya", contact: "Marten Jalal", phone: "0813-5522-8890", value: 640_000_000, stage: "Deal", probability: 100, owner: "Maria Fatima", source: "Pelanggan Lama", need: "Perpanjangan kontrak hauling Q4 2026", nextAction: "Terbitkan addendum kontrak & jadwal ritase", nextDate: "2026-10-16", activities: [
    { id: "A5", date: "2026-10-11", type: "Meeting", note: "Kesepakatan perpanjangan 6 bulan, harga +4%", by: "Maria Fatima" },
  ] },
  { id: "L-005", company: "PT Golo Mori Mandiri Sejahtera", contact: "Yulius Tamat", phone: "0821-4477-1201", value: 890_000_000, stage: "Deal", probability: 100, owner: "Gunawan Santosa", source: "Pelanggan Lama", need: "Suplai pasir & base B kawasan wisata", nextAction: "Monitoring pencairan termin ke-3", nextDate: "2026-10-20", activities: [
    { id: "A6", date: "2026-10-08", type: "Meeting", note: "Rapat evaluasi SLA pengiriman", by: "Gunawan Santosa" },
  ] },
  { id: "L-006", company: "CV Tani Ternak Nangaroro", contact: "Bapak Yusuf Bala", phone: "0811-2299-6677", value: 175_000_000, stage: "Prospek", probability: 20, owner: "Febrianto Sila", source: "Pameran", need: "Land clearing & pengurugan lahan 3 ha", nextAction: "Kirim kuesioner kebutuhan alat", nextDate: "2026-10-24", activities: [] },
  { id: "L-007", company: "PT Waringin Logistik Timur", contact: "Ibu Dewi Anggraini", phone: "0812-9090-5566", value: 310_000_000, stage: "Penawaran", probability: 45, owner: "Maria Fatima", source: "Rujukan Bank", need: "Sub-kontrak hauling urugan tol", nextAction: "Negosiasi skema pembayaran 30-70", nextDate: "2026-10-19", activities: [
    { id: "A7", date: "2026-10-10", type: "Telepon", note: "Permintaan jaminan pelaksanaan 5%", by: "Maria Fatima" },
  ] },
  { id: "L-008", company: "UD Sinar Timika Abadi", contact: "Bapak Ronald Manu", phone: "0822-4411-2200", value: 260_000_000, stage: "Gagal", probability: 0, owner: "Febrianto Sila", source: "WhatsApp Inbound", need: "Angkutan tanah urug 4.000 m³", nextAction: "Follow-up ulang kuartal depan", nextDate: "2026-11-30", activities: [
    { id: "A8", date: "2026-10-06", type: "Telepon", note: "Harga kompetitor lebih rendah 11%", by: "Febrianto Sila" },
  ] },
];

/* ---------------------- Helpers ---------------------- */

export const invoiceOutstanding = (inv: Invoice, payments: Payment[]) =>
  Math.max(0, inv.total - payments.filter((p) => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0));

export const commodityName = (id: string) => COMMODITIES.find((c) => c.id === id)?.name ?? "-";
export const customerName = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? "-";
export const vehiclePlate = (id: string) => VEHICLES.find((v) => v.id === id)?.plate ?? "-";
export const driverName = (id: string) => DRIVERS.find((d) => d.id === id)?.name ?? "-";
export const accountName = (id: string) => ACCOUNTS.find((a) => a.id === id)?.name ?? "-";
export const legacyOutstanding = (dbt: LegacyDebt) => Math.max(0, dbt.pokok - dbt.cicilan * Math.min(dbt.paidCount, dbt.tenor));
export const legacyTotal = LEGACY_DEBTS.reduce((s, x) => s + x.pokok, 0);

/* ---------------------- Pemeliharaan / servis berkala ---------------------- */

/** Parameter default penjadwalan servis (dapat diubah dari modul Operasional & BBM). */
export const MAINT_DEFAULT = { defaultIntervalKm: 10_000, warnKm: 1_500 };

/** Odometer target servis berkala berikutnya. */
export const nextServiceKm = (v: Vehicle) => v.lastServiceOdometer + v.serviceIntervalKm;
/** Sisa jarak menuju servis berikutnya (negatif = sudah terlewat). */
export const remainingServiceKm = (v: Vehicle) => nextServiceKm(v) - v.odometer;

