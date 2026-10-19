import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const text = readFileSync('scripts/data/invoice.csv', 'utf8');
const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

console.log(`Total invoice: ${rows.length}\n`);

let withPayment = 0;
let withoutPayment = 0;
const methods = new Set();
const accounts = new Set();

rows.forEach(r => {
  if (r.payment_date && r.payment_date.trim()) {
    withPayment++;
    methods.add(r.payment_method);
    accounts.add(r.payment_account);
  } else {
    withoutPayment++;
  }
});

console.log(`Invoice dengan pembayaran: ${withPayment}`);
console.log(`Invoice tanpa pembayaran: ${withoutPayment}`);
console.log(`\nMetode pembayaran:`, [...methods]);
console.log(`Akun pembayaran:`, [...accounts]);

// Sample 5 invoice dengan pembayaran
console.log('\nSample invoice dengan pembayaran:');
let count = 0;
for (const r of rows) {
  if (r.payment_date && r.payment_date.trim() && count < 5) {
    console.log(`  ${r.invoice_number} | ${r.payment_date} | ${r.payment_method} | ${r.payment_reference} | ${r.payment_account} | total=${r.grand_total}`);
    count++;
  }
}