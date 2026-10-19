import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const APPLY = process.argv.includes('--apply');
const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

function toDate(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1]))).toISOString().slice(0, 10);
  }
  return null;
}

function mapMethod(v) {
  if (!v) return "Transfer";
  const m = String(v).trim().toUpperCase();
  if (m.includes("CASH") || m === "CASH") return "Tunai";
  if (m.includes("GIRO")) return "Giro";
  return "Transfer";
}

function mapAccount(v) {
  if (!v) return "A-002";
  const a = String(v).trim().toUpperCase();
  if (a.includes("MANDIRI")) return "A-002";
  if (a.includes("BRI")) return "A-002";
  if (a.includes("BCA")) return "A-001";
  return "A-002";
}

function uid(prefix) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

const text = readFileSync('scripts/data/invoice.csv', 'utf8');
const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

const { data: invRows } = await sb.from('invoices').select('id,no');
const invById = new Map(invRows.map(i => [i.id, i]));

const latestByNum = {};
rows.forEach(r => {
  const rev = Number(r.revision_no) || 0;
  const existing = latestByNum[r.invoice_number];
  if (!existing || rev > (Number(existing.revision_no) || 0)) {
    latestByNum[r.invoice_number] = r;
  }
});

const payPayload = [];
let skipped = 0;
for (const r of rows) {
  if (!r.payment_date || !r.payment_date.trim()) continue;
  const latest = latestByNum[r.invoice_number];
  if (!latest) continue;
  const inv = invById.get(latest.id);
  if (!inv) { skipped++; continue; }
  const amount = Number(String(r.grand_total).replace(/[^0-9.,-]/g, '').replace(',', '.'));
  if (isNaN(amount) || amount <= 0) continue;
  payPayload.push({
    id: uid("PAY"),
    invoice_id: inv.id,
    pay_date: toDate(r.payment_date),
    amount,
    method: mapMethod(r.payment_method),
    account_id: mapAccount(r.payment_account),
    ref: r.payment_reference?.trim() || `TRF/${inv.no}/PT`,
  });
}

console.log(`Payment payload: ${payPayload.length} baris`);
console.log(`Skipped: ${skipped}`);
console.log('\nSample 3:');
console.log(JSON.stringify(payPayload.slice(0, 3), null, 2));

if (APPLY && payPayload.length > 0) {
  const invIds = [...new Set(payPayload.map(p => p.invoice_id))];
  await sb.from('payments').delete().in('invoice_id', invIds);
  const { error, count } = await sb.from('payments').insert(payPayload);
  if (error) console.error('\nGagal payments:', error.message);
  else console.log(`\nOK payments: ${count} baris di-insert`);
}