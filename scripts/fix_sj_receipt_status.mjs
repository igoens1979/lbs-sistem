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
  let best = null, bestCost = Infinity;
  for (const perm of permute([...Array(n).keys()])) {
    let c = 0;
    for (let i = 0; i < n; i++) c += dayDiff(sjs[i].sj_date, pays[perm[i]].pay_date);
    if (c < bestCost) { bestCost = c; best = perm; }
  }
  return best;
}

const { data: sj, error } = await sb.from("surat_jalan").select("id,no,sj_date,volume,trips,price,status,receipt_id");
if (error) throw new Error(error.message);
const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date").like("ref", "NT/LBS/%");
const payments = pay ?? [];

// Build 1-1 mapping for status = Dibayar
const dibayar = sj.filter((r) => r.status === "Dibayar").map((r) => ({ ...r, amt: r.volume * r.trips * r.price }));
const groups = new Map();
for (const r of dibayar) { if (!groups.has(r.amt)) groups.set(r.amt, { sjs: [], pays: [] }); groups.get(r.amt).sjs.push(r); }
for (const p of payments) { if (!groups.has(p.amount)) groups.set(p.amount, { sjs: [], pays: [] }); groups.get(p.amount).pays.push(p); }

const paidMap = new Map(); // sj.id -> receipt string
let mappingComplete = true;
for (const [amt, g] of groups) {
  if (g.sjs.length === 0) continue;
  if (g.sjs.length !== g.pays.length) { mappingComplete = false; console.log(`!! amount ${amt} tidak seimbang sjs=${g.sjs.length} pays=${g.pays.length}`); continue; }
  const perm = bestAssignment(g.sjs, g.pays);
  for (let i = 0; i < g.sjs.length; i++) paidMap.set(g.sjs[i].id, g.pays[perm[i]].ref);
}

// Plan:
//  - Dibayar rows: set receipt_id = mapped NT string (restore)
//  - Non-dibayar rows with receipt_id != null: set NULL
const updates = [];
for (const r of sj) {
  if (r.status === "Dibayar") {
    const target = paidMap.get(r.id) ?? null;
    if (target !== r.receipt_id) updates.push({ id: r.id, no: r.no, from: r.receipt_id, to: target, kind: "RESTORE" });
  } else if (r.receipt_id != null) {
    updates.push({ id: r.id, no: r.no, from: r.receipt_id, to: null, kind: "NULL" });
  }
}

const restore = updates.filter((u) => u.kind === "RESTORE");
const nulling = updates.filter((u) => u.kind === "NULL");
console.log(`SJ total=${sj.length} | Dibayar=${dibayar.length} | mappingComplete=${mappingComplete}`);
console.log(`Rencana: RESTORE receipt=${restore.length} baris, NULL receipt=${nulling.length} baris, total perubahan=${updates.length}`);
console.log("\n-- RESTORE (Dibayar -> NT) --");
for (const u of restore) console.log(`${u.no.padEnd(22)} ${String(u.from).padEnd(8)} -> ${u.to}`);
console.log(`\n-- NULL (non-Dibayar) -- contoh 10 dari ${nulling.length}:`);
for (const u of nulling.slice(0, 10)) console.log(`${u.no.padEnd(22)} ${u.from} -> NULL`);
console.log("\n--abel --");

if (!APPLY) { console.log("\n[DRY-RUN] Tidak ada perubahan. Jalankan ulang dengan --apply untuk mengeksekusi."); process.exit(0); }

// Apply in batches
let ok = 0, fail = 0;
const chunk = (arr, n) => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
for (const batch of chunk(updates, 50)) {
  for (const u of batch) {
    const { error } = await sb.from("surat_jalan").update({ receipt_id: u.to }).eq("id", u.id);
    if (error) { fail++; console.log(`GAGAL ${u.no}: ${error.message}`); } else ok++;
  }
}
console.log(`\nSelesai. Berhasil=${ok} Gagal=${fail}`);