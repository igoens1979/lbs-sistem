import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj } = await sb
  .from("surat_jalan")
  .select("id,no,sj_date,volume,trips,price,status,receipt_id")
  .eq("status", "Dibayar")
  .like("receipt_id", "NT/LBS/%");

const { data: pay } = await sb.from("payments").select("id,ref,amount,pay_date").like("ref", "NT/LBS/%");

console.log("=== SJ Dibayar (dengan receipt_id NT saat ini) ===");
for (const s of sj ?? []) {
  const amt = s.volume * s.trips * s.price;
  console.log(`${s.no.padEnd(24)} ${s.sj_date} amt=${amt} receipt_id=${s.receipt_id}`);
}

console.log("\n=== Payments NT/LBS ===");
for (const p of pay ?? []) console.log(`${p.ref.padEnd(22)} ${p.pay_date} amt=${p.amount} id=${p.id}`);

// Cek inversi: urutkan SJ by receipt_id angka, lihat tanggal bayar (dari payment yang ref = receipt_id)
const byReceipt = new Map();
for (const p of pay ?? []) byReceipt.set(p.ref, p);

console.log("\n=== Cek konsistensi nomor vs tanggal (urutkan by nomor nota) ===");
const sorted = (sj ?? []).slice().sort((a, b) => {
  const ra = a.receipt_id ?? ""; const rb = b.receipt_id ?? "";
  const na = Number(ra.split("/").pop()); const nb = Number(rb.split("/").pop());
  return na - nb;
});
for (const s of sorted) {
  const amt = s.volume * s.trips * s.price;
  const p = byReceipt.get(s.receipt_id);
  console.log(`${s.receipt_id} | SJ ${s.no} ${s.sj_date} amt=${amt} | pay ${p?.pay_date ?? "(tidak ditemukan)"} ref=${p?.ref ?? "-"}`);
}

// Cek inversi: ada tidaknya nomor yang lebih besar tapi tanggal lebih kecil
console.log("\n=== Deteksi inversi (nomor lebih besar tapi tanggal lebih kecil) ===");
let inv = 0;
for (let i = 0; i < sorted.length; i++) {
  for (let j = i + 1; j < sorted.length; j++) {
    const si = sorted[i], sj2 = sorted[j];
    const pi = byReceipt.get(si.receipt_id); const pj = byReceipt.get(sj2.receipt_id);
    if (pi || pj) continue;
    // si nomor lebih kecil (i<j). Jika tanggal si > tanggal sj2 => inversi
    if (si.sj_date > sj2.sj_date && pi.pay_date <= pj.pay_date) {
      console.log(`INVERSI: ${si.receipt_id} (SJ ${si.no} ${si.sj_date} bayar ${pi.pay_date}) vs ${sj2.receipt_id} (SJ ${sj2.no} ${sj2.sj_date} bayar ${pj.pay_date})`);
      inv++;
    }
    // atau berdasarkan tanggal bayar
    if (pi.pay_date > pj.pay_date) {
      console.log(`INVERSI-TGLBAYAR: ${si.receipt_id} bayar ${pi.pay_date} > ${sj2.receipt_id} bayar ${pj.pay_date} (nomor ${si.receipt_id} < ${sj2.receipt_id})`);
      inv++;
    }
  }
}
console.log(inv === 0 ? "Tidak ada inversi." : `${inv} inversi terdeteksi.`);
