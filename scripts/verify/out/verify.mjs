import fs from "node:fs";
import path from "node:path";
const TODAY = new Date(2026, 9, 15);
TODAY.setHours(0, 0, 0, 0);
function rupiah(value, opts = {}) {
  const neg = value < 0;
  const abs = Math.abs(value);
  const s = abs.toLocaleString("id-ID", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0
  });
  return `${neg ? "-" : ""}Rp ${s}`;
}
function num(value, digits = 0) {
  return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function d(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}
function iso(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
function parseISO(value) {
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, day || 1);
}
function addDays(dt, days) {
  const c = new Date(dt);
  c.setDate(c.getDate() + days);
  return c;
}
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 864e5);
}
function mulberry32(seed) {
  let a = seed;
  return function rand2() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const CUSTOMERS = [
  { id: "C-001", code: "MJ-001", name: "PT Sentra Beton Nusantara", city: "Kupang", contact: "Ir. Bagus Prasetyo", phone: "0812-3900-1145", term: 30, segment: "Enterprise", status: "Aktif", since: "2021-03-14" },
  { id: "C-002", code: "MJ-002", name: "PT Manggarai Pasir Jaya", city: "Labuan Bajo", contact: "Marten Jalal", phone: "0813-5522-8890", term: 14, segment: "Korporasi", status: "Aktif", since: "2022-01-08" },
  { id: "C-003", code: "MJ-003", name: "PT Golo Mori Mandiri Sejahtera", city: "Golo Mori", contact: "Yulius Tamat", phone: "0821-4477-1201", term: 30, segment: "Enterprise", status: "Aktif", since: "2020-07-30" },
  { id: "C-004", code: "MJ-004", name: "PT Karya Rekayasa Sirkuit", city: "Manggarai Barat", contact: "Rina Oktaviani", phone: "0857-1188-4410", term: 45, segment: "Enterprise", status: "Aktif", since: "2023-05-19" },
  { id: "C-005", code: "MJ-005", name: "CV Tunas Konstruksi Flores", city: "Ende", contact: "Andreas Bria", phone: "0812-7700-3388", term: 21, segment: "Korporasi", status: "Aktif", since: "2022-11-02" },
  { id: "C-006", code: "MJ-006", name: "PT Adhi Pratama Infrastruktur", city: "Mataram", contact: "Hendra Wijaya", phone: "0811-3399-7620", term: 30, segment: "Enterprise", status: "Aktif", since: "2024-02-11" },
  { id: "C-007", code: "MJ-007", name: "CV Mitra Tambang Komodo", city: "Labuan Bajo", contact: "Ferdi Sulaeman", phone: "0822-6655-9091", term: 14, segment: "UMKM", status: "Aktif", since: "2025-06-23" }
];
const COMMODITIES = [
  { id: "K-001", name: "Pasir Cor", unit: "m³", price: 42e4, stock: 4850 },
  { id: "K-002", name: "Batu Belah 10-20 mm", unit: "m³", price: 475e3, stock: 2140 },
  { id: "K-003", name: "Base B (Agregat)", unit: "m³", price: 455e3, stock: 3320 },
  { id: "K-004", name: "Sirtu Pilihan", unit: "m³", price: 395e3, stock: 1780 },
  { id: "K-005", name: "Tanah Urug", unit: "m³", price: 365e3, stock: 2460 }
];
const DRIVER_NAMES = [
  "Sahrul Gunawan",
  "Maksimus Name",
  "Agus Setiawan",
  "Yosef Ratu",
  "Bahrum Ilham",
  "Karolus Leki",
  "Dedi Kurniawan",
  "Antonius Suban",
  "Ruslan Hakim",
  "Yulianus Beda",
  "Herman Saputra",
  "Niko Anselmus"
];
const DRIVERS = DRIVER_NAMES.map((name, i) => ({
  id: `D-${String(i + 1).padStart(3, "0")}`,
  name,
  phone: `0812-3${String(100 + i * 7).padStart(3, "0")}-${String(4100 + i * 13).slice(0, 4)}`,
  sim: `SIM-B${String(1200 + i * 3)}`,
  rating: Math.round((4.3 + i * 37 % 7 / 10) * 10) / 10,
  status: i === 9 ? "Cuti" : "Aktif"
}));
const VEHICLES = [
  { id: "V-001", plate: "DH 8143 AA", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-001", odometer: 214500, lastServiceOdometer: 205e3, serviceIntervalKm: 1e4, lastServiceDate: "2026-09-28", serviceNote: "Ganti oli mesin + filter solar" },
  { id: "V-002", plate: "DH 8144 AB", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-002", odometer: 198300, lastServiceOdometer: 19e4, serviceIntervalKm: 1e4, lastServiceDate: "2026-09-12" },
  { id: "V-003", plate: "DH 8145 AC", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-003", odometer: 176400, lastServiceOdometer: 168e3, serviceIntervalKm: 1e4, lastServiceDate: "2026-09-05" },
  { id: "V-004", plate: "DH 8146 AD", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-004", odometer: 163900, lastServiceOdometer: 155e3, serviceIntervalKm: 8e3, lastServiceDate: "2026-09-18", serviceNote: "Jadwal dipercepat 8.000 km (medan tanjakan)" },
  { id: "V-005", plate: "DH 8147 AE", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-005", odometer: 241750, lastServiceOdometer: 232e3, serviceIntervalKm: 1e4, lastServiceDate: "2026-09-30" },
  { id: "V-006", plate: "DH 8148 AF", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-006", odometer: 231100, lastServiceOdometer: 221e3, serviceIntervalKm: 1e4, lastServiceDate: "2026-08-30", serviceNote: "Terlambat — menunggu jadwal bengkel" },
  { id: "V-007", plate: "DH 8149 AG", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-007", odometer: 152640, lastServiceOdometer: 145e3, serviceIntervalKm: 12e3, lastServiceDate: "2026-09-20" },
  { id: "V-008", plate: "DH 8150 AH", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Aktif", driverId: "D-008", odometer: 149280, lastServiceOdometer: 14e4, serviceIntervalKm: 1e4, lastServiceDate: "2026-08-26" },
  { id: "V-009", plate: "DH 8151 AI", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-010", odometer: 132410, lastServiceOdometer: 125e3, serviceIntervalKm: 1e4, lastServiceDate: "2026-09-08" },
  { id: "V-010", plate: "DH 8152 AJ", model: "Mitsubishi Fuso FN", type: "Dump Truck", capacity: 26, status: "Aktif", driverId: "D-011", odometer: 118960, lastServiceOdometer: 11e4, serviceIntervalKm: 1e4, lastServiceDate: "2026-08-24" },
  { id: "V-011", plate: "DH 8153 AK", model: "Hino FM 260 JD", type: "Dump Truck", capacity: 30, status: "Servis", driverId: "D-012", odometer: 208330, lastServiceOdometer: 2e5, serviceIntervalKm: 1e4, lastServiceDate: "2026-10-12", serviceNote: "Di bengkel mitra — perbaikan sistem rem" },
  { id: "V-012", plate: "DH 8154 AL", model: "UD Quester CWE", type: "Dump Truck", capacity: 28, status: "Aktif", driverId: "D-005", odometer: 96120, lastServiceOdometer: 9e4, serviceIntervalKm: 8e3, lastServiceDate: "2026-09-22" },
  { id: "V-013", plate: "DH 9001 EX", model: "Komatsu PC200-8", type: "Excavator", capacity: 0, status: "Aktif", odometer: 12480, lastServiceOdometer: 12e3, serviceIntervalKm: 500, lastServiceDate: "2026-09-25", serviceNote: "Interval dalam jam kerja alat" },
  { id: "V-014", plate: "DH 9002 WL", model: "XCMG ZL50GN", type: "Wheel Loader", capacity: 0, status: "Aktif", odometer: 9315, lastServiceOdometer: 8900, serviceIntervalKm: 500, lastServiceDate: "2026-09-02" }
];
const ACCOUNTS = [
  { id: "A-001", code: "1-1101", name: "Bank BCA (822-0199)", bank: "BCA", accountNo: "822-0199-3000", opening: 21e7, type: "Bank", role: "Operasional Induk Holding", isOperational: true },
  { id: "A-002", code: "1-1102", name: "Bank MANDIRI (142-00)", bank: "Mandiri", accountNo: "181-00-7788787-6", opening: 12e7, type: "Bank", role: "BBM Lapangan & Armada", isOperational: true },
  { id: "A-003", code: "1-1201", name: "Kas Operasional Lapangan", bank: "Tunai", accountNo: "PC-GOLOMORI-01", opening: 25e6, type: "Kas", role: "Petty Cash Kasir Terminal", isOperational: true }
];
const rand = mulberry32(27102026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function genSuratJalan() {
  const rows2 = [];
  const plan = [];
  const octCounts = [9, 10, 8, 9, 11, 7, 9, 10, 9, 8, 12, 10, 9, 13, 14];
  octCounts.forEach((count, i) => plan.push({ date: addDays(new Date(2026, 9, 1), i), count }));
  for (let i = 1; i <= 30; i++) plan.push({ date: new Date(2026, 8, i), count: 7 + Math.floor(rand() * 4) });
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
      rows2.push({
        id: `SJ-${String(rows2.length + 1).padStart(4, "0")}`,
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
        note: rand() < 0.12 ? "Perlu pengecekan timbangan ulang" : ""
      });
    }
  });
  const cut = iso(new Date(2026, 9, 13));
  const invoiced = rows2.filter((r) => r.date < cut);
  const groups = /* @__PURE__ */ new Map();
  invoiced.forEach((r) => {
    const key = `${r.customerId}|${r.date}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  });
  const invoices = [];
  const monthSeq = /* @__PURE__ */ new Map();
  [...groups.values()].sort((a, b) => a[0].date < b[0].date ? -1 : 1).forEach((sjList) => {
    const customer = CUSTOMERS.find((c) => c.id === sjList[0].customerId);
    const date = new Date(sjList[0].date);
    const dpp = sjList.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
    const ppn = Math.round(dpp * 0.11);
    const ppnRate = 0.11;
    const seqKey = `${date.getFullYear()}-${date.getMonth()}`;
    const seq = (monthSeq.get(seqKey) ?? 0) + 1;
    monthSeq.set(seqKey, seq);
    const inv = {
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
          detail: `Invoice diterbitkan • ${sjList.length} surat jalan • total ${dpp + ppn}`
        }
      ]
    };
    invoices.push(inv);
    sjList.forEach((r) => {
      r.invoiceId = inv.id;
      r.status = "Diinvoice";
    });
  });
  const byDueDesc = [...invoices].sort((a, b) => a.dueDate < b.dueDate ? 1 : -1);
  const late = (inv) => daysBetween(new Date(inv.dueDate), TODAY);
  const take = (pred, n) => byDueDesc.filter(pred).slice(0, n);
  const openSet = /* @__PURE__ */ new Set();
  take((inv) => late(inv) <= 0, 6).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 0 && late(inv) <= 30, 3).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 30 && late(inv) <= 60, 2).forEach((inv) => openSet.add(inv.id));
  take((inv) => late(inv) > 60, 1).forEach((inv) => openSet.add(inv.id));
  const partialSet = new Set(
    byDueDesc.filter((inv) => !openSet.has(inv.id) && late(inv) > 10 && late(inv) <= 52).slice(0, 3).map((inv) => inv.id)
  );
  const payments = [];
  invoices.forEach((inv) => {
    if (openSet.has(inv.id)) {
      inv.status = late(inv) > 0 ? "Terlambat" : "Belum Jatuh Tempo";
      return;
    }
    if (partialSet.has(inv.id)) {
      inv.status = "Sebagian";
      const amount = Math.round(inv.total * 0.4);
      const payDate2 = iso(addDays(new Date(inv.date), 9));
      payments.push({
        id: `PAY-${String(payments.length + 1).padStart(4, "0")}`,
        invoiceId: inv.id,
        date: payDate2,
        amount,
        method: "Transfer",
        accountId: "A-001",
        ref: `TRF/${inv.no}/PT`
      });
      inv.revisions?.push({ id: `RV-${inv.id}-P`, date: payDate2, by: "Finance Supervisor", type: "Pembayaran", detail: `Pembayaran sebagian diterima • sisa tagihan belum dibayar` });
      return;
    }
    inv.status = "Lunas";
    const payRaw = addDays(new Date(inv.date), Math.min(inv.sjIds.length + 5, 20));
    const payDate = iso(payRaw > TODAY ? TODAY : payRaw);
    payments.push({
      id: `PAY-${String(payments.length + 1).padStart(4, "0")}`,
      invoiceId: inv.id,
      date: payDate,
      amount: inv.total,
      method: rand() < 0.75 ? "Transfer" : "Giro",
      accountId: "A-001",
      ref: `TRF/${inv.no}/PT`
    });
    inv.revisions?.push({ id: `RV-${inv.id}-P`, date: payDate, by: "Finance Supervisor", type: "Pembayaran", detail: "Pelunasan penuh diterima • invoice lunas" });
  });
  return {
    rows: rows2.sort((a, b) => a.date < b.date ? 1 : -1),
    invoices: invoices.sort((a, b) => a.date < b.date ? 1 : -1),
    payments
  };
}
const SEED = genSuratJalan();
const SURAT_JALAN = SEED.rows;
const SEED_INVOICES = SEED.invoices;
const SEED_PAYMENTS = SEED.payments;
const BANK_TX = [
  { id: "TX-001", accountId: "A-001", date: "2026-10-02", desc: "Penerimaan termin mitra (batch Sept)", category: "Penerimaan Piutang", direction: "in", amount: 58e6, ref: "TRF/INV/LBS/2026/09" },
  { id: "TX-002", accountId: "A-001", date: "2026-10-05", desc: "Penerimaan pelunasan PT Golo Mori Mandiri", category: "Penerimaan Piutang", direction: "in", amount: 4745e4 },
  { id: "TX-003", accountId: "A-001", date: "2026-10-08", desc: "Penerimaan termin proyek sirkuit", category: "Penerimaan Piutang", direction: "in", amount: 623e5 },
  { id: "TX-004", accountId: "A-001", date: "2026-10-13", desc: "Penerimaan giro CV Tunas Konstruksi", category: "Penerimaan Piutang", direction: "in", amount: 277e5 },
  { id: "TX-005", accountId: "A-001", date: "2026-10-03", desc: "Pembayaran sparepart & ban armada", category: "Sparepart", direction: "out", amount: 325e5, ref: "SP-001" },
  { id: "TX-006", accountId: "A-001", date: "2026-10-07", desc: "Transfer kas operasional site Golo Mori", category: "Operasional Site", direction: "out", amount: 1825e4 },
  { id: "TX-007", accountId: "A-001", date: "2026-10-09", desc: "Pelunasan angsuran Hutang Lama LBS Tahap 2", category: "Kewajiban Historis", direction: "out", amount: 241e5 },
  { id: "TX-008", accountId: "A-001", date: "2026-10-12", desc: "Jasa perawatan dump truck (bengkel mitra)", category: "Pemeliharaan", direction: "out", amount: 1215e4 },
  { id: "TX-009", accountId: "A-001", date: "2026-10-14", desc: "Biaya administrasi & materai bank", category: "Bank Charge", direction: "out", amount: 6e6 },
  { id: "TX-010", accountId: "A-002", date: "2026-10-04", desc: "Dana operasional BBM dari holding", category: "Internal Transfer", direction: "in", amount: 746e5 },
  { id: "TX-011", accountId: "A-002", date: "2026-10-11", desc: "Setoran pendapatan hauling lokal", category: "Pendapatan Lain", direction: "in", amount: 4e7 },
  { id: "TX-012", accountId: "A-002", date: "2026-10-06", desc: "Pembelian solar industrial 8.000 L", category: "BBM & Solar", direction: "out", amount: 28e6, ref: "SP-002" },
  { id: "TX-013", accountId: "A-002", date: "2026-10-10", desc: "Pembayaran tol, retribusi & timbangan", category: "Operasional Armada", direction: "out", amount: 115e5 },
  { id: "TX-014", accountId: "A-002", date: "2026-10-14", desc: "Servis berkala excavator Komatsu", category: "Pemeliharaan", direction: "out", amount: 55e5 },
  { id: "TX-015", accountId: "A-003", date: "2026-10-05", desc: "Petty cash lapangan dari BCA", category: "Internal Transfer", direction: "in", amount: 16e6 },
  { id: "TX-016", accountId: "A-003", date: "2026-10-10", desc: "Penerimaan tunai jasa hauling lokal", category: "Pendapatan Lain", direction: "in", amount: 125e5 },
  { id: "TX-017", accountId: "A-003", date: "2026-10-14", desc: "Setoran tunai penjualan lokal stockpile", category: "Operasional Site", direction: "in", amount: 115e5 },
  { id: "TX-018", accountId: "A-003", date: "2026-10-06", desc: "Konsumsi tim & air bersih terminal", category: "Operasional Site", direction: "out", amount: 825e4 },
  { id: "TX-019", accountId: "A-003", date: "2026-10-09", desc: "Isi ulang genset & lampu site", category: "Operasional Site", direction: "out", amount: 5e6 },
  { id: "TX-020", accountId: "A-003", date: "2026-10-13", desc: "Biaya keamanan & kebersihan", category: "Operasional Site", direction: "out", amount: 3e6 }
];
const LEGACY_DEBTS = [
  { id: "HD-001", tahap: "Tahap 1 — Restrukturisasi 2024", pokok: 50302004, tenor: 24, cicilan: 2095917, paidCount: 24, nextDue: "2026-10-25", kreditur: "Bank Mandiri (KMK)" },
  { id: "HD-002", tahap: "Tahap 2 — Penjadwalan Aktif", pokok: 60362005, tenor: 24, cicilan: 2515084, paidCount: 9, nextDue: "2026-10-25", kreditur: "Bank Mandiri (KMK)" },
  { id: "HD-003", tahap: "Tahap 3 — Termin Vendor Alat", pokok: 40242005, tenor: 24, cicilan: 1676750, paidCount: 3, nextDue: "2026-11-05", kreditur: "CV Teknik Mandiri Flores" }
];
(() => {
  const list = [];
  DRIVERS.forEach((drv, i) => {
    list.push({
      id: `E-${String(i + 1).padStart(3, "0")}`,
      code: `DRV-${String(i + 1).padStart(3, "0")}`,
      name: drv.name,
      role: "Driver",
      division: "Operasional Armada",
      joinDate: `20${19 + i % 6}-0${i % 9 + 1}-1${i % 9}`,
      basic: 495e4 + i % 4 * 15e4,
      allowance: 145e4,
      bank: "Bank NTT",
      status: drv.status === "Cuti" ? "Cuti" : "Aktif",
      hadir: 24 - i % 3,
      izin: i % 3,
      alpha: i % 5 === 0 ? 1 : 0
    });
  });
  const staff = [
    ["Rosalia Mendonca", "Staff", "Keuangan & Pajak", 64e5],
    ["Bernadus Laja", "Staff", "Logistik & Gudang", 585e4],
    ["Kristina Wungubelen", "Staff", "Admin Penagihan", 54e5],
    ["Yohanes Pareira", "Staff", "HRD & Umum", 56e5],
    ["Paulus Aran", "Supervisor", "Operasional Site", 84e5],
    ["Gunawan Santosa", "Manajemen", "Finance & Strategy", 185e5],
    ["Maria Fatima", "Manajemen", "Commercial & CRM", 162e5],
    ["Simon Duling", "Security", "Keamanan Terminal", 395e4],
    ["Aloysius Koten", "Supervisor", "Maintenance Armada", 81e5],
    ["Febrianto Sila", "Staff", "CRM Support", 52e5],
    ["Rudolf Nahak", "Security", "Keamanan Stockpile", 395e4]
  ];
  staff.forEach(([name, role, division, basic], i) => {
    list.push({
      id: `E-${String(DRIVERS.length + i + 1).padStart(3, "0")}`,
      code: `${division.split(" ")[0].slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      name,
      role,
      division,
      joinDate: `20${18 + i % 7}-${String(i % 9 + 1).padStart(2, "0")}-0${i % 9 + 1}`,
      basic,
      allowance: role === "Manajemen" ? 65e5 : role === "Supervisor" ? 32e5 : 125e4,
      bank: i % 3 === 0 ? "Bank Mandiri" : "Bank NTT",
      status: "Aktif",
      hadir: 24 - i % 2,
      izin: i % 2,
      alpha: 0
    });
  });
  return list;
})();
const commodityName = (id) => COMMODITIES.find((c) => c.id === id)?.name ?? "-";
const vehiclePlate = (id) => VEHICLES.find((v) => v.id === id)?.plate ?? "-";
const driverName = (id) => DRIVERS.find((d2) => d2.id === id)?.name ?? "-";
LEGACY_DEBTS.reduce((s, x) => s + x.pokok, 0);
const kop = (docTitle, docNo) => `
<div class="kop">
  <div>
    <p class="brand">PT LOGAM BUMI SANTOSA</p>
    <p class="sub">Quarry &amp; Hauling Contractor — Site Golo Mori, Manggarai Barat, NTT</p>
    <p class="sub">Ruko Pemda No.9 Jl. Wae Medu, Komodo, Manggarai Barat, NTT </p> 
    <p class="sub">Telp. +62 812 - 3796 - 9981 | +62 823 - 1411 - 8179 | logambumisantosa@gmail.com, adminlbs.gm@gmail.com</p>
  </div>
  <div class="doc">
    <h2>${docTitle}</h2>
    <p class="no">${docNo}</p>
    <p class="sub">Tanggal cetak: ${d(/* @__PURE__ */ new Date())}</p>
    <p class="sub">Sistem: LBS System 1.0</p>
  </div>
</div>`;
function invoiceHtml(inv, ctx) {
  const cust = CUSTOMERS.find((c) => c.id === inv.customerId);
  const rate = inv.ppnRate ?? 0.11;
  const ratePct = rate * 100;
  const rateLabel = `PPN ${ratePct % 1 === 0 ? ratePct.toFixed(0) : ratePct.toFixed(2).replace(/0$/, "")}%`;
  const termDays = daysBetween(new Date(inv.date), new Date(inv.dueDate));
  const isGabungan = inv.kind === "Gabungan" || new Set(ctx.rows.map((r) => r.customerId)).size > 1;
  const groups = (() => {
    const map = /* @__PURE__ */ new Map();
    [...ctx.rows].sort((a, b) => a.no < b.no ? -1 : a.no > b.no ? 1 : 0).forEach((r) => {
      const arr = map.get(r.customerId) ?? [];
      arr.push(r);
      map.set(r.customerId, arr);
    });
    return [...map.entries()].map(([cid, rows2]) => {
      const c = CUSTOMERS.find((x) => x.id === cid);
      return {
        cid,
        name: c?.name ?? cid,
        code: c?.code ?? "-",
        city: c?.city ?? "-",
        term: c?.term ?? 30,
        rows: rows2,
        volume: rows2.reduce((sum2, r) => sum2 + r.volume * r.trips, 0),
        value: rows2.reduce((sum2, r) => sum2 + r.volume * r.trips * r.price, 0)
      };
    }).sort((a, b) => b.value - a.value);
  })();
  const totalVolume = groups.reduce((sum2, g) => sum2 + g.volume, 0);
  const totalSj = ctx.rows.length;
  const summaryRows = groups.map(
    (g) => `<tr>
        <td>${g.name}<br/><span class="mini">${g.code} • ${g.city}${g.cid === inv.customerId ? "" : " • asal muatan"}</span></td>
        <td style="text-align:center">${g.rows.length}</td>
        <td style="text-align:right">${num(g.volume)} m³</td>
        <td style="text-align:right">${rupiah(g.value)}</td>
      </tr>`
  ).join("");
  const page1 = `
  ${kop("Invoice / Faktur Penagihan", inv.no)}
  ${isGabungan ? `<div class="note"><b>INVOICE GABUNGAN</b> — ditagihkan kepada <b>${cust?.name ?? "-"}</b> dan mencakup surat jalan dari <b>${groups.length} pelanggan asal muatan</b>. Rincian lengkap tiap surat jalan (nomor, driver, nopol, komoditas, volume, nilai muatan) terdapat pada <b>halaman lampiran</b>.</div>` : ""}
  <div class="grid">
    <div class="kv"><b>Ditagihkan Kepada</b> ${cust?.name ?? "-"}</div>
    <div class="kv"><b>Kode Pelanggan</b> ${cust?.code ?? "-"} • ${cust?.city ?? "-"}</div>
    <div class="kv"><b>Kontak</b> ${cust?.contact ?? "-"} — ${cust?.phone ?? "-"}</div>
    <div class="kv"><b>Termin Pembayaran</b> ${termDays} hari</div>
    <div class="kv"><b>Tanggal Invoice</b> ${d(parseISO(inv.date))}</div>
    <div class="kv"><b>Jatuh Tempo</b> ${d(parseISO(inv.dueDate))}</div>
    <div class="kv"><b>Status Sistem</b> ${ctx.status}</div>
    <div class="kv"><b>Jenis Invoice</b> ${isGabungan ? "Gabungan antar pelanggan" : "Reguler"}</div>
    <div class="kv"><b>Jumlah Surat Jalan</b> ${totalSj} dokumen</div>
    <div class="kv"><b>Total Volume Muatan</b> ${num(totalVolume)} m³</div>
  </div>

  <div class="sec-title">Ringkasan per Pelanggan Asal Muatan</div>
  <table>
    <thead><tr><th>Pelanggan Asal Muatan</th><th style="text-align:center">Jumlah SJ</th><th style="text-align:right">Volume</th><th style="text-align:right">Nilai Muatan (DPP)</th></tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot><tr><td>TOTAL</td><td style="text-align:center">${totalSj}</td><td style="text-align:right">${num(totalVolume)} m³</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr></tfoot>
  </table>

  <div class="sec-title">Ringkasan Tagihan</div>
  <table>
    <tbody>
      <tr><td>Dasar Pengenaan Pajak (DPP) — ${totalSj} surat jalan</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr>
      <tr><td>${rateLabel} (tarif diisi manual pada penerbitan)</td><td style="text-align:right">${rupiah(inv.ppn)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Total Tagihan</td><td style="text-align:right">${rupiah(inv.total)}</td></tr>
      <tr><td>Sudah Dibayar</td><td style="text-align:right">${rupiah(ctx.paid)}</td></tr>
      <tr><td>Sisa Kewajiban</td><td style="text-align:right">${rupiah(Math.max(0, inv.total - ctx.paid))}</td></tr>
    </tfoot>
  </table>

  <div class="note">Pembayaran ditransfer ke <b>Bank Mandiri 181-00-7788787-6</b> a/n PT Logam Bumi Santosa. Mohon cantumkan nomor invoice pada berita transfer.</div>

  <div class="sign-one">
    <div>Manggarai Barat, ${d(parseISO(inv.date))}<br/>Hormat kami,</div>
    <img src="/ttd_direktur.png" alt="Tanda tangan Direktur" style="height:64px;display:inline-block;margin:0 0 -2px 18px;" />
    <div class="line"></div>
    <b>JEMY LASMONO NDAY</b>
    <span>Direktur</span>
  </div>
  <p class="foot">${inv.note ?? ""} — Lampiran surat jalan lengkap: halaman 2 dan seterusnya. Dokumen dihasilkan otomatis oleh LBS System 1.0.</p>`;
  const groupBlocks = groups.map((g, idx) => {
    const rows2 = g.rows.map(
      (r) => `<tr>
            <td style="font-size:9px">${r.no}<br/><span class="mini" style="font-size:9px">${d(parseISO(r.date))} • ${r.site}</span></td>
            <td style="font-size:9px">${driverName(r.driverId)}</td>
            <td style="font-size:9px">${vehiclePlate(r.vehicleId)}</td>
            <td style="font-size:9px">${commodityName(r.commodityId)}</td>
            <td style="text-align:right;font-size:9px">${num(r.volume * r.trips)} m³</td>
            <td style="text-align:right;font-size:9px">${rupiah(r.volume * r.trips * r.price)}</td>
          </tr>`
    ).join("");
    return `
      <div style="break-inside:avoid;page-break-inside:avoid;">
        <div class="grp">
          <div class="grp-head">
            <div>
              <b>LAMPIRAN ${idx + 1} — ASAL MUATAN: ${g.name}</b><br/>
              <span>Kode ${g.code} • ${g.city} • termin ${g.term} hari</span>
            </div>
            <div style="text-align:right">
              <span>${g.rows.length} surat jalan • ${num(g.volume)} m³</span><br/>
              <span>Subtotal DPP <b>${rupiah(g.value)}</b></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="font-size:9px">Nomor Surat Jalan</th><th style="font-size:9px">Driver</th><th style="font-size:9px">Nopol</th><th style="font-size:9px">Jenis Komoditas</th>
                <th style="text-align:right;font-size:9px">Volume</th><th style="text-align:right;font-size:9px">Nilai Muatan</th>
              </tr>
            </thead>
            <tbody>${rows2}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="font-size:9px">Subtotal ${g.name}</td>
                <td style="text-align:right;font-size:9px">${num(g.volume)} m³</td>
                <td style="text-align:right;font-size:9px">${rupiah(g.value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }).join("");
  const recap = isGabungan ? `
  <div class="sec-title">Rekapitulasi Lampiran Surat Jalan — ${inv.no}</div>
  <table>
    <thead><tr><th>Pelanggan Asal Muatan</th><th style="text-align:center">Jumlah SJ</th><th style="text-align:right">Volume</th><th style="text-align:right">Nilai Muatan (DPP)</th></tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot>
      <tr><td>TOTAL DPP LAMPIRAN</td><td style="text-align:center">${totalSj}</td><td style="text-align:right">${num(totalVolume)} m³</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr>
    </tfoot>
  </table>
  <table>
    <tbody>
      <tr><td>${rateLabel}</td><td style="text-align:right">${rupiah(inv.ppn)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Total Tagihan (sesuai halaman 1)</td><td style="text-align:right">${rupiah(inv.total)}</td></tr>
      <tr><td>Sudah Dibayar</td><td style="text-align:right">${rupiah(ctx.paid)}</td></tr>
      <tr><td>Sisa Kewajiban</td><td style="text-align:right">${rupiah(Math.max(0, inv.total - ctx.paid))}</td></tr>
    </tfoot>
  </table>` : "";
  const lampiran = `
  <div class="page">
    ${groupBlocks || "<p>Tidak ada surat jalan terlampir pada invoice ini.</p>"}
    ${recap}
    <p class="foot">Lampiran ini merupakan bagian tidak terpisahkan dari Invoice ${inv.no} • ${totalSj} surat jalan • ${groups.length} pelanggan asal muatan • dicetak dari LBS System 1.0.</p>
  </div>`;
  const body = `${page1}${totalSj > 0 ? lampiran : ""}`;
  return { title: `Invoice ${inv.no}`, body };
}
const TODAY_ISO = iso(TODAY);
let pass = 0;
let fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) pass++;
  else {
    fail++;
    console.log("  [FAIL]", label, detail);
  }
};
const sjById = new Map(SURAT_JALAN.map((r) => [r.id, r]));
const sjValue = (r) => r.volume * r.trips * r.price;
console.log("=== 1. KONSISTENSI PERHITUNGAN INVOICE (DPP/PPN/Total) ===");
let mismatch = 0;
for (const inv of SEED_INVOICES) {
  const rows2 = inv.sjIds.map((id) => sjById.get(id)).filter(Boolean);
  const dpp = rows2.reduce((s, r) => s + sjValue(r), 0);
  const ppn = Math.round(dpp * 0.11);
  const total = dpp + ppn;
  if (dpp !== inv.dpp || ppn !== inv.ppn || total !== inv.total) {
    mismatch++;
    console.log("   mismatch:", inv.no, "stored=", [inv.dpp, inv.ppn, inv.total], "calc=", [dpp, ppn, total]);
  }
  if (rows2.length !== inv.sjIds.length)
    console.log("   peringatan: SJ hilang utk", inv.no, inv.sjIds.length, "=>", rows2.length);
}
ok(mismatch === 0, `${SEED_INVOICES.length} invoice: dpp/ppn/total sesuai perhitungan surat jalan`, `${mismatch} mismatch`);
console.log("=== 2. PEMBAYARAN vs NILAI INVOICE ===");
const paidMap = /* @__PURE__ */ new Map();
for (const p of SEED_PAYMENTS) paidMap.set(p.invoiceId, (paidMap.get(p.invoiceId) ?? 0) + p.amount);
let overpay = 0;
for (const inv of SEED_INVOICES) {
  const paid = paidMap.get(inv.id) ?? 0;
  if (paid > inv.total) {
    overpay++;
    console.log("   overpayment:", inv.no, rupiah(paid), "> total", rupiah(inv.total));
  }
  if (inv.status !== "Lunas" && paid >= inv.total) console.log("   status bukan Lunas tapi sudah lunas:", inv.no, inv.status);
}
ok(overpay === 0, "Tidak ada pembayaran melebihi nilai invoice", `${overpay} overpayment`);
const futurePays = SEED_PAYMENTS.filter((p) => p.date > TODAY_ISO);
ok(futurePays.length === 0, "Tidak ada pembayaran bertanggal masa depan (> 15/10/2026)", `${futurePays.length} pembayaran: ${futurePays.slice(0, 8).map((p) => `${p.id} ${p.date}`).join(" | ")}`);
const latestPay = SEED_PAYMENTS.reduce((m, x) => x.date > m ? x.date : m, "");
const earliestPay = SEED_PAYMENTS.reduce((m, x) => x.date < m ? x.date : m, latestPay);
console.log(`   rentang tanggal pembayaran: ${earliestPay} .. ${latestPay} (${SEED_PAYMENTS.length} pembayaran)`);
console.log("=== 3. KAS & BANK — REKONSILIASI OKTOBER (periode 01–15/10/2026) ===");
const period = { from: "2026-10-01", to: "2026-10-15" };
const rows = ACCOUNTS.map((a) => {
  const tx = BANK_TX.filter((t) => t.accountId === a.id && t.date >= period.from && t.date <= period.to);
  const masuk = tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const keluar = tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
  return { name: a.name, role: a.role, opening: a.opening, masuk, keluar, balance: a.opening + masuk - keluar };
});
const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
for (const r of rows)
  console.log(`   ${r.name.padEnd(28)} awal ${rupiah(r.opening).padStart(14)} | masuk ${rupiah(r.masuk).padStart(14)} | keluar ${rupiah(r.keluar).padStart(14)} | akhir ${rupiah(r.balance).padStart(14)}`);
console.log(`   TOTAL                     ${rupiah(sum("opening")).padStart(14)} | ${rupiah(sum("masuk")).padStart(14)} | ${rupiah(sum("keluar")).padStart(14)} | ${rupiah(sum("balance")).padStart(14)}`);
ok(sum("opening") === 355e6, "Total saldo awal  = Rp 355.000.000", `terhitung ${rupiah(sum("opening"))}`);
ok(sum("masuk") === 35005e4, "Total kas masuk   = Rp 350.050.000", `terhitung ${rupiah(sum("masuk"))}`);
ok(sum("keluar") === 15425e4, "Total kas keluar  = Rp 154.250.000", `terhitung ${rupiah(sum("keluar"))}`);
ok(sum("balance") === 5508e5, "Saldo akhir       = Rp 550.800.000", `terhitung ${rupiah(sum("balance"))}`);
ok(rows.every((r) => r.balance >= 0), "Semua saldo rekening tidak negatif");
const netOct = ACCOUNTS.reduce((s, a) => {
  const tx = BANK_TX.filter((t) => t.accountId === a.id && t.date.startsWith("2026-10"));
  const masuk = tx.filter((t) => t.direction === "in").reduce((x, t) => x + t.amount, 0);
  const keluar = tx.filter((t) => t.direction === "out").reduce((x, t) => x + t.amount, 0);
  return s + masuk - keluar;
}, 0);
console.log(`   catatan: mutasi seluruh Oktober = ${rupiah(netOct)} (semua transaksi seed 1–14 Okt)`);
console.log("=== 4. INTEGRITAS HASIL CETAK INVOICE (HTML print) ===");
const sample = [
  SEED_INVOICES[0],
  SEED_INVOICES.find((i) => (paidMap.get(i.id) ?? 0) > 0 && (paidMap.get(i.id) ?? 0) < i.total),
  SEED_INVOICES.find((i) => !(paidMap.get(i.id) ?? 0))
].filter(Boolean);
for (const inv of sample) {
  const ctxRows = inv.sjIds.map((id) => sjById.get(id)).filter(Boolean);
  const paid = paidMap.get(inv.id) ?? 0;
  const late = daysBetween(new Date(inv.dueDate), TODAY);
  const status = paid >= inv.total - 1 ? "Lunas" : paid > 0 ? late > 0 ? "Terlambat" : "Sebagian" : late > 30 ? "Terlambat" : late > 0 ? "Jatuh Tempo" : "Belum Jatuh Tempo";
  const { body } = invoiceHtml(inv, { paid, status, rows: ctxRows });
  const volume = ctxRows.reduce((s, r) => s + r.volume * r.trips, 0);
  const checks = {
    DPP: body.includes(rupiah(inv.dpp)),
    PPN: body.includes(rupiah(inv.ppn)),
    Total: body.includes(rupiah(inv.total)),
    "Sudah Dibayar": body.includes(rupiah(paid)),
    Sisa: body.includes(rupiah(Math.max(0, inv.total - paid))),
    Volume: body.includes(`${num(volume)} m³`),
    NoInvois: body.includes(inv.no),
    Status: body.includes(status)
  };
  const allOk = Object.values(checks).every(Boolean);
  if (!allOk) console.log("   detail gagal", inv.no, checks);
  ok(allOk, `Cetak ${inv.no} konsisten (DPP/PPN/Total/Dibayar/Sisa/Volume/Status)`, JSON.stringify(checkDetail(checks)));
}
let buildOk = 0;
for (const inv of SEED_INVOICES) {
  try {
    invoiceHtml(inv, { paid: paidMap.get(inv.id) ?? 0, status: "Lunas", rows: inv.sjIds.map((id) => sjById.get(id)).filter(Boolean) });
    buildOk++;
  } catch (e) {
    console.log("   error build HTML:", inv.no, e.message);
  }
}
ok(buildOk === SEED_INVOICES.length, "Semua invoice berhasil menghasilkan HTML cetak tanpa error", `${buildOk}/${SEED_INVOICES.length}`);
function checkDetail(c) {
  const bad = Object.entries(c).filter(([, v]) => !v).map(([k]) => k);
  return bad.length ? `hilang: ${bad.join(", ")}` : "ok";
}
console.log("=== 5. TANGGAL CETAK DI KOP (bebas pergeseran zona waktu) ===");
const printSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/print.ts"), "utf8");
const hasUTCDate = printSrc.includes("toISOString().slice(0, 10)");
const hasLocalDate = printSrc.includes("d(new Date())");
console.log(`   print.ts: 'd(new Date())' ada = ${hasLocalDate} • masih ada toISOString().slice(0,10) = ${hasUTCDate}`);
ok(hasLocalDate && !hasUTCDate, "Tanggal cetak di kop memakai waktu lokal (tidak bergeser 1 hari sebelum 08:00 WITA)");
console.log("=== 6. STATUS TERSIMPAN vs TERHITUNG ===");
let diff = 0;
for (const inv of SEED_INVOICES) {
  const paid = paidMap.get(inv.id) ?? 0;
  const late = daysBetween(new Date(inv.dueDate), TODAY);
  const computed = paid >= inv.total - 1 ? "Lunas" : paid > 0 ? late > 0 ? "Terlambat" : "Sebagian" : late > 30 ? "Terlambat" : late > 0 ? "Jatuh Tempo" : "Belum Jatuh Tempo";
  if (computed !== inv.status) {
    diff++;
  }
}
console.log(`   ${diff} invoice status tersimpan ≠ status terhitung (tampilan memakai computedStatus, jadi hanya perbedaan data lama)`);
console.log(`
HASIL VERIFIKASI: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
