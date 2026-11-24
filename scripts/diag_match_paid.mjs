import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj } = await sb.from("surat_jalan").select("id,no,sj_date,volume,trips,price,status,receipt_id");
const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date,method").like("ref", "NT/LBS/%");

const dibayar = sj.filter((r) => r.status === "Dibayar");
console.log("=== 16 SJ Dibayar: amount = vol*trips*price ===");
for (const r of dibayar) {
  const amt = r.volume * r.trips * r.price;
  console.log(`${r.no.padEnd(22)} ${r.sj_date} vol=${r.volume} x${r.trips} x ${r.price} = ${amt}  receipt_id=${r.receipt_id}`);
}

console.log("\n=== 16 Cash receipts NT/LBS ===");
for (const p of pay) console.log(`${p.ref.padEnd(22)} ${p.pay_date} amt=${p.amount} id=${p.id.slice(0,8)}`);

// Try matching by amount
console.log("\n=== Matching by amount ===");
const payByAmt = new Map();
for (const p of pay) {
  const arr = payByAmt.get(p.amount) ?? [];
  arr.push(p);
  payByAmt.set(p.amount, arr);
}
for (const r of dibayar) {
  const amt = r.volume * r.trips * r.price;
  const cands = payByAmt.get(amt) ?? [];
  console.log(`${r.no.padEnd(22)} amt=${amt} -> candidates: ${cands.map((c) => c.ref + " " + c.pay_date).join(" | ") || "NONE"}`);
}