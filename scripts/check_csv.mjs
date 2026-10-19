import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Baca CSV invoice.csv
const invCsvRaw = readFileSync('scripts/data/invoice.csv', 'utf8').trim().split('\n');
const invHdr = invCsvRaw[0].split(',');
const invCsv = invCsvRaw.slice(1).map(l => {
  const o = {};
  invHdr.forEach((h, i) => {
    o[h.trim()] = l.split(',')[i].trim();
  });
  return o;
});

// Baca CSV invoice_detil.csv
const detCsvRaw = readFileSync('scripts/data/invoice_detil.csv', 'utf8').trim().split('\n');
const detHdr = detCsvRaw[0].split(',');
const detCsv = detCsvRaw.slice(1).map(l => {
  const o = {};
  detHdr.forEach((h, i) => {
    o[h.trim()] = l.split(',')[i].trim();
  });
  return o;
});

// Cari invoice_number di CSV invoice
const targets = ['INV046/LBS/IX/2026', 'INV003/WARGA-RAONG/IX/2026', 'INV004/WARGA-RAONG/IX/2026'];
for (const no of targets) {
  const rows = invCsv.filter(r => r.invoice_number === no);
  console.log(`\n=== ${no} ===`);
  console.log(`Jumlah revisi di CSV invoice: ${rows.length}`);
  rows.forEach(r => console.log(`  rev=${r.revision_no} subtotal=${r.subtotal} total=${r.grand_total} id=${r.id}`));

  // Cari detil berdasarkan invoice_number
  const detRows = detCsv.filter(d => d.sj_number && invCsv.some(r => r.id === d.invoice_id && r.invoice_number === no));
  // Alternatif: cari berdasarkan invoice_id yang ada di rows
  const invIds = rows.map(r => r.id);
  const detByInv = detCsv.filter(d => invIds.includes(d.invoice_id));
  console.log(`Jumlah detil (invoice_detil): ${detByInv.length}`);
  detByInv.forEach(d => console.log(`  invoice_id=${d.invoice_id} sj_id=${d.sj_id} sj_number=${d.sj_number} total=${d.total}`));
}