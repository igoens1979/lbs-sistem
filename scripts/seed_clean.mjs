/* =========================================================
   Seed data contoh: Surat Jalan & Invoice (bersih & konsisten)
   - Menghapus data invoice lama (invoices, invoice_revisions, invoice_sj, payments)
   - Mereset surat_jalan.invoice_id = null, status = 'Terkirim'
   - Membuat 10 SJ dari 3 customer
   - Membuat invoice per customer dengan hitungan DPP/PPN/Total yang benar
   - Membuat pembayaran contoh pada beberapa invoice (pakai account yang valid)
   ========================================================= */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
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
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

// Ambil master data yang sudah ada
const customers = await q("customers", "id,code,name,term");
const commodities = await q("commodities", "id,name,price");
const vehicles = await q("vehicles", "id,plate,vehicle_type,capacity");
const drivers = await q("drivers", "id,name");
const accounts = await q("accounts", "id,code,name,account_type");

if (customers.length === 0 || commodities.length === 0 || vehicles.length === 0 || drivers.length === 0) {
  throw new Error("Master data (customers/commodities/vehicles/drivers) masih kosong. Isi dulu.");
}

console.log(`Customer: ${customers.length} | Komoditas: ${commodities.length} | Kendaraan: ${vehicles.length} | Driver: ${drivers.length} | Akun: ${accounts.length}`);

// Pilih 3 customer aktif
const pickCustomers = customers.slice(0, 3);
const pickCommodity = commodities[0];
const pickVehicles = vehicles.filter((v) => v.vehicle_type === "Dump Truck").slice(0, 3);
const pickDrivers = drivers.slice(0, 3);
const kasAccount = accounts.find((a) => a.account_type === "Kas") ?? accounts[0];

if (pickVehicles.length === 0) throw new Error("Tidak ada kendaraan tipe Dump Truck");

// 1) Hapus data lama: payments -> invoice_revisions -> invoice_sj -> invoices, lalu reset surat_jalan
if (APPLY) {
  await sb.from("payments").delete().neq("id", "");
  await sb.from("invoice_revisions").delete().neq("id", "");
  await sb.from("invoice_sj").delete().neq("invoice_id", "");
  await sb.from("invoices").delete().neq("id", "");
  await sb.from("surat_jalan").update({ invoice_id: null, status: "Terkirim" }).neq("id", "");
  console.log("\n[OK] Data lama dibersihkan.");
}

// 2) Buat 10 SJ dari 3 customer
const sjList = [];
const fmtDate = (d) => d.toISOString().slice(0, 10);

for (let i = 0; i < 10; i++) {
  const cust = pickCustomers[i % pickCustomers.length];
  const commodity = commodities[i % commodities.length];
  const vehicle = pickVehicles[i % pickVehicles.length];
  const driver = pickDrivers[i % pickDrivers.length];
  const date = new Date(2026, 9, 1 + i); // 1-10 Oktober 2026
  const volume = [24, 28, 30, 26, 25][i % 5];
  const trips = 1;
  const price = commodity.price;

  sjList.push({
    id: uid("SJ"),
    no: `SJ/LBS/2026/10/${String(i + 1).padStart(4, "0")}`,
    sj_date: fmtDate(date),
    customer_id: cust.id,
    commodity_id: commodity.id,
    volume,
    trips,
    vehicle_id: vehicle.id,
    driver_id: driver.id,
    price,
    status: "Terkirim",
    invoice_id: null,
    site: "SITE GOLO MORI",
    catatan: i % 3 === 0 ? "Contoh catatan operasi" : null,
    created_at: fmtDate(date),
  });
}

console.log("\nSurat jalan yang akan dibuat:");
for (const s of sjList) {
  const cust = customers.find((c) => c.id === s.customer_id);
  const dpp = s.volume * s.trips * s.price;
  console.log(`  ${s.no.padEnd(30)} ${cust.name.padEnd(32)} vol=${s.volume} x${s.trips} @ ${rupiah(s.price)} = ${rupiah(dpp)}`);
}

// Insert SJ
if (APPLY) {
  const { error } = await sb.from("surat_jalan").insert(sjList);
  if (error) throw new Error(`Gagal insert SJ: ${error.message}`);
  console.log(`\n[OK] ${sjList.length} SJ ditambahkan.`);
}

// 3) Buat invoice per customer (3 invoice, masing-masing berisi SJ milik customer tsb)
const PPN_RATE = 0.11;
const invoices = [];
const invoiceSJLinks = [];

let invCounter = 1;
for (const cust of pickCustomers) {
  const custSJ = sjList.filter((s) => s.customer_id === cust.id);
  const dpp = custSJ.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const ppn = Math.round(dpp * PPN_RATE);
  const total = dpp + ppn;
  const invDate = fmtDate(new Date(2026, 9, 10 + invCounter));
  const dueDate = fmtDate(new Date(2026, 9, 10 + invCounter + cust.term));

  const invId = uid("INV");
  invoices.push({
    id: invId,
    no: `INV/LBS/2026/10/${String(invCounter).padStart(4, "0")}`,
    customer_id: cust.id,
    inv_date: invDate,
    due_date: dueDate,
    dpp,
    ppn,
    total,
    ppn_rate: PPN_RATE,
    status: "Belum Jatuh Tempo",
    catatan: `Invoice ${cust.name} — ${custSJ.length} surat jalan`,
    jenis: custSJ.length > 1 ? "Gabungan" : "Reguler",
    created_at: invDate,
  });

  for (const s of custSJ) {
    invoiceSJLinks.push({ invoice_id: invId, sj_id: s.id });
  }
  invCounter++;
}

console.log("\nInvoice yang akan dibuat:");
for (const inv of invoices) {
  const cust = customers.find((c) => c.id === inv.customer_id);
  console.log(`  ${inv.no.padEnd(30)} ${cust.name.padEnd(32)} DPP ${rupiah(inv.dpp)} PPN ${rupiah(inv.ppn)} TOTAL ${rupiah(inv.total)} | ${inv.jenis}`);
}

// Insert invoices + links + update SJ invoice_id
if (APPLY) {
  const { error: e1 } = await sb.from("invoices").insert(invoices);
  if (e1) throw new Error(`Gagal insert invoice: ${e1.message}`);
  const { error: e2 } = await sb.from("invoice_sj").insert(invoiceSJLinks);
  if (e2) throw new Error(`Gagal insert invoice_sj: ${e2.message}`);

  // Update SJ invoice_id & status
  for (const inv of invoices) {
    const ids = invoiceSJLinks.filter((l) => l.invoice_id === inv.id).map((l) => l.sj_id);
    await sb.from("surat_jalan").update({ invoice_id: inv.id, status: "Diinvoice" }).in("id", ids);
  }

  // Revisi invoice
  const revisions = invoices.map((inv) => ({
    id: uid("RV"),
    invoice_id: inv.id,
    rev_date: inv.inv_date,
    by_user: "Sistem Seed",
    rev_type: "Terbit",
    detail: `Invoice ${inv.jenis.toLowerCase()} diterbitkan • ${invoiceSJLinks.filter((l) => l.invoice_id === inv.id).length} surat jalan • total ${rupiah(inv.total)}`,
    created_at: inv.inv_date,
  }));
  const { error: e3 } = await sb.from("invoice_revisions").insert(revisions);
  if (e3) throw new Error(`Gagal insert invoice_revisions: ${e3.message}`);

  console.log(`\n[OK] ${invoices.length} invoice + ${invoiceSJLinks.length} link + ${revisions.length} revisi ditambahkan.`);
}

// 4) Pembayaran contoh pada 2 invoice (gunakan akun kas yang valid)
const payments = [
  { id: uid("PAY"), invoice_id: invoices[0]?.id, pay_date: fmtDate(new Date(2026, 9, 12)), amount: invoices[0]?.total ?? 0, method: "Transfer", account_id: kasAccount.id, ref: "TRF-001", created_at: fmtDate(new Date(2026, 9, 12)) },
  { id: uid("PAY"), invoice_id: invoices[1]?.id, pay_date: fmtDate(new Date(2026, 9, 13)), amount: Math.round((invoices[1]?.total ?? 0) * 0.5), method: "Transfer", account_id: kasAccount.id, ref: "TRF-002", created_at: fmtDate(new Date(2026, 9, 13)) },
].filter((p) => p.invoice_id);

if (APPLY && payments.length > 0) {
  const { error: e4 } = await sb.from("payments").insert(payments);
  if (e4) throw new Error(`Gagal insert payments: ${e4.message}`);
  console.log(`\n[OK] ${payments.length} pembayaran ditambahkan.`);
}

console.log("\nSelesai.");