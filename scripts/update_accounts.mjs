/* =========================================================
   Update data akun: perbaiki nama & role sesuai permintaan
   - Bank BCA (822-0199) → "Bank BCA", hapus role "Operasional Induk Holding"
   - Bank MANDIRI (142-00) → "Bank MANDIRI", hapur role "BBM Lapangan & Armada"
   - Petty Cash Kasir Terminal → "Petty Cash"
   - Urutan: MANDIRI, BCA, KAS
   ========================================================= */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const url = "https://vqozqgjrqeukqtnlqbto.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA";
const sb = createClient(url, key);

console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

// 1. Ambil data akun saat ini
const { data: accounts, error: fetchErr } = await sb.from("accounts").select("*");
if (fetchErr) throw new Error(`Gagal ambil akun: ${fetchErr.message}`);
console.log(`Akun ditemukan: ${accounts.length}`);
for (const a of accounts) {
  console.log(`  ${a.id} | ${a.code} | ${a.name} | role=${a.role ?? "-"}`);
}

// 2. Mapping perubahan
const updates = [
  { id: "A-002", name: "Bank MANDIRI", role: null, order: 1 },
  { id: "A-001", name: "Bank BCA", role: null, order: 2 },
  { id: "A-003", name: "Kas Operasional Lapangan", role: "Petty Cash", order: 3 },
];

// 3. Apply
for (const u of updates) {
  const acc = accounts.find((a) => a.id === u.id);
  if (!acc) {
    console.log(`  SKIP: akun ${u.id} tidak ditemukan`);
    continue;
  }
  const { error: upErr } = await sb.from("accounts").update({ name: u.name, role: u.role }).eq("id", u.id);
  if (upErr) {
    console.log(`  Gagal update ${u.id}: ${upErr.message}`);
  } else {
    console.log(`  OK: ${u.id} "${acc.name}" → "${u.name}" role="${acc.role ?? "-"}" → "${u.role ?? "-"}"`);
  }
}

console.log("\nSelesai.");