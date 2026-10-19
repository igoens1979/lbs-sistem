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

// Kelompokkan detil berdasarkan invoice_number (melalui invoice_id)
const detByInvoiceNum = {};
detilRows.forEach(d => {
  const inv = invRows.find(r => r.id === d.invoice_id);
  if (!inv) return;
  const num = inv.invoice_number;
  if (!detByInvoiceNum[num]) detByInvoiceNum[num] = [];
  detByInvoiceNum[num].push(d);
});

// Cek: untuk setiap invoice_number, apakah latest revision punya detil?
console.log('Invoice_number | Latest_id | Latest_detil_count | Total_detil_all_revisi');
for (const num of Object.keys(detByInvoiceNum)) {
  const latest = latestByNum[num];
  const latestDet = detByInvoiceNum[num].filter(d => d.invoice_id === latest.id);
  const totalDet = detByInvoiceNum[num].length;
  if (latestDet.length !== totalDet) {
    console.log(`${num} | ${latest.id} | ${latestDet.length} | ${totalDet}  <-- PERLU MAPPING`);
  }
}