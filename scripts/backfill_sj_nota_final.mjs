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

const { data: sj } = await sb
  .from("surat_jalan")
  .select("id,no,sj_date,volume,trips,price,status,receipt_id")
  .eq("status", "Dibayar")
  .like("receipt_id", "NT/LBS/%");

const sjNos = new Set((sj ?? []).map((s) => s.no));
const { data: allpay } = await sb.from("payments").select("id,ref,amount,pay_date");
const payments = (allpay ?? []).filter((p) => sjNos.has(p.ref));

const groups = new Map();
for (const s of sj ?? []) {
  const amt = s.volume * s.trips * s.price;
  if (!groups.has(amt)) groups.set(amt, { sjs: [], pays: [] });
  groups.get(amt).sjs.push({ ...s, amt });
}
for (const p of payments) {
  if (!groups.has(p.amount)) groups.set(p.amount, { sjs: [], pays: [] });
  groups.get(p.amount).pays.push(p);
}

let mappingComplete = true;
const pairs = [];
for (const [amt, g] of groups) {
  if (g.sjs.length === 0) continue;
  if (g.sjs.length !== g.pays.length) { mappingComplete = false; console.log(`!! amount ${amt} tidak seimbang sjs=${g.sjs.length} pays=${g.pays.length}`); continue; }
  const perm = bestAssignment(g.sjs, g.pays);
  for (let i = 0; i < g.sjs.length; i++) pairs.push({ sj: g.sjs[i], pay: g.pays[perm[i]] });
}

// Urutkan semua pasangan berdasarkan tanggal pembayaran asc sebelum nomor ditetapkan.
pairs.sort((a, b) => a.pay.pay_date.localeCompare(b.pay.pay_date) || a.sj.sj_date.localeCompare(b.sj.sj_date) || a.sj.no.localeCompare(b.sj.no));

const byMonth = new Map();
for (const pr of pairs) {
  const ym = pr.pay.pay_date.slice(0, 7);
  const arr = byMonth.get(ym) ?? [];
  arr.push(pr);
  byMonth.set(ym, arr);
}

const plan = [];
for (const [ym, arr] of byMonth) {
  const [yyyy, mm] = ym.split("-");
  let k = 0;
  for (const pr of arr) {
    k++;
    const seq = String(k).padStart(4, "0");
    plan.push({
      sjId: pr.sj.id, sjNo: pr.sj.no, sjDate: pr.sj.sj_date, sjAmt: pr.sj.amt,
      payId: pr.pay.id, payDate: pr.pay.pay_date, payAmt: pr.pay.amount,
      receiptBaru: `NT/LBS/${yyyy}/${mm}/${seq}`, sjRef: pr.sj.no,
    });
  }
}
plan.sort((a, b) => a.payDate.localeCompare(b.payDate) || a.sjDate.localeCompare(b.sjDate) || a.sjNo.localeCompare(b.sjNo));

console.log(`SJ=${sj ? sj.length : 0} | tunai payments=${payments.length} | pairs=${pairs.length} | complete=${mappingComplete}`);
console.log("\n=== DRY-RUN renumber berdasar tanggal pembayaran (asc) ===");
let inversi = 0;
for (let i = 0; i < plan.length; i++) {
  const p = plan[i];
  const flag = i > 0 && p.payDate < plan[i - 1].payDate ? "  <-- INVERSI" : "";
  if (flag) inversi++;
  console.log(`${p.receiptBaru} | bayar ${p.payDate} | SJ ${p.sjNo.padEnd(24)} ${p.sjDate} amt=${p.sjAmt} | ref=${p.sjRef}${flag}`);
}
console.log(inversi === 0 ? "\nTidak ada inversi nomor vs tanggal." : `\n${inversi} inversi.`);

if (!APPLY) { console.log("\n[DRY-RUN] Jalankan ulang dengan --apply."); process.exit(0); }

let ok = 0, fail = 0;
for (const p of plan) {
  const { error: e1 } = await sb.from("payments").update({ ref: p.sjRef }).eq("id", p.payId);
  const { error: e2 } = await sb.from("surat_jalan").update({ receipt_id: p.receiptBaru }).eq("id", p.sjId);
  if (e1 || e2) { fail++; console.log(`GAGAL ${p.sjNo}: ${e1?.message ?? e2?.message}`); } else ok++;
}
console.log(`\nSelesai. Berhasil=${ok} Gagal=${fail}`);