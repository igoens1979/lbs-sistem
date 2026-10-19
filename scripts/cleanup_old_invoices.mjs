import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Hapus invoice lama (INV/LBS/2026/10/0001, 0002, 0003)
const oldNos = [
  'INV/LBS/2026/10/0001',
  'INV/LBS/2026/10/0002',
  'INV/LBS/2026/10/0003'
];

const { data: oldInvs, error: e1 } = await sb.from('invoices').select('id,no').in('no', oldNos);
if (e1) {
  console.log('ERR select:', e1.message);
  process.exit(1);
}
console.log('Invoice lama yang akan dihapus:', oldInvs.length);
oldInvs.forEach(r => console.log(`  ${r.no} | id=${r.id}`));

const oldIds = oldInvs.map(r => r.id);

// Hapus payments terkait
const { error: e2, count: pCount } = await sb.from('payments').delete().in('invoice_id', oldIds);
if (e2) console.log('ERR hapus payments:', e2.message);
else console.log(`Hapus ${pCount} payments\n`);

// Hapus invoice_sj terkait
const { error: e3, count: sCount } = await sb.from('invoice_sj').delete().in('invoice_id', oldIds);
if (e3) console.log('ERR hapus invoice_sj:', e3.message);
else console.log(`Hapus ${sCount} invoice_sj links\n`);

// Hapus invoice_revisions terkait
const { error: e4, count: rCount } = await sb.from('invoice_revisions').delete().in('invoice_id', oldIds);
if (e4) console.log('ERR hapus invoice_revisions:', e4.message);
else console.log(`Hapus ${rCount} invoice_revisions\n`);

// Hapus invoice
const { error: e5, count: iCount } = await sb.from('invoices').delete().in('id', oldIds);
if (e5) console.log('ERR hapus invoices:', e5.message);
else console.log(`Hapus ${iCount} invoice\n`);

console.log('Selesai menghapus invoice lama.');