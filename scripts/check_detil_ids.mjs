import fs from 'fs';
import { parse } from 'csv-parse/sync';

const invRows = parse(fs.readFileSync('scripts/data/invoice.csv','utf8'), { columns: true });
const detilRows = parse(fs.readFileSync('scripts/data/invoice_detil.csv','utf8'), { columns: true });

// Buat mapping: ALL invoice_id (lama dan baru) → latest invoice_id
const idMap = {};
invRows.forEach(r => {
  idMap[r.id] = r.id;
  if (r.original_invoice_id) {
    idMap[r.original_invoice_id] = r.id;
  }
});

// Cek invoice_id di invoice_detil.csv yang tidak ada di idMap
const badIds = new Set();
detilRows.forEach(r => {
  if (!idMap[r.invoice_id]) {
    badIds.add(r.invoice_id);
  }
});

console.log(`invoice_id di invoice_detil.csv yang tidak ada di idMap: ${badIds.size}`);
badIds.forEach(id => console.log(`  ${id}`));

// Cek jumlah baris dengan invoice_id tidak valid
const badRows = detilRows.filter(r => !idMap[r.invoice_id]);
console.log(`\nBaris dengan invoice_id tidak valid: ${badRows.length} dari ${detilRows.length}`);