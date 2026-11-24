import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj } = await sb.from("surat_jalan").select("id,no,sj_date,status,receipt_id,invoice_id,created_at").order("no", { ascending: true });

console.log("=== 16 baris status = Dibayar ===");
for (const r of sj.filter((x) => x.status === "Dibayar")) {
  console.log(`${r.no.padEnd(24)} ${r.sj_date} receipt_id=${String(r.receipt_id).padEnd(18)} invoice=${r.invoice_id ? "Y" : "-"} created=${r.created_at}`);
}

console.log("\n=== 7 baris receipt_id NULL ===");
for (const r of sj.filter((x) => x.receipt_id == null)) {
  console.log(`${r.no.padEnd(24)} ${r.sj_date} status=${String(r.status).padEnd(10)} invoice=${r.invoice_id ? "Y" : "-"} created=${r.created_at}`);
}

// created_at distribution to see when bogus rows were written (tonight?)
const byDate = {};
for (const r of sj) {
  const d = (r.created_at ?? "").slice(0, 10);
  byDate[d] = (byDate[d] ?? 0) + 1;
}
console.log("\n=== Distribusi created_at (tanggal) ===");
console.log(byDate);

// rows where receipt_id = RIGHT(no,4)
const bogus = sj.filter((r) => r.receipt_id != null && String(r.receipt_id) === r.no.slice(-4));
console.log("\nTotal bogus (receipt_id == 4 digit suffix no):", bogus.length);

// Among bogus, how many have status Dibayar / Diinvoice / Terkirim
const byStatus = {};
for (const r of bogus) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
console.log("Bogus breakdown by status column:", byStatus);

// Are there any legit NT/LBS receipt refs that DO have matching SJ? check payments
const { data: pay } = await sb.from("payments").select("ref,invoice_id,amount,pay_date").like("ref", "NT/LBS/%");
console.log("\n=== Cash receipts (ref NT/LBS/%) ===", (pay ?? []).length);
for (const p of pay ?? []) console.log(`${p.ref.padEnd(22)} ${p.pay_date} amt=${p.amount} inv=${p.invoice_id}`);