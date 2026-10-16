/* =========================================================
   Perbaiki jenis invoice: 1 customer = Reguler, >1 customer = Gabungan
   ========================================================= */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const url = "https://vqozqgjrqeukqtnlqbto.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA";
const sb = createClient(url, key);
const q = async (table, cols) => {
  const { data, error } = await sb.from(table).select(cols);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};

const inv = await q("invoices", "id,no,jenis,customer_id");
const sjlink = await q("invoice_sj", "invoice_id,sj_id");
const sj = await q("surat_jalan", "id,customer_id");

const linkByInv = new Map();
for (const l of sjlink) {
  const arr = linkByInv.get(l.invoice_id) ?? [];
  arr.push(l.sj_id);
  linkByInv.set(l.invoice_id, arr);
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

let changes = 0;
for (const i of inv) {
  const links = linkByInv.get(i.id) ?? [];
  const distinctCust = [...new Set(links.map((lid) => sj.find((s) => s.id === lid)?.customer_id).filter(Boolean))];
  const expected = distinctCust.length > 1 ? "Gabungan" : "Reguler";
  if (i.jenis !== expected) {
    console.log(`  ${i.no}: ${i.jenis} -> ${expected} (${distinctCust.length} customer)`);
    if (APPLY) {
      const { error } = await sb.from("invoices").update({ jenis: expected }).eq("id", i.id);
      if (error) console.log(`    [ERR] ${error.message}`);
      else changes++;
    }
  } else {
    console.log(`  ${i.no}: ${i.jenis} (OK, ${distinctCust.length} customer)`);
  }
}

if (!APPLY) {
  console.log("\nJalankan dengan --apply untuk memperbaiki.");
  process.exit(0);
}
console.log(`\n${changes} invoice diperbaiki.`);