import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: dbInvs } = await sb.from('invoices').select('id,no');
const dbIds = new Set(dbInvs.map(r => r.id));

const detilRows = parse(fs.readFileSync('scripts/data/invoice_detil.csv','utf8'), { columns: true });

const badIds = new Set();
detilRows.forEach(r => {
  if (!dbIds.has(r.invoice_id)) {
    badIds.add(r.invoice_id);
  }
});

console.log(`invoice_id di invoice_detil.csv yang tidak ada di database: ${badIds.size}`);
badIds.forEach(id => console.log(`  ${id}`));