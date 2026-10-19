import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const cust = await sb.from('customers').select('id,name');
const sj = await sb.from('surat_jalan').select('id,no');

const invRows = parse(fs.readFileSync('scripts/data/invoice.csv','utf8'), { columns: true });
const detilRows = parse(fs.readFileSync('scripts/data/invoice_detil.csv','utf8'), { columns: true });

const custIds = new Set(cust.data.map(c => c.id));
const sjIds = new Set(sj.data.map(s => s.id));

const badCust = invRows.filter(r => !custIds.has(r.customer_id));
const badSj = detilRows.filter(r => !sjIds.has(r.sj_id));

console.log(`Total invoice.csv: ${invRows.length} baris`);
console.log(`Total invoice_detil.csv: ${detilRows.length} baris\n`);

console.log(`customer_id tidak match di tabel customers: ${badCust.length} baris`);
if (badCust.length) {
  console.log('Contoh:');
  badCust.slice(0, 5).forEach(r => console.log(`  ${r.invoice_number} → customer_id=${r.customer_id}`));
}

console.log(`\nsj_id tidak match di tabel surat_jalan: ${badSj.length} baris`);
if (badSj.length) {
  console.log('Contoh:');
  badSj.slice(0, 5).forEach(r => console.log(`  invoice_id=${r.invoice_id} → sj_id=${r.sj_id}`));
}