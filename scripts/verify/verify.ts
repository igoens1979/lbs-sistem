/* =========================================================
   Verifikasi perhitungan invoice & kas/bank terhadap seed
   contoh (data.ts) + integritas HTML cetak (print.ts).
   ========================================================= */
import {
  ACCOUNTS,
  BANK_TX,
  CUSTOMERS,
  SEED_INVOICES,
  SEED_PAYMENTS,
  SURAT_JALAN,
} from "../../src/lib/data";
import { invoiceHtml } from "../../src/lib/print";
import { daysBetween, iso, num, rupiah, TODAY } from "../../src/lib/format";
import fs from "node:fs";
import path from "node:path";

const TODAY_ISO = iso(TODAY); // 2026-10-15
let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, detail = "") => {
  if (cond) pass++;
  else {
    fail++;
    console.log("  [FAIL]", label, detail);
  }
};

const sjById = new Map(SURAT_JALAN.map((r) => [r.id, r]));
const sjValue = (r: (typeof SURAT_JALAN)[number]) => r.volume * r.trips * r.price;

console.log("=== 1. KONSISTENSI PERHITUNGAN INVOICE (DPP/PPN/Total) ===");
let mismatch = 0;
for (const inv of SEED_INVOICES) {
  const rows = inv.sjIds.map((id) => sjById.get(id)).filter(Boolean);
  const dpp = rows.reduce((s, r) => s + sjValue(r), 0);
  const ppn = Math.round(dpp * 0.11);
  const total = dpp + ppn;
  if (dpp !== inv.dpp || ppn !== inv.ppn || total !== inv.total) {
    mismatch++;
    console.log("   mismatch:", inv.no, "stored=", [inv.dpp, inv.ppn, inv.total], "calc=", [dpp, ppn, total]);
  }
  if (rows.length !== inv.sjIds.length)
    console.log("   peringatan: SJ hilang utk", inv.no, inv.sjIds.length, "=>", rows.length);
}
ok(mismatch === 0, `${SEED_INVOICES.length} invoice: dpp/ppn/total sesuai perhitungan surat jalan`, `${mismatch} mismatch`);

console.log("=== 2. PEMBAYARAN vs NILAI INVOICE ===");
const paidMap = new Map<string, number>();
for (const p of SEED_PAYMENTS) paidMap.set(p.invoiceId, (paidMap.get(p.invoiceId) ?? 0) + p.amount);

let overpay = 0;
for (const inv of SEED_INVOICES) {
  const paid = paidMap.get(inv.id) ?? 0;
  if (paid > inv.total) {
    overpay++;
    console.log("   overpayment:", inv.no, rupiah(paid), "> total", rupiah(inv.total));
  }
  if (inv.status !== "Lunas" && paid >= inv.total) console.log("   status bukan Lunas tapi sudah lunas:", inv.no, inv.status);
}
ok(overpay === 0, "Tidak ada pembayaran melebihi nilai invoice", `${overpay} overpayment`);

const futurePays = SEED_PAYMENTS.filter((p) => p.date > TODAY_ISO);
ok(futurePays.length === 0, "Tidak ada pembayaran bertanggal masa depan (> 15/10/2026)", `${futurePays.length} pembayaran: ${futurePays.slice(0, 8).map((p) => `${p.id} ${p.date}`).join(" | ")}`);

const latestPay = SEED_PAYMENTS.reduce((m, x) => (x.date > m ? x.date : m), "");
const earliestPay = SEED_PAYMENTS.reduce((m, x) => (x.date < m ? x.date : m), latestPay);
console.log(`   rentang tanggal pembayaran: ${earliestPay} .. ${latestPay} (${SEED_PAYMENTS.length} pembayaran)`);

console.log("=== 3. KAS & BANK — REKONSILIASI OKTOBER (periode 01–15/10/2026) ===");
const period = { from: "2026-10-01", to: "2026-10-15" };
const rows = ACCOUNTS.map((a) => {
  const tx = BANK_TX.filter((t) => t.accountId === a.id && t.date >= period.from && t.date <= period.to);
  const masuk = tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const keluar = tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
  return { name: a.name, role: a.role, opening: a.opening, masuk, keluar, balance: a.opening + masuk - keluar };
});
const sum = (k: "opening" | "masuk" | "keluar" | "balance") => rows.reduce((s, r) => s + r[k], 0);
for (const r of rows)
  console.log(`   ${r.name.padEnd(28)} awal ${rupiah(r.opening).padStart(14)} | masuk ${rupiah(r.masuk).padStart(14)} | keluar ${rupiah(r.keluar).padStart(14)} | akhir ${rupiah(r.balance).padStart(14)}`);
console.log(`   TOTAL                     ${rupiah(sum("opening")).padStart(14)} | ${rupiah(sum("masuk")).padStart(14)} | ${rupiah(sum("keluar")).padStart(14)} | ${rupiah(sum("balance")).padStart(14)}`);
ok(sum("opening") === 355_000_000, "Total saldo awal  = Rp 355.000.000", `terhitung ${rupiah(sum("opening"))}`);
ok(sum("masuk") === 350_050_000, "Total kas masuk   = Rp 350.050.000", `terhitung ${rupiah(sum("masuk"))}`);
ok(sum("keluar") === 154_250_000, "Total kas keluar  = Rp 154.250.000", `terhitung ${rupiah(sum("keluar"))}`);
ok(sum("balance") === 550_800_000, "Saldo akhir       = Rp 550.800.000", `terhitung ${rupiah(sum("balance"))}`);
ok(rows.every((r) => r.balance >= 0), "Semua saldo rekening tidak negatif");

// cek juga untuk seluruh bulan Oktober (bukan dibatasi 15)
const netOct = ACCOUNTS.reduce((s, a) => {
  const tx = BANK_TX.filter((t) => t.accountId === a.id && t.date.startsWith("2026-10"));
  const masuk = tx.filter((t) => t.direction === "in").reduce((x, t) => x + t.amount, 0);
  const keluar = tx.filter((t) => t.direction === "out").reduce((x, t) => x + t.amount, 0);
  return s + masuk - keluar;
}, 0);
console.log(`   catatan: mutasi seluruh Oktober = ${rupiah(netOct)} (semua transaksi seed 1–14 Okt)`);

console.log("=== 4. INTEGRITAS HASIL CETAK INVOICE (HTML print) ===");
const sample = [
  SEED_INVOICES[0],
  SEED_INVOICES.find((i) => (paidMap.get(i.id) ?? 0) > 0 && (paidMap.get(i.id) ?? 0) < i.total),
  SEED_INVOICES.find((i) => !(paidMap.get(i.id) ?? 0)),
].filter(Boolean) as (typeof SEED_INVOICES)[number][];
for (const inv of sample) {
  const ctxRows = inv.sjIds.map((id) => sjById.get(id)).filter(Boolean);
  const paid = paidMap.get(inv.id) ?? 0;
  const late = daysBetween(new Date(inv.dueDate), TODAY);
  const status = paid >= inv.total - 1 ? "Lunas" : paid > 0 ? (late > 0 ? "Terlambat" : "Sebagian") : late > 30 ? "Terlambat" : late > 0 ? "Jatuh Tempo" : "Belum Jatuh Tempo";
  const { body } = invoiceHtml(inv, { paid, status, rows: ctxRows });
  const volume = ctxRows.reduce((s, r) => s + r.volume * r.trips, 0);
  const checks = {
    DPP: body.includes(rupiah(inv.dpp)),
    PPN: body.includes(rupiah(inv.ppn)),
    Total: body.includes(rupiah(inv.total)),
    "Sudah Dibayar": body.includes(rupiah(paid)),
    Sisa: body.includes(rupiah(Math.max(0, inv.total - paid))),
    Volume: body.includes(`${num(volume)} m³`),
    NoInvois: body.includes(inv.no),
    Status: body.includes(status),
  };
  const allOk = Object.values(checks).every(Boolean);
  if (!allOk) console.log("   detail gagal", inv.no, checks);
  ok(allOk, `Cetak ${inv.no} konsisten (DPP/PPN/Total/Dibayar/Sisa/Volume/Status)`, JSON.stringify(checkDetail(checks)));
}

let buildOk = 0;
for (const inv of SEED_INVOICES) {
  try {
    invoiceHtml(inv, { paid: paidMap.get(inv.id) ?? 0, status: "Lunas", rows: inv.sjIds.map((id) => sjById.get(id)).filter(Boolean) });
    buildOk++;
  } catch (e) {
    console.log("   error build HTML:", inv.no, (e as Error).message);
  }
}
ok(buildOk === SEED_INVOICES.length, "Semua invoice berhasil menghasilkan HTML cetak tanpa error", `${buildOk}/${SEED_INVOICES.length}`);

function checkDetail(c: Record<string, boolean>) {
  const bad = Object.entries(c).filter(([, v]) => !v).map(([k]) => k);
  return bad.length ? `hilang: ${bad.join(", ")}` : "ok";
}

console.log("=== 5. TANGGAL CETAK DI KOP (bebas pergeseran zona waktu) ===");
const printSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/print.ts"), "utf8");
const hasUTCDate = printSrc.includes("toISOString().slice(0, 10)");
const hasLocalDate = printSrc.includes("d(new Date())");
console.log(`   print.ts: 'd(new Date())' ada = ${hasLocalDate} • masih ada toISOString().slice(0,10) = ${hasUTCDate}`);
ok(hasLocalDate && !hasUTCDate, "Tanggal cetak di kop memakai waktu lokal (tidak bergeser 1 hari sebelum 08:00 WITA)");

console.log("=== 6. STATUS TERSIMPAN vs TERHITUNG ===");
let diff = 0;
for (const inv of SEED_INVOICES) {
  const paid = paidMap.get(inv.id) ?? 0;
  const late = daysBetween(new Date(inv.dueDate), TODAY);
  const computed = paid >= inv.total - 1 ? "Lunas" : paid > 0 ? (late > 0 ? "Terlambat" : "Sebagian") : late > 30 ? "Terlambat" : late > 0 ? "Jatuh Tempo" : "Belum Jatuh Tempo";
  if (computed !== inv.status) {
    diff++;
  }
}
console.log(`   ${diff} invoice status tersimpan ≠ status terhitung (tampilan memakai computedStatus, jadi hanya perbedaan data lama)`);

console.log(`\nHASIL VERIFIKASI: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);