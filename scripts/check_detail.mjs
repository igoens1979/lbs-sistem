import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

(async () => {
  const inv = (await sb.from('invoices').select('id,no,dpp,total')).data;
  const sjlink = (await sb.from('invoice_sj').select('invoice_id,sj_id')).data;
  const sj = (await sb.from('surat_jalan').select('id,no,volume,trips,price,customer_id')).data;
  const cust = (await sb.from('customers').select('id,name')).data;

  const sjById = new Map(sj.map(s => [s.id, s]));
  const custName = (id) => cust.find(c => c.id === id)?.name ?? id;

  const targets = ['INV046/LBS/IX/2026', 'INV003/WARGA-RAONG/IX/2026', 'INV004/WARGA-RAONG/IX/2026'];

  for (const no of targets) {
    const invRow = inv.find(i => i.no === no);
    if (!invRow) continue;
    const links = sjlink.filter(l => l.invoice_id === invRow.id).map(l => l.sj_id);
    console.log(`\n${no} (CSV total=${invRow.total})`);
    console.log(`  SJ terhubung: ${links.length}`);
    let sum = 0;
    for (const id of links) {
      const s = sjById.get(id);
      if (!s) continue;
      const val = s.volume * s.trips * s.price;
      sum += val;
      console.log(`    ${s.no} vol=${s.volume} x${s.trips} @ ${s.price} = ${val} | ${custName(s.customer_id)}`);
    }
    console.log(`  Total SJ: ${sum} | Selisih: ${invRow.total - sum}`);
  }
})();