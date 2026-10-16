import { createClient } from "@supabase/supabase-js";

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

const sj = await q("surat_jalan", "id,no,sj_date,customer_id,volume,trips,price,status");
const inv = await q("invoices", "id,no,inv_date,due_date,dpp,ppn,total,ppn_rate,status,customer_id,jenis,catatan");
const sjlink = await q("invoice_sj", "invoice_id,sj_id");
const pay = await q("payments", "id,invoice_id,pay_date,amount,method,account_id");
const cust = await q("customers", "id,code,name");

const custName = (id) => cust.find((c) => c.id === id)?.name ?? id;
const invById = new Map(inv.map((i) => [i.id, i]));

console.log(`SJ=${sj.length} • Invoices=${inv.length} • invoice_sj links=${sjlink.length} • payments=${pay.length}\n`);

const linkByInv = new Map();
for (const l of sjlink) {
  const arr = linkByInv.get(l.invoice_id) ?? [];
  arr.push(l.sj_id);
  linkByInv.set(l.invoice_id, arr);
}
const sjById = new Map(sj.map((s) => [s.id, s]));

console.log("--- INVOICES (dari DB) ---");
let sumDpp = 0, sumTotal = 0;
for (const i of inv) {
  const links = linkByInv.get(i.id) ?? [];
  const rows = links.map((id) => sjById.get(id)).filter(Boolean);
  const computed = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const flag = rows.length !== links.length ? " [SJ HILANG]" : rows.length === 0 ? " [TANPA SJ]" : computed !== i.dpp ? " [TOTAL TIDAK COCOK]" : "";
  sumDpp += i.dpp;
  sumTotal += i.total;
  console.log(`${i.no.padEnd(32)} ${i.inv_date} → ${i.due_date} | DPP ${rupiah(i.dpp).padStart(13)} PPN ${rupiah(i.ppn).padStart(10)} TOTAL ${rupiah(i.total).padStart(13)} | ${(i.status ?? "").padEnd(18)} | ${custName(i.customer_id).padEnd(28)} | link=${links.length} SJ${flag}`);
}
console.log(`TOTAL DPP=${rupiah(sumDpp)} TOTAL TAGIHAN=${rupiah(sumTotal)}\n`);

console.log("--- SURAT JALAN (dari DB) ---");
for (const s of sj) {
  const linked = sjlink.some((l) => l.sj_id === s.id);
  const invNo = linked ? invById.get(sjlink.find((l) => l.sj_id === s.id)?.invoice_id)?.no ?? "?" : "-";
  console.log(`${s.no.padEnd(32)} ${s.sj_date} vol=${s.volume} x${s.trips} x Rp ${s.price.toLocaleString("id-ID")} = ${rupiah(s.volume * s.trips * s.price).padStart(12)} | ${custName(s.customer_id).padEnd(28)} | status=${s.status?.padEnd(10)} | invoice=${invNo}`);
}

console.log("\n--- PEMBAYARAN ---");
for (const p of pay) {
  const i = invById.get(p.invoice_id);
  const sisa = i ? i.total - p.amount : null;
  console.log(`${p.id.padEnd(10)} ${p.pay_date} ${rupiah(p.amount).padStart(12)} → ${i?.no ?? "?"} (sisa ${sisa == null ? "?" : rupiah(sisa)}) method=${p.method}`);
}

console.log("\n--- CEK TOTAL PAJAK (dpp*ppn_rate) ---");
let ppnMismatch = 0;
for (const i of inv) {
  const rate = i.ppn_rate ?? 0.11;
  const expect = Math.round(i.dpp * rate);
  if (expect !== i.ppn) {
    ppnMismatch++;
    console.log(`${i.no}: pph terhitung ${expect} ≠ tersimpan ${i.ppn} (rate ${rate})`);
  }
}
console.log(`${ppnMismatch} invoice dengan nilai PPN tidak konsisten thd DPP×rate`);