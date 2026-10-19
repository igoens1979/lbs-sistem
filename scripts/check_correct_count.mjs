import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

function readCsv(path) {
  const text = readFileSync(path, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

const invRows = readCsv('scripts/data/invoice.csv');
const detilRows = readCsv('scripts/data/invoice_detil.csv');

// Tentukan latest invoice_id per invoice_number
const latestByNum = {};
invRows.forEach(r => {
  const rev = Number(r.revision_no) || 0;
  const existing = latestByNum[r.invoice_number];
  if (!existing || rev > (Number(existing.revision_no) || 0)) {
    latestByNum[r.invoice_number] = r;
  }
});

// Hanya kirim detil dari latest revision
const latestIds = new Set(Object.values(latestByNum).map(r => r.id));
const correctDetil = detilRows.filter(d => latestIds.has(d.invoice_id));

// Deduplikasi
const seen = new Set();
const unique = [];
correctDetil.forEach(d => {
  const key = `${d.invoice_id}|${d.sj_id}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(d);
  }
});

console.log(`Total detil dari latest revision: ${unique.length} (dari ${detilRows.length} mentah)`);

// Per invoice_number
const byNum = {};
unique.forEach(d => {
  const inv = invRows.find(r => r.id === d.invoice_id);
  const num = inv.invoice_number;
  if (!byNum[num]) byNum[num] = [];
  byNum[num].push(d);
});

console.log(`\nPer invoice_number:`);
for (const num of Object.keys(byNum).sort()) {
  const latest = latestByNum[num];
  console.log(`  ${num}: ${byNum[num].length} SJ (latest rev=${latest.revision_no})`);
}