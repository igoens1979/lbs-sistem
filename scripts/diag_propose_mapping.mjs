import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj } = await sb.from("surat_jalan").select("id,no,sj_date,volume,trips,price,status");
const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date").like("ref", "NT/LBS/%");

const dayDiff = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000;
const dibayar = sj.filter((r) => r.status === "Dibayar").map((r) => ({ ...r, amt: r.volume * r.trips * r.price }));
const payments = pay ?? [];

function permute(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permute(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

function bestAssignment(sjs, pays) {
  // returns array: for each sj index, the assigned pay index, minimizing total date diff
  const n = sjs.length;
  let bestPerm = null;
  let bestCost = Infinity;
  for (const perm of permute([...Array(n).keys()])) {
    let cost = 0;
    for (let i = 0; i < n; i++) cost += dayDiff(sjs[i].sj_date, pays[perm[i]].pay_date);
    if (cost < bestCost) { bestCost = cost; bestPerm = perm; }
  }
  return { perm: bestPerm, cost: bestCost };
}

const groups = new Map();
for (const r of dibayar) {
  if (!groups.has(r.amt)) groups.set(r.amt, { sjs: [], pays: [] });
  groups.get(r.amt).sjs.push(r);
}
for (const p of payments) {
  if (!groups.has(p.amount)) groups.set(p.amount, { sjs: [], pays: [] });
  groups.get(p.amount).pays.push(p);
}

const result = [];
const imbalanced = [];
for (const [amt, g] of groups) {
  if (g.sjs.length === 0) continue;
  if (g.sjs.length !== g.pays.length) { imbalanced.push({ amt, ...g }); continue; }
  const { perm, cost } = bestAssignment(g.sjs, g.pays);
  for (let i = 0; i < g.sjs.length; i++) {
    const s = g.sjs[i];
    const p = g.pays[perm[i]];
    result.push({ no: s.no, sj_date: s.sj_date, amt, receipt: p.ref, pay_date: p.pay_date, pay_id: p.id, days: Math.round(dayDiff(s.sj_date, p.pay_date)) });
  }
}

result.sort((a, b) => a.no.localeCompare(b.no));
console.log(`SJ Dibayar=${dibayar.length} | payments NT=${payments.length}`);
console.log("=== Proposed mapping (1-1 by amount + nearest date) ===");
for (const r of result) {
  const warn = r.days > 5 ? "  <-- JARAK TGL BESAR" : "";
  console.log(`${r.no.padEnd(22)} SJ ${r.sj_date} amt=${String(r.amt).padEnd(9)} => ${r.receipt.padEnd(22)} pay ${r.pay_date} (D{r.days})${warn}`);
}

const matched = new Set(result.map((r) => r.pay_id));
console.log("\n=== Payments tidak terpakai ===");
for (const p of payments) if (!matched.has(p.id)) console.log(`UNMATCHED ${p.ref} ${p.pay_date} amt=${p.amount}`);

if (imbalanced.length) {
  console.log("\n=== Grup tidak seimbang ===");
  for (const g of imbalanced) {
    console.log(`amount ${g.amt}: SJs=${g.sjs.length} PAY=${g.pays.length}`);
    console.log("  SJs:", g.sjs.map((s) => s.no + " " + s.sj_date).join(", "));
    console.log("  PAY:", g.pays.map((p) => p.ref + " " + p.pay_date).join(", "));
  }
}