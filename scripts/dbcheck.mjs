import { createClient } from "@supabase/supabase-js";

const url = "https://vqozqgjrqeukqtnlqbto.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA";
const sb = createClient(url, key);

const tables = [
  "accounts",
  "customers",
  "surat_jalan",
  "invoices",
  "payments",
  "bank_tx",
  "opening_balances",
  "opening_log",
  "legacy_debts",
  "suppliers",
  "vehicles",
  "drivers",
  "employees",
  "users",
  "fuel_logs",
  "payroll_runs",
];

for (const t of tables) {
  try {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(`${t.padEnd(18)} => ${error ? `ERR ${error.message}` : `${count} baris`}`);
  } catch (e) {
    console.log(`${t.padEnd(18)} => EXC ${e.message}`);
  }
}