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
const pad = (s, n = 26) => String(s).padEnd(n);
let pass = 0;
let fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) pass++;
  else {
    fail++;
    console.log("  [FAIL]", label, detail);
  }
};

const accounts = await q("accounts", "id,name,opening");
const bankTx = await q("bank_tx", "id,account_id,tx_date,arah,jumlah");
const sjRows = await q("surat_jalan", "id,no,sj_date,volume,trips,price,invoice_id");
const invoices = await q("invoices", "id,no,inv_date,due_date,dpp,ppn,total,ppn_rate,status,customer_id");
const payments = await q("payments", "id,invoice_id,pay_date,amount");
const openings = await q("opening_balances", "account_id,ym,amount,opening_type,ref_month,note");
const openingLog = await q("opening_log", "id,ym,account_id,amount,log_type,note,at_date,by_user");

console.log(`DB: ${accounts.length} akun, ${bankTx.length} bank_tx, ${sjRows.length} SJ, ${invoices.length} invoice, ${payments.length} payment, ${openings.length} opening`);

console.log("\n=== A. INVOICE: NILAI TERSIMPAN vs HITUNG ULANG DARI SURAT JALAN ===");
const sjByInv = new Map();
for (const r of sjRows) {
  const invId = r.invoice_id;
  if (!invId) continue;
  const arr = sjByInv.get(invId) ?? [];
  arr.push(r);
  sjByInv.set(invId, arr);
}
let mismatch = 0;
let orphanSj = 0;
for (const inv of invoices) {
  const rows = (sjByInv.get(inv.id) ?? []);
  if (!rows.length) {
    console.log(`   ${pad(inv.no)} TANPA SURAT JALAN`);
    continue;
  }
  const dpp = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const rate = inv.ppn_rate ?? 0.11;
  const ppn = Math.round(dpp * rate);
  const total = dpp + ppn;
  if (dpp !== inv.dpp || ppn !== inv.ppn || total !== inv.total) {
    mismatch++;
    console.log(`   ${pad(inv.no)} tersimpan [${inv.dpp}, ${inv.ppn}, ${inv.total}] vs hitung [${dpp}, ${ppn}, ${total}] (${rows.length} SJ)`);
  }
}
for (const r of sjRows) {
  if (r.invoice_id && !invoices.some((i) => i.id === r.invoice_id)) orphanSj++;
}
ok(mismatch === 0, `${invoices.length} invoice DB: total konsisten dengan surat jalan`, `${mismatch} mismatch`);
console.log(`   ${sjRows.filter((r) => r.invoice_id).length} SJ tertaut invoice dari ${sjRows.length} SJ total; ${sjRows.filter((r) => !r.invoice_id).length} SJ belum diinvoice; ${orphanSj} SJ tertaut invoice yang tidak ada`);

console.log("\n=== B. PEMBAYARAN vs NILAI INVOICE ===");
const paidMap = new Map();
for (const p of payments) paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) ?? 0) + p.amount);
let overpay = 0;
for (const inv of invoices) {
  const paid = paidMap.get(inv.id) ?? 0;
  if (paid > inv.total) {
    overpay++;
    console.log(`   overpayment ${pad(inv.no)} ${rupiah(paid)} > ${rupiah(inv.total)}`);
  }
  const sisa = inv.total - paid;
  if (sisa < 0) console.log(`   sisa negatif ${inv.no}: ${rupiah(sisa)}`);
}
ok(overpay === 0, "Tidak ada pembayaran melebihi nilai invoice (DB)", `${overpay}`);
console.log(`   3 status payment record utk ${invoices.length} invoice; total dibayar=${rupiah([...paidMap.values()].reduce((a, b) => a + b, 0))}`);
for (const p of payments) {
  const inv = invoices.find((i) => i.id === p.invoice_id);
  console.log(`   ${pad(p.id, 12)} ${pad(inv?.no ?? "?", 30)} ${p.pay_date} ${rupiah(p.amount)}`);
}

console.log("\n=== C. SALDO & OPENING BALANCES DI DB ===");
for (const o of openings) {
  const acc = accounts.find((a) => a.id === o.account_id);
  console.log(`   ${pad(acc?.name ?? o.account_id)} ${o.ym} ${pad(o.opening_type, 12)} ref=${o.ref_month ?? "-"} ${rupiah(o.amount)} — ${o.note}`);
}
console.log("   Audit log:");
for (const l of openingLog) console.log(`     ${l.ym} ${l.account_id} ${l.log_type} ${rupiah(l.amount)} — ${l.note}`);

console.log("\n=== D. KAS/BANK PERIODE 01–15/10/2026 (roll-forward store) ===");
const period = { from: "2026-10-01", to: "2026-10-15" };
for (const a of accounts) {
  const tx = bankTx.filter((t) => t.account_id === a.id && t.tx_date >= period.from && t.tx_date <= period.to);
  const masuk = tx.filter((t) => t.arah === "in").reduce((s, t) => s + t.jumlah, 0);
  const keluar = tx.filter((t) => t.arah === "out").reduce((s, t) => s + t.jumlah, 0);
  let opening = a.opening;
  const octBal = openings.find((o) => o.account_id === a.id && o.ym === "2026-10");
  if (octBal) opening = octBal.amount;
  console.log(`   ${pad(a.name)} awal ${rupiah(opening).padStart(13)} masuk ${rupiah(masuk).padStart(13)} keluar ${rupiah(keluar).padStart(13)} akhir ${rupiah(opening + masuk - keluar).padStart(13)}`);
}
// total hanya bank_tx dalam periode (tanpa opening)
const inTotal = bankTx.filter((t) => t.tx_date >= period.from && t.tx_date <= period.to && t.arah === "in").reduce((s, t) => s + t.jumlah, 0);
const outTotal = bankTx.filter((t) => t.tx_date >= period.from && t.tx_date <= period.to && t.arah === "out").reduce((s, t) => s + t.jumlah, 0);
console.log(`   TOTAL MUTASI periode: masuk ${rupiah(inTotal)} | keluar ${rupiah(outTotal)}`);

console.log(`\nHASIL AUDIT DB: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);