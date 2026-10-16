# Teman Verifikasi Invoice & Kas/Bank (Supabase vs Seed vs Kode)

## Ringkasan eksekutif
- Perhitungan DPP/PPN/Total pada **seed kode (`data.ts`)** dan rekonsiliasi kas/bank Oktober **semua valid**.
- **2 bug kode** sudah diperbaiki: (1) pergantian tanggal cetak karena zona waktu (`toISOString`), (2) pembayaran seed bertanggal masa depan.
- **Database Supabase** memiliki data invoice yang **tidak konsisten** dengan surat jalan tertaut (8 dari 10 invoice nilainya salah jika dihitung dari SJ; 2 invoice tidak punya SJ sama sekali). Perbaikan DB perlu dilakukan **manual** karena relasi `invoice_sj` adalah banyak-ke-banyak.

---

## 1. File sumber yang diperbaiki (sudah diterapkan & diverifikasi)

### `src/lib/print.ts` — tanggal cetak kop invoice
Sebelum:
```ts
<p class="sub">Tanggal cetak: ${d(parseISO(new Date().toISOString().slice(0, 10)))}</p>
```
Sesudah:
```ts
<p class="sub">Tanggal cetak: ${d(new Date())}</p>
```
`new Date().toISOString().slice(0, 10)` mengembalikan tanggal UTC, yang di WITA (UTC+8) sebelum pukul 08:00 waktu lokal akan salah satu hari ke belakang. Sekarang pakai `new Date()` langsung agar tanggal cetak selalu mengikuti waktu lokal server/browser.

### `src/lib/data.ts` — pembayaran tidak boleh bertanggal masa depan
Sebelum:
```ts
const payDate = iso(addDays(new Date(inv.date), Math.min(inv.sjIds.length + 5, 20)));
```
Sesudah:
```ts
const payRaw = addDays(new Date(inv.date), Math.min(inv.sjIds.length + 5, 20));
const payDate = iso(payRaw > TODAY ? TODAY : payRaw);
```
Rentang tanggal pembayaran seed sekarang `2026-06-21 .. 2026-10-15` (tidak ada lagi melebihi 15/10/2026).

### `scripts/verify/verify.ts` + `vite.config.mjs`
Skrip verifikasi diperbaiki agar check tanggal cetak membaca isi aktual `src/lib/print.ts` (bukan demo konseptual), dan build berjalan sebagai SSR Node agar `node:fs` / `node:path` tersedia.

---

## 2. Hasil verifikasi (13 PASS, 0 FAIL)

| # | Pemeriksaan | Hasil |
|---|-------------|-------|
| 1 | Konsistensi DPP/PPN/Total semua invoice (seed) | PASS |
| 2 | Tidak ada pembayaran bertanggal masa depan (> 15/10/2026) | PASS |
| 3 | Kas & bank rekon Oktober 01–15/10/2026 cocok target | PASS |
| 4 | Integritas output cetak invoice HTML | PASS |
| 5 | Tanggal cetak kop bebas pergeseran zona waktu | PASS |
| 6 | Status tersimpan vs terhitung (UI pakai computedStatus) | PASS (perbedaan data lama tidak mempengaruhi tampilan) |

Angka kas/bank Oktober (periode 01–15/10/2026), cocok dengan target:
- **Awal:** Rp 355.000.000
- **Masuk:** Rp 350.050.000
- **Keluar:** Rp 154.250.000
- **Akhir:** Rp 550.800.000

---

## 3. Ketidakkonsistenan database Supabase (perlu perbaikan manual)

### Struktur aktual DB (berbeda dari asumsi awal)
- `surat_jalan` **tidak punya** kolom `invoice_id` terisi (semua `NULL`); tautan ada di tabel relasi `invoice_sj` (`invoice_id`, `sj_id`).
- `invoice_sj` isinya banyak-ke-banyak: 12 baris, mis. `SJ-0003` dan `SJ-0004` masing-masing terikat ke INV-0002 **dan** INV-0003.

### Invoice yang nilainya tidak cocok dengan SJ tertaut (dari `invoice_sj`)
Hitung ulang `dpp = Σ(volume × trips × price)`, `ppn = dpp × 11%`, `total = dpp + ppn`:

| Invoice | Total DB | Total dari SJ tertaut | Selisih | Keterangan |
|---------|----------|----------------------|---------|------------|
| INV/LBS/2026/10/0001 | Rp 111.888.000 | Rp 25.951.800 | −Rp 85.936.200 | DB terlalu besar |
| INV/LBS/2026/10/0002 | Rp 14.763.000 | Rp 24.875.100 | +Rp 10.112.100 | DB terlalu kecil (SJ-0003+0004 dibagi dengan INV-0003) |
| INV/LBS/2026/10/0003 | Rp 15.151.500 | Rp 24.875.100 | +Rp 9.723.600 | DB terlalu kecil (SJ-0003+0004 dibagi dengan INV-0002) |
| INV/LBS/2026/10/0004 | Rp 1.052.280 | Rp 11.399.700 | +Rp 10.347.420 | DB terlalu kecil |
| INV/LBS/2026/10/0005 | Rp 932.400 | Rp 13.053.600 | +Rp 12.121.200 | DB terlalu kecil |
| INV/LBS/2026/10/0006 | Rp 1.212.120 | Rp 12.121.200 | +Rp 10.909.080 | DB terlalu kecil |
| INV/LBS/2026/10/0007 | Rp 1.212.120 | Rp 24.808.500 | +Rp 23.596.380 | DB terlalu kecil (2 SJ) |
| INV/LBS/2026/10/0008 | Rp 1.118.880 | Rp 13.053.600 | +Rp 11.934.720 | DB terlalu kecil |
| INV/LBS/2026/10/0009 | Rp 1.095.000 | — | — | **Tidak ada SJ tertaut** |
| INV/LBS/2026/10/0010 | Rp 1.095.000 | — | — | **Tidak ada SJ tertaut** |

### Masalah tambahan
- 1 invoice berstatus tidak valid (`INV/LBS/2026/10/0003 = "Terkirim"`; UI pakai `computedStatus` jadi tampilan tidak terpengaruh, tapi data mentah rusak).
- 8 invoice akan berubah nilai jika di-recompute dari SJ; 2 invoice tanpa SJ tidak bisa di-recompute otomatis.

---

## 4. Skrip perbaikan DB (opsional, belum dijalankan)

`scripts/repair_db.mjs` siap digunakan:
- `node scripts/repair_db.mjs` → **dry-run**, hanya menampilkan rencana.
- `node scripts/repair_db.mjs --apply` → menulis perubahan ke Supabase.

**PERINGATAN:** karena `invoice_sj` banyak-ke-banyak (SJ-0003 & SJ-0004 masing-masing milik 2 invoice), backfill `surat_jalan.invoice_id` dengan satu nilai adalah **arbitrar dan berisiko**. Sebelum `--apply`, perlu diputuskan secara manual:
1. Untuk INV-0002 / INV-0003 yang berbagi SJ-0003 & SJ-0004: tentukan mana invoice yang "benar-benar" memegang masing-masing SJ, atau bagi nilai SJ antara keduanya.
2. Untuk INV-0009 & INV-0010 (tanpa SJ): tambahkan surat jalan yang hilang, atau hapus invoice jika tidak valid.
3. Perbaiki status `INV/LBS/2026/10/0003` ke nilai yang valid (`Belum Jatuh Tempo`, `Jatuh Tempo`, `Terlambat`, `Sebagian`, atau `Lunas`).

---

## 5. Langkah selanjutnya yang direkomendasikan

1. **Konfirmasi ke tim data/back-end** apakah boleh menjalankan `scripts/repair_db.mjs --apply` setelah hasil manual penentuan pemilikan SJ-0003 / SJ-0004.
2. Setelah DB diperbaiki, jalankan ulang `node scripts/dbverify.mjs` (yang menggunakan `invoice_sj` untuk join) untuk konfirmasi konsistensi akhir.
3. Commit perubahan kode (`print.ts`, `data.ts`, skrip verifikasi) ke repository.