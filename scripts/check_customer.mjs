import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Cek constraint customer_id di tabel invoices
const { data, error } = await sb.from('invoices').select('customer_id').limit(1);
if (error) {
  console.log('ERR:', error.message);
} else {
  console.log('Sample customer_id:', data[0]?.customer_id);
}

// Cek 8 baris dengan customer_id kosong di CSV
import fs from 'fs';
import { parse } from 'csv-parse/sync';
const invRows = parse(fs.readFileSync('scripts/data/invoice.csv','utf8'), { columns: true });
const emptyCust = invRows.filter(r => !r.customer_id);
console.log('\n8 baris dengan customer_id kosong:');
emptyCust.forEach(r => console.log(`  ${r.invoice_number} | ${r.customer_name} | ${r.status}`));