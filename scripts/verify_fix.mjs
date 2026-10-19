import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

(async () => {
  const inv = (await sb.from('invoices').select('id,no')).data;
  const sjlink = (await sb.from('invoice_sj').select('invoice_id,sj_id')).data;
  const sj = (await sb.from('surat_jalan').select('id,no')).data;

  const sjById = new Map(sj.map(s => [s.id, s]));
  const linkByInv = new Map();
  sjlink.forEach(l => {
    const arr = linkByInv.get(l.invoice_id) ?? [];
    arr.push(l.sj_id);
    linkByInv.set(l.invoice_id, arr);
  });

  console.log(`Invoices: ${inv.length}`);
  console.log(`invoice_sj links: ${sjlink.length}`);

  const inv046 = inv.find(i => i.no === 'INV046/LBS/IX/2026');
  if (inv046) {
    const links = linkByInv.get(inv046.id) ?? [];
    console.log(`\nINV046/LBS/IX/2026: ${links.length} SJ`);
    links.forEach(id => console.log(`  ${sjById.get(id)?.no}`));
  }

  const inv003 = inv.find(i => i.no === 'INV003/WARGA-RAONG/IX/2026');
  const inv004 = inv.find(i => i.no === 'INV004/WARGA-RAONG/IX/2026');
  console.log(`\nINV003: ${inv003 ? 'ada' : 'tidak ada'}`);
  console.log(`INV004: ${inv004 ? 'ada' : 'tidak ada'}`);
})();