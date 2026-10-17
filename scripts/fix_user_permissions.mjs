/* =========================================================
   Perbaiki permissions pada tabel users: saat ini {} (kosong)
   → isikan rolePermissions(role) sesuai peran masing-masing.
   ========================================================= */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const url = "https://vqozqgjrqeukqtnlqbto.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA";
const sb = createClient(url, key);

console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

// rolePermissions from local module
const { rolePermissions } = await import("./src/lib/permissions.ts");

const { data: users, error } = await sb.from("users").select("id,role,permissions");
if (error) throw new Error(error.message);

console.log(`Akun ditemukan: ${users.length}`);
for (const u of users) {
  const perms = u.permissions && Object.keys(u.permissions).length ? u.permissions : rolePermissions(u.role);
  const keys = Object.keys(perms).length;
  console.log(`  ${u.id} role=${u.role} perms=${keys} menu`);
  if (APPLY) {
    const { error: upErr } = await sb.from("users").update({ permissions: perms }).eq("id", u.id);
    if (upErr) console.log(`    Gagal: ${upErr.message}`);
    else console.log(`    OK diupdate`);
  }
}
console.log("\nSelesai.");