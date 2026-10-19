/* =========================================================
   Migrasi invoice.csv & invoice_detil.csv → Supabase
   -dry-run (default): preview data saja, tidak menulis
   --apply           : menulis ke database
   Catatan: Hanya mengimpor invoice dengan revision_no tertinggi
   ========================================================= */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const APPLY = process.argv.includes('--apply');
const SUPA_URL = "https://vqozqgjrqeukqtnlqbto.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA";

function readCsv(path) {
  const text = fs.readFileSync(path, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

function toNum(v) {
  if (v == null || v === '') return 0;
  const n = String(v).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const num = Number(n);
  return isNaN(num) ? 0 : num;
}

function toDate(v) {
  if (!v) return null;
  // Format: dd-mm-yy atau dd-mm-yyyy
  const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

// Parse Indonesian date format: "16-09-26 11:54" → ISO
function toTimestamp(v) {
  if (!v) return new Date().toISOString();
  const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5])));
    return d.toISOString();
  }
  const d = new Date(v);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

// Ambil customer mapping dari database
let nameToId = {};
if (APPLY) {
  const sb = createClient(SUPA_URL, SUPA_KEY);
  const { data: customers } = await sb.from('customers').select('id,name');
  customers.forEach(c => nameToId[c.name.toLowerCase()] = c.id);
  console.log('Customer mapping:', Object.keys(nameToId).length, 'customer\n');
}

console.log(`Mode: ${APPLY ? 'APPLY (menulis ke database)' : 'DRY-RUN (preview only)'}\n`);

// 1. invoice.csv → invoices (hanya revision_no tertinggi per invoice_number)
const invRows = readCsv('scripts/data/invoice.csv');
const latestByNo = {};
invRows.forEach(r => {
  const rev = Number(r.revision_no) || 0;
  const existing = latestByNo[r.invoice_number];
  if (!existing || rev > (Number(existing.revision_no) || 0)) {
    latestByNo[r.invoice_number] = r;
  }
});
const dedupRows = Object.values(latestByNo);
console.log(`invoice.csv: ${invRows.length} baris → ${dedupRows.length} invoice unik (setelah deduplikasi)\n`);

const invPayload = dedupRows.map(r => {
  let customerId = r.customer_id;
  if (!customerId && r.customer_name) {
    customerId = nameToId[r.customer_name.toLowerCase()];
  }
  return {
    id: r.id,
    no: r.invoice_number,
    customer_id: customerId,
    inv_date: toDate(r.tanggal),
    due_date: toDate(r.due_date),
    dpp: toNum(r.subtotal),
    ppn: toNum(r.tax_amount),
    ppn_rate: toNum(r.tax_percent) / 100,
    total: toNum(r.grand_total),
    status: r.status || 'Belum Jatuh Tempo',
    catatan: r.terbilang || '',
    created_at: toTimestamp(r.created_at),
  };
});
console.log('Sample 3 baris pertama:');
console.log(JSON.stringify(invPayload.slice(0, 3), null, 2));

if (APPLY) {
  const sb = createClient(SUPA_URL, SUPA_KEY);
  // Hapus semua invoice lama (nomor yang sama dengan CSV)
  const nos = dedupRows.map(r => r.invoice_number);
  const { data: oldInvs } = await sb.from('invoices').select('id,no').in('no', nos);
  const oldIds = oldInvs.map(r => r.id);
  if (oldIds.length > 0) {
    await sb.from('invoice_sj').delete().in('invoice_id', oldIds);
    await sb.from('invoice_revisions').delete().in('invoice_id', oldIds);
    await sb.from('invoices').delete().in('id', oldIds);
    console.log(`Hapus ${oldIds.length} invoice lama dengan nomor sama\n`);
  }
  const { error, count } = await sb.from('invoices').upsert(invPayload, { onConflict: 'id' });
  if (error) console.error('\nGagal invoices:', error.message);
  else console.log(`\nOK invoices: ${count} baris di-upsert`);
}

// 2. invoice_detil.csv → invoice_sj
// Hanya ambil detil dari latest revision per invoice_number.
// Jika latest revision tidak punya detil sendiri, fallback ke revisi sebelumnya.
const detilRows = readCsv('scripts/data/invoice_detil.csv');

// Cari latest invoice_id untuk setiap invoice_number
const latestByNum = {};
invRows.forEach(r => {
  const rev = Number(r.revision_no) || 0;
  const existing = latestByNum[r.invoice_number];
  if (!existing || rev > (Number(existing.revision_no) || 0)) {
    latestByNum[r.invoice_number] = r;
  }
});

// Kelompokkan detil berdasarkan invoice_id
const detilByInvoiceId = {};
detilRows.forEach(d => {
  if (!detilByInvoiceId[d.invoice_id]) detilByInvoiceId[d.invoice_id] = [];
  detilByInvoiceId[d.invoice_id].push(d);
});

// Untuk setiap invoice_number, pilih detil dari latest revision.
// Jika latest tidak punya detil, gunakan detil dari revisi sebelumnya (descending revision_no)
const detilForLatest = [];
const usedInvoiceNums = new Set();
Object.keys(latestByNum).forEach(num => {
  const revisions = invRows.filter(r => r.invoice_number === num).sort((a, b) => Number(b.revision_no) - Number(a.revision_no));
  let chosen = null;
  for (const rev of revisions) {
    const det = detilByInvoiceId[rev.id] || [];
    if (det.length > 0) { chosen = det; break; }
  }
  if (chosen) detilForLatest.push(...chosen);
});

// Buat mapping invoice_id asli → latest invoice_id
const idToLatest = {};
invRows.forEach(r => {
  const latest = latestByNum[r.invoice_number];
  idToLatest[r.id] = latest.id;
  if (r.original_invoice_id) idToLatest[r.original_invoice_id] = latest.id;
});

const detilPayload = detilForLatest.map(r => ({
  invoice_id: idToLatest[r.invoice_id] || r.invoice_id,
  sj_id: r.sj_id,
}));
// Deduplikasi berdasarkan invoice_id + sj_id
const seen = new Set();
const uniquePayload = [];
detilPayload.forEach(p => {
  const key = `${p.invoice_id}|${p.sj_id}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniquePayload.push(p);
  }
});
console.log(`\ninvoice_detil.csv → invoice_sj: ${uniquePayload.length} baris (dari ${detilRows.length} Mentah, ${detilForLatest.length} dari latest revision)\n`);
console.log('Sample 3 baris pertama:');
console.log(JSON.stringify(uniquePayload.slice(0, 3), null, 2));

if (APPLY) {
  const sb = createClient(SUPA_URL, SUPA_KEY);
  const { error, count } = await sb.from('invoice_sj').upsert(uniquePayload, { onConflict: 'invoice_id,sj_id' });
  if (error) console.error('\nGagal invoice_sj:', error.message);
  else console.log(`\nOK invoice_sj: ${count} baris di-upsert`);
}

if (!APPLY) console.log('\nJalankan dengan --apply untuk eksekusi ke database.');