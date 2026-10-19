import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Cek struktur payments
const { data: paySample, error } = await sb.from('payments').select('*').limit(1);
console.log('Payments columns:', paySample?.[0] ? Object.keys(paySample[0]) : 'table kosong');

// Cek accounts
const { data: accounts } = await sb.from('accounts').select('id,code,name');
console.log('\nAccounts:');
accounts?.forEach(a => console.log(`  ${a.id} ${a.code} ${a.name}`));

// Cek CSV invoice.csv header
import { readFileSync } from 'fs';
const csv = readFileSync('scripts/data/invoice.csv', 'utf8').trim().split('\n');
console.log('\nCSV invoice.csv columns:', csv[0]);