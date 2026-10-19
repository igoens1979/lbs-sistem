import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

console.log('Mengosongkan tabel invoice terkait...\n');

// Hapus payments
const { error: e1, count: p1 } = await sb.from('payments').delete().neq('id', '');
console.log(`Payments direset: ${p1} baris diubah`);

// Hapus invoice_sj
const { error: e2, count: p2 } = await sb.from('invoice_sj').delete().neq('invoice_id', '');
console.log(`invoice_sj direset: ${p2} baris diubah`);

// Hapus invoice_revisions
const { error: e3, count: p3 } = await sb.from('invoice_revisions').delete().neq('id', '');
console.log(`invoice_revisions direset: ${p3} baris diubah`);

// Hapus invoices
const { error: e4, count: p4 } = await sb.from('invoices').delete().neq('id', '');
console.log(`invoices direset: ${p4} baris diubah`);

// Reset surat_jalan.invoice_id
const { error: e5, count: p5 } = await sb.from('surat_jalan').update({ invoice_id: null, status: 'Terkirim' }).neq('id', '');
console.log(`surat_jalan direset: ${p5} baris diubah`);

if (e1 || e2 || e3 || e4 || e5) {
  console.log('\nError:', e1 || e2 || e3 || e4 || e5);
  process.exit(1);
}

console.log('\nSelesai mengosongkan tabel invoice.');