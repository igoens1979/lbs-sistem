import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const APPLY = process.argv.includes("--apply");

const { data: sj } = await sb
  .from("surat_jalan")
  .select("id,no,sj_date,volume,trips,price,status,receipt_id")
  .eq("status", "Dibayar")
  .like("receipt_id", "NT/LBS/%");

const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date").like("ref", "NT/LBS/%");

const payments = pay ?? [];

const pairs = [];
const usedPay = new Set();
for (const s of sj ?? []) {
  const amt = s.volume * s.trips * s.price;
  const receiptLama = s.receipt_id;
  const cand = payments.find(
    (p) => !usedPay.has(p.id) && p.ref === receiptLama && p.amount === amt,
  );
  if (!cand) {
    console.log(`!! TIDAK DITEMUKAN payment untuk ${s.no} amt=${amt} receipt=${receiptLama}`);
    continue;
  }
  usedPay.add(cand.id);
  pairs.push({ sj: s, pay: cand, amt });
}

const unmatched = payments.filter((p) => !usedPay.has(p.id) && p.ref.startsWith("NT/LBS/"));
console.log(`SJ Dibayar=${sj ? sj.length : 0} | payments NT=${payments.length} | pasangan=${pairs.length} | payment tidak terpakai=${unmatched.length}`);
for (const p of unmatched) console.log(`   UNMATCHED ${p.ref} ${p.pay_date} amt=${p.amount}`);

pairs.sort((a, b) => {
  const d = a.pay.pay_date.localeCompare(b.pay.pay_date);
  if (d !== 0) return d;
  return a.sj.id.localeCompare(b.sj.id);
});

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
  let n = 0;
  for (const pr of arr) {
    n++;
    const seq = String(n).padStart(4, "0");
    const receiptBaru = `NT/LBS/${yyyy}/${mm}/${seq}`;
    plan.push({
      sjId: pr.sj.id,
      sjNo: pr.sj.no,
      payId: pr.pay.id,
      payDate: pr.pay.pay_date,
      receiptLama: pr.receipt_id ?? "",
      receiptBaru,
      sjRef: pr.sj.no,
    });
  }
}

plan.sort((a, b) => a.payDate.localeCompare(b.payDate) || a.sjNo.localeCompare(b.sjNo));

console.log("\n=== DRY-RUN backfill (renumber nota 0001..0016, ref = no SJ) ===");
for (const p of plan) {
  console.log(`${p.sjNo.padEnd(24)} bayar ${p.payDate}  ${p.receiptLama.padEnd(22)} -> ${p.receiptBaru}   ref=SJ: ${p.sjRef}`);
}

if (!APPLY) {
  console.log("\n[DRY-RUN] Tidak ada perubahan. Jalankan ulang dengan --apply untuk mengeksekusi.");
  process.exit(0);
}

let ok = 0, fail = 0;
for (const p of plan) {
  const { error: e1 } = await sb.from("payments").update({ ref: p.sjRef }).eq("id", p.payId);
  const { error: e2 } = await sb.from("surat_jalan").update({ receipt_id: p.receiptBaru }).eq("id", p.sjId);
  if (e1 || e2) {
    fail++;
    console.log(`GAGAL ${p.sjNo}: ${e1?.message ?? e2?.message}`);
  } else {
    ok++;
  }
}
console.log(`\nSelesai. Berhasil=${ok} Gagal=${fail}`);