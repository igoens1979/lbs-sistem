import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const inv = (await sb.from('invoices').select('id,no,dpp,ppn,total,ppn_rate')).data;
const sjlink = (await sb.from('invoice_sj').select('invoice_id,sj_id')).data;
const sj = (await sb.from('surat_jalan').select('id,no,volume,trips,price')).data;

const sjById = new Map(sj.map(s => [s.id, s]));
const linkByInv = new Map();
sjlink.forEach(l => {
  const arr = linkByInv.get(l.invoice_id) ?? [];
  arr.push(l.sj_id);
  linkByInv.set(l.invoice_id, arr);
});

console.log('Invoice dengan TOTAL TIDAK COCOK:\n');
let count = 0;
for (const i of inv) {
  const links = linkByInv.get(i.id) ?? [];
  const rows = links.map(id => sjById.get(id)).filter(Boolean);
  if (rows.length === 0) continue;
  const computedDpp = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const rate = i.ppn_rate ?? 0.11;
  const computedPpn = Math.round(computedDpp * rate);
  const computedTotal = computedDpp + computedPpn;
  if (computedTotal !== i.total) {
    count++;
    console.log(`${i.no}`);
    console.log(`  DB:  DPP=${i.dpp} PPN=${i.ppn} TOTAL=${i.total}`);
    console.log(`  SJ:  DPP=${computedDpp} PPN=${computedPpn} TOTAL=${computedTotal}`);
    console.log(`  Selisih: DPP=${i.dpp - computedDpp} TOTAL=${i.total - computedTotal}\n`);
  }
}
console.log(`Total invoice tidak cocok: ${count}`);