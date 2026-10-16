/* =========================================================
   Hapus invoice tanpa surat jalan (orphan).
   Invoice 0009 & 0010 tidak ada SJ yang tertaut.
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

const inv = await q("invoices", "id,no,dpp,ppn,total,status");
const sjlink = await q("invoice_sj", "invoice_id,sj_id");
const pay = await q("payments", "invoice_id,amount");

const linkByInv = new Map();
for (const l of sjlink) {
  const arr = linkByInv.get(l.invoice_id) ?? [];
  arr.push(l.sj_id);
  linkByInv.set(l.invoice_id, arr);
}
const paidByInv = new Map();
for (const p of pay) paidByInv.set(p.invoice_id, (paidByInv.get(p.invoice_id) ?? 0) + p.amount);

const orphan = inv.filter((i) => !linkByInv.get(i.id)?.length);
console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);
console.log(`Invoice tanpa SJ (orphan): ${orphan.length}`);
for (const o of orphan) {
  const paid = paidByInv.get(o.id) ?? 0;
  console.log(`  ${o.no.padEnd(30)} DPP ${o.dpp} PPN ${o.ppn} TOTAL ${o.total} | dibayar ${paid} | status ${o.status}`);
}

if (!APPLY) {
  console.log("\nJalankan dengan --apply untuk menghapus.");
  process.exit(0);
}

let ok = 0;
for (const o of orphan) {
  // hapus payments dulu (jika ada)
  const { error: pErr } = await sb.from("payments").delete().eq("invoice_id", o.id);
  if (pErr) console.log(`  [ERR] hapus pembayaran ${o.no}: ${pErr.message}`);
  const { error: rErr } = await sb.from("invoice_revisions").delete().eq("invoice_id", o.id);
  if (rErr) console.log(`  [ERR] hapus revisi ${o.no}: ${rErr.message}`);
  const { error: iErr } = await sb.from("invoices").delete().eq("id", o.id);
  if (iErr) console.log(`  [ERR] hapus invoice ${o.no}: ${iErr.message}`);
  else { console.log(`  [OK] ${o.no} dihapus.`); ok++; }
}
console.log(`Selesai: ${ok} invoice dihapus.`);