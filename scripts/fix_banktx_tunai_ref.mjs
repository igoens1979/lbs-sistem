import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const APPLY = process.argv.includes("--apply");
const dayDiff = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000;

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
  const n = sjs.length;
  let bestPerm = null, bestCost = Infinity;
  for (const perm of permute([...Array(n).keys()])) {
    let cost = 0;
    for (let i = 0; i < n; i++) cost += dayDiff(sjs[i].sj_date, pays[perm[i]].pay_date);
    if (cost < bestCost) { bestCost = cost; bestPerm = perm; }
  }
  return bestPerm;
}

// 1. SJ Dibayar (dengan id unik)
const { data: sj } = await sb.from("surat_jalan").select("id,no,sj_date,volume,trips,price,receipt_id,customer_id").eq("status", "Dibayar").like("receipt_id", "NT/LBS/%");
const sjList = sj ?? [];
const sjById = new Map(sjList.map((s) => [s.id, s]));

// 2. Payments (ref = no SJ)
const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date").like("ref", "SJ/LBS/%");
const payments = pay ?? [];

// 3. Optimal match payment <-> SJ per amount group -> payId -> sjId
const groups = new Map();
for (const s of sjList) {
  const amt = s.volume * s.trips * s.price;
  if (!groups.has(amt)) groups.set(amt, { sjs: [], pays: [] });
  groups.get(amt).sjs.push(s);
}
for (const p of payments) {
  if (!groups.has(p.amount)) groups.set(p.amount, { sjs: [], pays: [] });
  groups.get(p.amount).pays.push(p);
}
const payToSj = new Map();
for (const [amt, g] of groups) {
  if (g.sjs.length === 0 || g.sjs.length !== g.pays.length) continue;
  const perm = bestAssignment(g.sjs, g.pays);
  for (let i = 0; i < g.sjs.length; i++) payToSj.set(g.pays[perm[i]].id, g.sjs[i].id);
}

// 4. Customers
const { data: cust } = await sb.from("customers").select("id,name");
const custName = new Map((cust ?? []).map((c) => [c.id, c.name]));

// 5. bank_tx tunai
const { data: btx } = await sb.from("bank_tx").select("id,tx_date,keterangan,jumlah,ref,kategori").order("tx_date");
const bankTx = (btx ?? []).filter((b) => (b.kategori || "").includes("Tunai") || (b.ref || "").startsWith("NT/LBS/") || (b.ref || "").startsWith("SJ/LBS/"));

const usedPay = new Set();
const plan = [];
for (const b of bankTx) {
  const cands = payments.filter((p) => !usedPay.has(p.id) && p.amount === b.jumlah);
  if (cands.length === 0) { console.log(`!! TIDAK DITEMUKAN payment untuk bank_tx ${b.id} amt=${b.jumlah} tgl=${b.tx_date}`); continue; }
  cands.sort((a, b2) => dayDiff(b.tx_date, a.pay_date) - dayDiff(b.tx_date, b2.pay_date));
  const p = cands[0];
  usedPay.add(p.id);
  const sjId = payToSj.get(p.id);
  if (!sjId) { console.log(`!! payment ${p.id} tidak terhubung ke SJ`); continue; }
  const s = sjById.get(sjId);
  const note = s.receipt_id;
  const cn = custName.get(s.customer_id) ?? "";
  plan.push({ btxId: b.id, txDate: b.tx_date, amt: b.jumlah, oldRef: b.ref, sjNo: s.no, note, payDate: p.pay_date, newRef: s.no, newKet: `Penerimaan tunai ${note} - ${cn}`.trim() });
}

plan.sort((a, b) => a.txDate.localeCompare(b.txDate) || a.sjNo.localeCompare(b.sjNo));
console.log(`SJ=${sjList.length} | payments=${payments.length} | payToSj=${payToSj.size} | bank_tx tunai=${bankTx.length} | planned=${plan.length}`);
console.log("\n=== DRY-RUN update bank_tx tunai ===");
let err = 0;
for (const p of plan) {
  const flag = p.payToSjMissing ? " <-- payNotLinked" : "";
  console.log(`${p.txDate} amt=${String(p.amt).padEnd(7)} ref ${String(p.oldRef).padEnd(24)} -> ${p.newRef.padEnd(26)} | nota ${p.note} | SJ ${p.sjNo} | ket: ${p.newKet}${flag}`);
  if (flag) err++;
}
console.log(err === 0 ? "\nSemua pencocokan valid." : `${err} pencocokan bermasalah.`);

if (!APPLY) { console.log("\n[DRY-RUN] Jalankan ulang dengan --apply."); process.exit(0); }

let ok = 0, fail = 0;
for (const p of plan) {
  const { error } = await sb.from("bank_tx").update({ ref: p.newRef, keterangan: p.newKet }).eq("id", p.btxId);
  if (error) { fail++; console.log(`GAGAL ${p.btxId}: ${error.message}`); } else ok++;
}
console.log(`\nSelesai. Berhasil=${ok} Gagal=${fail}`);