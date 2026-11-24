import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data: sj } = await sb.from("surat_jalan").select("id,no,sj_date,volume,trips,price,status,receipt_id").eq("no", "SJ/LBS/2026/11/3237");
console.log("SJ 3237:", JSON.stringify(sj, null, 2));

const { data: pay } = await sb.from("payments").select("id,ref,invoice_id,amount,pay_date,method,account_id,created_at").like("ref", "NT/LBS/%").order("pay_date", { ascending: true });
console.log("\nPayments NT/LBS/2026/11/0001:");
for (const p of pay.filter((x) => x.ref === "NT/LBS/2026/11/0001")) console.log(JSON.stringify(p));

const { data: btx } = await sb.from("bank_tx").select("id,ref,desc,amount,date,direction").like("ref", "NT/LBS/%");
console.log("\nbank_tx NT/LBS:", btx?.length ?? 0);
for (const b of btx ?? []) console.log(JSON.stringify(b));