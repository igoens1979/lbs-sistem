/* =========================================================
   Migrasi kas_transaksi.csv -> Supabase bank_tx
   -dry-run (default): preview data saja
   --apply            : menulis ke database
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

const sb = createClient(SUPA_URL, SUPA_KEY);
const { data: accounts, error: accErr } = await sb.from('accounts').select('id,name,code');
if (accErr) { console.error('Gagal ambil accounts:', accErr.message); process.exit(1); }
const nameToId = {};
accounts.forEach(a => { nameToId[a.name.toLowerCase()] = a.id; nameToId[a.code.toLowerCase()] = a.id; });
// alias dari CSV
nameToId['mandiri'] = nameToId['bank mandiri'];
nameToId['bca'] = nameToId['bank bca'];
nameToId['kas'] = nameToId['kas operasional lapangan'];
nameToId['kas_kecil'] = nameToId['kas operasional lapangan'];

console.log(`Mode: ${APPLY ? 'APPLY (menulis ke database)' : 'DRY-RUN (preview only)'}\n`);
console.log(`Accounts loaded: ${accounts.length}\n`);

const rows = readCsv('scripts/data/kas_transaksi.csv');
console.log(`kas_transaksi.csv: ${rows.length} baris\n`);

const missingAccounts = new Set();
const payload = rows.map(r => {
  const akunKey = String(r.akun || '').toLowerCase();
  const accountId = nameToId[akunKey];
  if (!accountId) missingAccounts.add(r.akun);
  const jenis = String(r.jenis || '').toUpperCase();
  const arah = jenis.includes('KELUAR') || jenis.includes('OUT') ? 'out' : 'in';
  return {
    id: r.id,
    account_id: accountId,
    tx_date: toDate(r.tanggal),
    keterangan: r.keterangan || r.pihak || '',
    kategori: r.kategori || '',
    arah,
    jumlah: toNum(r.nominal),
    alokasi: (r.pt_pemilik || 'LBS').toUpperCase() === 'KMS' ? 'KMS' : 'LBS',
    ref: r.nomor_transaksi || null,
    created_at: toTimestamp(r.created_at),
  };
});

if (missingAccounts.size) {
  console.error('Akun tidak ditemukan di database:', [...missingAccounts]);
  process.exit(1);
}

console.log('Sample 3 baris pertama:');
console.log(JSON.stringify(payload.slice(0, 3), null, 2));

if (APPLY) {
  const ids = payload.map(p => p.id);
  const { data: old } = await sb.from('bank_tx').select('id').in('id', ids);
  if (old && old.length) {
    await sb.from('bank_tx').delete().in('id', old.map(r => r.id));
    console.log(`Hapus ${old.length} baris lama dengan id sama\n`);
  }
  const { error, count } = await sb.from('bank_tx').upsert(payload, { onConflict: 'id' });
  if (error) console.error('\nGagal bank_tx:', error.message);
  else console.log(`\nOK bank_tx: ${count} baris di-upsert`);
}

if (!APPLY) console.log('\nJalankan dengan --apply untuk eksekusi ke database.');
