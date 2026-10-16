/* =========================================================
   Perbaikan data invoice di Supabase (opsional & idempoten).
   -dry-run (default): hanya menampilkan rencana perubahan.
   --apply           : menulis perubahan ke database.
   1) Backfill surat_jalan.invoice_id dari tabel invoice_sj.
   2) Hitung ulang dpp/ppn/total tiap invoice dari SJ tertaut.
   3) Peringatan: invoice tanpa SJ, overpayment, status aneh.
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
const rupiah = (v) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;

const sj = await q("surat_jalan", "id,no,invoice_id,volume,trips,price,status");
const inv = await q("invoices", "id,no,dpp,ppn,total,ppn_rate,status");
const sjlink = await q("invoice_sj", "invoice_id,sj_id");
const pay = await q("payments", "invoice_id,amount");

const invById = new Map(inv.map((i) => [i.id, i]));
const sjById = new Map(sj.map((s) => [s.id, s]));
const paidByInv = new Map();
for (const p of pay) paidByInv.set(p.invoice_id, (paidByInv.get(p.invoice_id) ?? 0) + p.amount);
const linkByInv = new Map();
for (const l of sjlink) {
  const arr = linkByInv.get(l.invoice_id) ?? [];
  arr.push(l.sj_id);
  linkByInv.set(l.invoice_id, arr);
}

console.log(`Mode: ${APPLY ? "APPLY (menulis ke database)" : "DRY-RUN (tidak ada perubahan)"}\n`);

// 1) backfill surat_jalan.invoice_id
const backfill = [];
for (const l of sjlink) {
  const s = sjById.get(l.sj_id);
  if (s && s.invoice_id !== l.invoice_id) backfill.push({ sj: s.no, dari: s.invoice_id ?? "-", ke: l.invoice_id });
}
console.log(`1) Backfill surat_jalan.invoice_id: ${backfill.length} surat jalan akan diubah.`);
if (backfill.length <= 12) backfill.forEach((b) => console.log(`   ${b.sj.padEnd(28)} ${b.dari} -> ${b.ke}`));

// 2) recompute invoice totals
console.log("\n2) Hitung ulang nilai invoice dari SJ tertaut:");
const plan = [];
let willChange = 0;
for (const i of inv) {
  const links = linkByInv.get(i.id) ?? [];
  const rows = links.map((id) => sjById.get(id)).filter(Boolean);
  if (rows.length !== links.length) console.log(`   [WARN] ${i.no}: ${links.length - rows.length} SJ tertaut tidak ditemukan.`);
  if (rows.length === 0) {
    console.log(`   [INFO] ${i.no}: TANPA SJ — nilai DB tidak diubah (${rupiah(i.dpp)}). Pertimbangkan hapus atau tautkan SJ.`);
    continue;
  }
  const dpp = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const rate = i.ppn_rate ?? 0.11;
  const ppn = Math.round(dpp * rate);
  const total = dpp + ppn;
  const paid = paidByInv.get(i.id) ?? 0;
  const flag = total !== i.total ? " <-- BERUBAH" : "";
  const over = paid > total ? ` [OVERPAYMENT]: sudah dibayar ${rupiah(paid)}` : "";
  if (total !== i.total) willChange++;
  plan.push({ id: i.id, no: i.no, old: [i.dpp, i.ppn, i.total], next: [dpp, ppn, total] });
  if (flag !== "" || over !== "") console.log(`   ${i.no.padEnd(30)} ${rupiah(i.total).padStart(13)} -> ${rupiah(total).padStart(13)}${flag}${over}`);
}
console.log(`   ${willChange} invoice akan berubah nilainya.`);

// 3) status aneh
const valid = ["Belum Jatuh Tempo", "Jatuh Tempo", "Terlambat", "Sebagian", "Lunas"];
const odd = inv.filter((i) => !valid.includes(i.status));
if (odd.length) {
  console.log(`\n3) [WARN] ${odd.length} invoice berstatus tidak valid (${odd.map((i) => `${i.no}=${i.status}`).join(", ")}). UI memakai status hitung, jadi tampilan tetap benar.`);
}

if (!APPLY) {
  console.log("\nBelum ada perubahan. Jalankan dengan --apply untuk menulis ke database.");
  process.exit(0);
}

console.log("\nMenerapkan perubahan...");
let ok = 0;
for (const p of plan) {
  if (p.old[0] === p.next[0] && p.old[1] === p.next[1] && p.old[2] === p.next[2]) continue;
  const { error } = await sb.from("invoices").update({ dpp: p.next[0], ppn: p.next[1], total: p.next[2] }).eq("id", p.id);
  if (error) console.log(`   [ERR] ${p.no}: ${error.message}`);
  else ok++;
}
for (const b of backfill) {
  const { error } = await sb.from("surat_jalan").update({ invoice_id: b.ke }).eq("id", sjById.get(b.sj)?.id ?? "");
  if (error) console.log(`   [ERR] ${b.sj}: ${error.message}`);
  else ok++;
}
console.log(`Selesai: ${ok} pembaruan ditulis (dry-run tidak menulis).`);
process.exit(0);