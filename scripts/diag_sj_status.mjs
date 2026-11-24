import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj, error } = await sb
  .from("surat_jalan")
  .select("id,no,sj_date,status,receipt_id,invoice_id,created_at")
  .order("no", { ascending: true });
if (error) throw new Error(error.message);

const { data: pay } = await sb.from("payments").select("id,invoice_id,ref,amount,pay_date,method");
const { data: btx } = await sb.from("bank_tx").select("id,ref,desc,amount,date");

const payRefs = new Set((pay ?? []).map((p) => p.ref).filter(Boolean));

let total = sj.length;
let withReceipt = 0;
let bogusSuffix = 0;
let legitFormat = 0;
let otherFormat = 0;
const statusCount = {};

console.log("TOTAL SJ:", total, "| payments:", (pay ?? []).length, "| bank_tx:", (btx ?? []).length);

for (const r of sj) {
  statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
  if (r.receipt_id != null) {
    withReceipt++;
    const isSuffix = /^\d{4}$/.test(String(r.receipt_id)) && String(r.receipt_id) === r.no.slice(-4);
    const isNt = /^NT\/LBS\//.test(String(r.receipt_id));
    if (isSuffix && !payRefs.has(r.receipt_id)) bogusSuffix++;
    else if (isNt) legitFormat++;
    else otherFormat++;
  }
}

console.log("Status column distribution:", statusCount);
console.log("receipt_id NOT NULL:", withReceipt);
console.log("  - bogus (4-digit suffix, no matching payment):", bogusSuffix);
console.log("  - legit NT/LBS/... format:", legitFormat);
console.log("  - other format:", otherFormat);

console.log("\n--- Detail baris dengan receipt_id (maks 40) ---");
for (const r of sj.filter((x) => x.receipt_id != null).slice(0, 40)) {
  const flag = /^\d{4}$/.test(String(r.receipt_id)) && String(r.receipt_id) === r.no.slice(-4) ? "BOGUS-SUFFIX" : /^NT\/LBS\//.test(String(r.receipt_id)) ? "NT-Format" : "OTHER";
  console.log(`${r.no.padEnd(26)} status=${String(r.status).padEnd(10)} receipt_id=${String(r.receipt_id).padEnd(20)} invoice_id=${r.invoice_id ? "Y" : "-"} [${flag}]`);
}

console.log("\n--- Payments ref yang dipakai (maks 30) ---");
for (const p of (pay ?? []).slice(0, 30)) {
  console.log(`${String(p.ref).padEnd(22)} ${p.pay_date} ${p.method} inv=${p.invoice_id ?? "CASH"} amt=${p.amount}`);
}