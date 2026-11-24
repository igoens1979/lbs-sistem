import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const { data, error } = await sb.from("surat_jalan").select("id,no,sj_date,status,receipt_id,invoice_id");
if (error) throw new Error(error.message);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `scripts/data/backup_surat_jalan_${stamp}.json`;
writeFileSync(path, JSON.stringify(data, null, 2));
console.log(`Backup ${data.length} baris -> ${path}`);
console.log("Status:", data.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}));
console.log("receipt_id NOT NULL:", data.filter((r) => r.receipt_id != null).length);