import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/* =========================
   PEMETAAN KOLOM
   Kunci  = nama kolom di file CSV spreadsheet kamu (sesuaikan!)
   Nilai  = nama kolom di tabel Supabase
   ========================= */
const MAP = {
  customers: {
    id: 'id',
    code: 'code',
    name: 'name',
    address: 'city',
    phone: 'phone',
    email: 'contact',
    active: 'status',
    created_at: 'created_at',
  },
  suppliers: {
    'Nama Supplier': 'name',
    'Kode Supplier': 'code',
    Kategori: 'category',
    'Nama Kontak': 'contact',
    Telepon: 'phone',
    'Hutang Berjalan': 'hutang',
    'Termin (hari)': 'dueDays',
  },
  commodities: {
    id: 'id',
    name: 'name',
    unit: 'unit',
    default_price: 'price',
    created_at: 'created_at',
  },
  vehicles: {
    id: 'id',
    plate_number: 'plate',
    name: 'model',
    active: 'status',
    created_at: 'created_at',
  },
  drivers: {
    id: 'id',
    name: 'name',
    phone: 'phone',
    active: 'status',
    created_at: 'created_at',
  },
  employees: {
    id: 'id',
    code: 'code',
    name: 'name',
    role: 'role',
    division: 'division',
    joinDate: 'join_date',
    basic: 'basic',
    allowance: 'allowance',
    bank: 'bank',
    status: 'emp_status',
    created_at: 'created_at',
  },
  surat_jalan: {
    id: 'id',
    no: 'no',
    sj_date: 'sj_date',
    customer_id: 'customer_id',
    commudity_id: 'commodity_id',
    volume: 'volume',
    trips: 'trips',
    vehicle_id: 'vehicle_id',
    driver_id: 'driver_id',
    price: 'price',
    status: 'status',
    invoice_id: 'invoice_id',
    site: 'site',
    catatan: 'catatan',
    created_at: 'created_at',
  },
};

function toDate(v) {
  if (!v) return null;
  // Handle dd/mm/yyyy hh:mm:ss (Google Sheets export)
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(\s(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[5] || 0), Number(m[6] || 0), Number(m[7] || 0)));
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function toNum(v) {
  if (v == null || v === '') return 0;
  const n = String(v).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const num = Number(n);
  return isNaN(num) ? 0 : num;
}

function readCsv(path) {
  const text = fs.readFileSync(path, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

function transformRow(row, map) {
  const obj = {};
  for (const [sheetCol, dbCol] of Object.entries(map)) {
    let val = row[sheetCol] ?? null;
    if (val != null && dbCol === 'status' && sheetCol === 'active') {
      val = ['true', '1', 'yes', 'ya'].includes(String(val).toLowerCase()) ? 'Aktif' : 'Nonaktif';
    } else if (val != null && (dbCol.endsWith('Date') || dbCol === 'since' || dbCol === 'joinDate' || dbCol === 'created_at')) {
      val = toDate(val);
    } else if (val != null && ['term','dueDays','price','stock','capacity','odometer','lastServiceOdometer','serviceIntervalKm','basic','allowance','hutang','rating'].includes(dbCol)) {
      val = toNum(val);
    }
    obj[dbCol] = val;
  }
  return obj;
}

async function migrate() {
  const order = ['customers', 'suppliers', 'commodities', 'vehicles', 'drivers', 'employees', 'surat_jalan'];
  for (const table of order) {
    const path = `scripts/data/${table}.csv`;
    if (!fs.existsSync(path)) {
      console.warn(`Lewati ${table}: ${path} tidak ditemukan`);
      continue;
    }
    const rows = readCsv(path);
    const payload = rows.map((r) => transformRow(r, MAP[table]));
    const { error } = await supabase.from(table).upsert(payload);
    if (error) console.error(`Gagal ${table}:`, error.message);
    else console.log(`OK ${table}: ${payload.length} baris`);
  }
  console.log('Selesai. Tabel users tidak diubah.');
}

migrate().catch(console.error);
