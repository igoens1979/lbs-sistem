# Panduan Integrasi Halaman — LBS System 1.0

Dokumen ini menjelaskan cara **menghubungkan halaman baru per menu** (mis. halaman yang Anda buat sendiri untuk *Surat Jalan*, *Invoice*, *Rekap Keuangan*, dst.).

## 1. Struktur menu & rute

Semua menu terdaftar pada **satu file**: `src/lib/routes.ts`

| Menu sidebar | `id` rute | Group | File halaman |
| --- | --- | --- | --- |
| Dashboard Keuangan | `dashboard` | Command Center | `src/pages/Dashboard.tsx` |
| Surat Jalan & Logistik | `surat-jalan` | Operasional & Logistik | `src/pages/SuratJalan.tsx` |
| Manajemen Invoice | `invoice` | Operasional & Logistik | `src/pages/Invoices.tsx` |
| Kas, Bank & Keuangan | `kas-bank` | Operasional & Logistik | `src/pages/KasBank.tsx` |
| **Rekap Keuangan** | `rekap-keuangan` | Operasional & Logistik | `src/pages/RekapKeuangan.tsx` |
| **Hutang Piutang** | `hutang-piutang` | Operasional & Logistik | `src/pages/HutangPiutang.tsx` |
| Operasional & BBM | `bbm` | Operasional & Logistik | `src/pages/Bbm.tsx` |
| Master Data | `master-data` | Konfigurasi | `src/pages/MasterData.tsx` |
| HRD & Payroll | `hrd` | Konfigurasi | `src/pages/Hrd.tsx` |

> Menu **CRM Pelanggan telah dihapus** (rute `crm`, komponen `src/pages/Crm.tsx`, dan semua tautan di dashboard/pencarian cepat sudah dibersihkan). Master pelanggan tetap tersedia di **Master Data**.

## 2. Cara memasang halaman baru (per menu, satu per satu)

1. **Buat file halaman** di `src/pages/`, misalnya `src/pages/SuratJalan.tsx` yang saya berikan nanti:
   ```tsx
   export default function SuratJalan() {
     const app = useApp();          // akses data & aksi global (opsional)
     return (
       <PageBody>                  {/* wrapper spacing standar */}
         <PageHeader … />
         …isi halaman Anda…
       </PageBody>
     );
   }
   ```
2. **Daftarkan pada registry**: buka `src/pages/registry.tsx`, ganti baris yang sesuai:
   ```tsx
   "surat-jalan": <SuratJalan />,     // ← cukup ubah bagian ini
   ```
3. Selesai. Sidebar, breadcrumb header, pencarian cepat, dan router (`src/App.tsx`) membaca dari registry sehingga otomatis ikut berubah.

### Jika menu benar-benar baru (bukan ganti halaman)
Tambahkan entri di `src/lib/routes.ts` (menambah `id` pada union `Route` + entri `NAV`), lalu tambahkan slot di `src/pages/registry.tsx`. Sidebar langsung menampilkan menu tersebut.

## 3. Kontrak komponen halaman

- Ekspor **default**, komponen tanpa props.
- Pembungkus yang disarankan:
  - `<PageBody>` — padding & jarak antar seksi (`p-margin … lg:p-margin-desktop`).
  - `<PageHeader eyebrow title description actions>` — judul + baris filter periode.
  - `<PeriodActions onExport onPrint />` — tombol “Tampilkan Periode”, export CSV, cetak PDF.
- Komponen UI siap pakai di `src/components/ui.tsx`: `Card`, `SectionHeading`, `Button`, `IconButton`, `Pill`, `StatusPill`, `ProgressBar`, `Tabs`, `Modal`, `Drawer`, `Field`, `Input`, `Select`, `Textarea`, `Th`, `Td`, `EmptyState`, `Donut`, `BarPairs`, `SparkArea`, `ToastHost`, `Icon` (Material Symbols).
- Desain token Tailwind (warna, spacing, tipografi) sudah didefinisikan di `src/index.css` — pakai kelas seperti `bg-primary`, `text-on-surface-variant`, `font-headline-md`, `p-space-md`, `gap-space-lg` agar tampilan konsisten.

## 4. Data & aksi dari store

`useApp()` (`src/lib/store.tsx`) menyediakan data hidup dan aksi yang bisa langsung dipakai halaman Anda:

**Data**: `sj`, `invoices`, `payments`, `bankTx`, `customers`, `suppliers`, `commodities`, `vehicles`, `drivers`, `employees`, `payrollRuns`, `fuelLogs`, `legacyDebts`, `period`.

**Turunan siap pakai**: `kpi` (SJ, sudah/belum invoice, total tagihan), `aging`, `outstandingTotal`, `supplierDebtTotal`, `legacyTotal`, `legacyOutstandingTotal`, `fuelStock`, `ritaseToday`, `cashFlowDaily`, `accountsWithBalance`, `accountBalance(id)`, `paidOf(invoiceId)`, `outstandingOf(invoice)`, `computedStatus(invoice)`, `notifications`.

**Aksi**: `addSJ`, `updateSJ`, `deleteSJ`, `createInvoice(sjIds)`, `recordPayment({…})`, `addBankTx`, `transfer`, `paySupplier`, `payLegacy`, `addFuelPurchase`, `runPayroll`, `saveMaster`, `removeMaster`, `setPeriod`, `go(route)`, `toast(title, detail, tone)`.

Semua aksi otomatis memperbarui Dashboard, aging piutang, dan saldo rekening — jadi halaman baru Anda tetap sinkron dengan modul lain.

## 5. Cetak dokumen (PDF)

Fungsi cetak berkop resmi ada di `src/lib/print.ts`:
`printSuratJalan`, `printInvoice`, `printCashReport`, `printPayslip`, `printRekapKeuangan`, `printStatement`.

Contoh: `onPrint={() => printStatement(receivables, suppliers, legacy, app.period)}`.

---

## 6. Manajemen Pengguna & Hak Akses (RBAC)

Semua diatur pada **Master Data → tab “Pengguna & Hak Akses”** (`src/components/UserManagement.tsx`), data & logika di `src/lib/permissions.ts`.

### Alur mendaftarkan karyawan sebagai pengguna
1. Buka **Master Data → Karyawan** → pada baris karyawan klik **Buat Akun** (atau dari **HRD & Payroll** klik ikon *Kelola Akses*), atau langsung **Master Data → Pengguna & Hak Akses → Tambah Akun Pengguna**.
2. Isi: **Karyawan** (wajib, akun menempel ke data karyawan), **Username**, **Email korporat**, **Peran (template)**, **Cakupan data**, **Status akun**, catatan.
3. Sesuaikan **Izin per Menu** — matriks 9 menu × 4 aksi: **Lihat (L) / Tambah (T) / Ubah (U) / Hapus (H)**. Tombol cepat: *Terapkan Template Peran*, *Beri Semua*, *Kosongkan*, atau toggle “pilih/penuh” per baris.
4. Simpan. Akun langsung bisa dipakai login (halaman Login menampilkan daftar akun aktif), dan sidebar otomatis hanya menampilkan menu dengan izin **Lihat**.

### Peran bawaan (template)
| Peran | Modul terlihat | Izin aktif |
| --- | --- | --- |
| Super Admin | 9/9 | 36 (semua) |
| Finance & Treasury | 9/9 | 26 |
| Operasional Site | 8/9 (HRD disembunyikan) | 15 |
| HRD & Kepegawaian | 9/9 | 14 |
| Viewer / Auditor | 9/9 | 9 (hanya Lihat) |

### Penerapan izin di aplikasi
- **Sidebar, pencarian cepat, notifikasi** — hanya menampilkan menu/rujuk yang boleh dilihat.
- **Router (`src/App.tsx`)** — rute tanpa izin *Lihat* menampilkan halaman “Akses Modul Ditolak”.
- **Tombol aksi** — dinonaktifkan otomatis bila izin tidak ada: tambah/ubah/hapus master data, terbitkan & batalkan surat jalan, buat invoice, catat pembayaran, pelunasan hutang/piutang, transfer & mutasi kas/bank, pembelian solar, jalankan payroll.
- **API store**: `app.currentAccount`, `app.can(route, "view" | "create" | "edit" | "delete")`, `app.users`, `app.saveUser()`, `app.removeUser()`, `app.setUserStatus()`, `app.resetUserPassword()`, `app.requestUserForm(employeeId)`.

### Saat menambah menu baru
Tambahkan juga hak aksesnya: entri menu di `src/lib/routes.ts` + slot halaman di `src/pages/registry.tsx`, lalu tambahkan baris spesifik menu tersebut pada `rolePermissions()` di `src/lib/permissions.ts` (template peran) — matriks izin, sidebar, dan guard rute otomatis mengikuti.

---

## 7. Mengatur KM / Interval Servis Berikutnya (Servis Berkala Armada)

Ada **3 tempat** untuk mengatur km servis berikutnya:

### a. Parameter global — Operasional & BBM → tab **Pemeliharaan** → tombol *Atur Parameter Servis*
- **Interval Servis Default (km)** — jarak antar servis berkala (mis. 10.000 km).
- **Ambang Peringatan (km)** — notifikasi muncul saat sisa km ≤ nilai ini (mis. 1.500 km).
- Checkbox **“Terapkan interval ke seluruh unit”** → menyamakan interval semua armada; bila tidak dicentang hanya nilai default yang berubah. Tersedia tabel pratinjau “Interval Setelah Simpan” + target berikutnya per unit.
- Tombol **Simpan Parameter** → `app.setMaintenanceParams({ defaultIntervalKm, warnKm }, applyToAll)`.

### b. Per unit (harian/operasional) — tabel *Kartu Servis* pada tab Pemeliharaan
- Tombol **Odometer** → modal update odometer berjalan (validasi tidak boleh mundur, langsung menghitung sisa km & status).
- Tombol **Catat Servis** → modal servis: tanggal, **odometer saat servis**, **interval servis berikutnya**, status unit setelah servis, **biaya** + rekening beban, catatan pekerjaan. Saat disimpan, `lastServiceOdometer` & interval dikunci ulang sehingga **target servis berikutnya otomatis bergeser** = odometer servis + interval, dan biaya tercatat sebagai kas keluar kategori *Pemeliharaan* (ikut ke Rekap Keuangan).
- Tombol **Cetak Jadwal Servis** → dokumen berkop berisi seluruh unit, odometer kini, servis terakhir, interval, target berikutnya, sisa km, dan status.

### c. Master Data → tab **Armada** (penyuntingan langsung)
Kolom & field form: **Odometer Kini**, **Servis Terakhir — Odometer**, **Interval Servis (km)**, **Tanggal Servis Terakhir**, **Catatan Pemeliharaan**. Tabel menampilkan kolom *Servis Berikutnya* dan badge sisa km (hijau = terjadwal, amber = mendekati, merah = terlambat).

> Rumus: **Servis Berikutnya = Servis Terakhir (odometer) + Interval Servis**, **Sisa = Servis Berikutnya − Odometer Kini** (negatif = terlambat).
> Helper tersedia di `src/lib/data.ts`: `nextServiceKm(v)`, `remainingServiceKm(v)`, konstanta `MAINT_DEFAULT`.
> Turunan store: `app.maintenancePlan` (terurut dari yang paling dekat servis, memuat `overdue`/`dueSoon`) + `app.maintenance` (parameter aktif); aksi: `app.updateOdometer()`, `app.recordService()`, `app.setMaintenanceParams()`.

---

## 8. Invoice Gabungan, Revisi Invoice & Carry Forward (Manajemen Invoice)

Semua fitur ini berada di **Manajemen Invoice** (`src/pages/Invoices.tsx`) dengan logika di `src/lib/store.tsx`.

### a. Invoice Gabungan (`kind: "Gabungan"`)
**Tujuan:** satu invoice ditagihkan kepada **satu pelanggan penagih (bill to)**, tetapi dapat mencakup surat jalan dari beberapa pelanggan/kontraktor berbeda (mis. holding menagihkan ritase anak perusahaan / kontraktor mitra).

- Tombol **“Invoice Gabungan”** pada header *Buku Besar Invoice* → modal:
  - pilih **Ditagihkan Kepada (Bill To)** + termin + catatan,
  - daftar surat jalan belum diinvoice dikelompokkan **per pelanggan asal muatan** (label *Penagih* / *Asal muatan*), ada tombol *pilih grup* dan checkbox *Pilih Semua Tampil*,
  - ringkasan live: jumlah SJ, volume m³, jumlah pelanggan asal, DPP, PPN 11%, total, jatuh tempo.
- API: `app.createInvoice(sjIds, { billTo, term, note, kind })`. Sistem otomatis menandai `kind = "Gabungan"` bila pilihan memuat >1 pelanggan, menyimpan `coveredCustomerIds`, dan menulis audit *Terbit*.
- Tampilan: badge **Gabungan n pelanggan** di tabel, panel khusus di drawer, dan kolom “asal muatan” pada rincian invoice (tiap SJ tetap menampilkan pelanggan asalnya).

### b. Revisi Invoice (tambah / kurangi surat jalan)
**Aturan:** hanya untuk invoice **sudah terbit & belum menerima pembayaran** (`app.canRevise(invoice)`), dan invoice harus menyisakan minimal 1 surat jalan.

- Tombol **Revisi** (ikon `rule`) pada baris tabel & drawer; nonaktif otomatis dengan alasan pada tooltip bila tidak memenuhi syarat (mis. *“Invoice sudah menerima pembayaran Rp X. Gunakan Carry Forward…”*).
- Modal revisi menampilkan dua panel:
  - **Surat Jalan dalam Invoice Ini** → centang untuk **dikeluarkan** (statusnya kembali `Terkirim` & `invoiceId = null`, sehingga bisa ditagihkan kembali),
  - **Surat Jalan Tersedia** → centang untuk **ditambahkan** (opsional: tampilkan seluruh pelanggan → menjadikan invoice gabungan),
  - rekapitulasi otomatis: total sebelum, DPP baru, PPN baru, total baru, dan **selisih**.
- API: `app.reviseInvoice(invoiceId, { addSjIds, removeSjIds, note })`. Setiap revisi dicatat pada **audit trail invoice** (`revisions[]`) dan tampil di drawer sebagai timeline.

### c. Carry Forward (pembayaran bertahap → sisa SJ jadi invoice baru)
**Skenario:** invoice dibayar sebagian, sisa surat jalan yang **belum tertutup pembayaran** ditarik ke **invoice baru** agar tetap dapat ditagihkan.

- Tombol **Carry Forward** (ikon `east`) aktif bila `pembayaran > 0` **dan** masih ada sisa tagihan.
- Modal menampilkan **alokasi FIFO** pembayaran per surat jalan (`app.invoiceCoverage(invoice.id)` → tiap SJ: nilai, tertutup, sisa):
  - SJ yang sudah tertutup pembayaran → **terkunci** (tidak bisa dipindah),
  - SJ yang belum tersentuh pembayaran → dapat dipilih,
  - ringkasan: total invoice, sudah dibayar, sisa, nilai carry forward, plus pratinjau **invoice asal setelah carry forward** (menjadi Lunas atau tetap Sebagian) dan **invoice baru** (DPP, PPN, total, jatuh tempo).
- API: `app.carryForward(invoiceId, sjIds, { date, term, note })`. Guard: nilai yang diteruskan **tidak boleh melebihi sisa tagihan** (agar pembayaran yang sudah diterima tetap tertutup) dan invoice asal wajib menyisakan minimal satu SJ. Invoice baru menyimpan `carryFromInvoiceId`, nomor dibuat otomatis, dan kedua invoice mencatat audit *Carry Forward*.
- Konsistensi: `total tagihan invoice asal setelah carry + total invoice baru = total invoice sebelum carry`.

### Ringkasan API terkait
| Kebutuhan | API |
| --- | --- |
| Terbitkan invoice (reguler / gabungan) | `app.createInvoice(sjIds, { billTo?, term?, note? })` |
| Cek kelayakan revisi | `app.canRevise(invoice)` → `{ ok, reason }` |
| Revisi susunan surat jalan | `app.reviseInvoice(id, { addSjIds?, removeSjIds?, note? })` |
| Alokasi pembayaran per SJ | `app.invoiceCoverage(invoiceId)` |
| Pindahkan sisa SJ ke invoice baru | `app.carryForward(id, sjIds, { date?, term?, note? })` |
| Audit perubahan invoice | `invoice.revisions[]` (`Terbit` / `Revisi` / `Carry Forward` / `Pembayaran`) |

---

## 9. Tata Letak Cetak PDF Invoice (ringkasan + lampiran surat jalan)

Fungsi `printInvoice()` / pembangun `invoiceHtml()` di `src/lib/print.ts` menghasilkan dokumen multi-halaman:

**Halaman 1 — Ringkasan Invoice**
- Kop resmi *INVOICE / FAKTUR PENAGIHAN* + nomor invoice & tanggal cetak.
- Banner khusus **INVOICE GABUNGAN** (bila `kind = "Gabungan"`): pelanggan penagih + jumlah pelanggan asal muatan + arahan bahwa rincian ada di halaman lampiran.
- Identitas penagihan: Ditagihkan Kepada, kode/kota, kontak, termin, tanggal invoice, jatuh tempo, status sistem, jenis invoice, jumlah surat jalan, total volume m³.
- **Ringkasan per Pelanggan Asal Muatan** (nama, kode, kota, label *penagih/asal muatan*, jumlah SJ, volume, nilai muatan) + baris TOTAL.
- **Ringkasan Tagihan**: DPP, PPN 11%, Total Tagihan, Sudah Dibayar, Sisa Kewajiban + instruksi pembayaran & blok tanda tangan.

**Halaman 2 — Pembuka Lampiran**
- Kop *LAMPIRAN SURAT JALAN* dengan nomor invoice yang dirujuk, jumlah dokumen, dan total volume.

**Halaman 3 dan seterusnya — Lampiran per Pelanggan (`page-break` per customer)**
- Satu blok **per pelanggan asal muatan** (`LAMPIRAN n — ASAL MUATAN: …`) memuat kode, kota, termin, penanda *bill to*, jumlah SJ, volume, dan subtotal DPP.
- Kolom tabel sesuai kebutuhan: **Nomor Surat Jalan** (beserta tanggal & lokasi muat), **Driver**, **Nopol**, **Jenis Komoditas**, **Volume (m³)**, **Nilai Muatan**, ditutup baris *Subtotal* per pelanggan.
- Untuk invoice reguler (satu pelanggan) tetap tampil satu blok lampiran tanpa pengelompokan tambahan.

**Halaman terakhir — Rekapitulasi Lampiran**
- Rekap seluruh pelanggan asal muatan (jumlah SJ, volume, DPP), PPN, Total Tagihan (dinyatakan *sesuai halaman 1*), Sudah Dibayar, Sisa Kewajiban + blok tanda tangan Admin Penagihan / Verifikasi Timbangan / Finance Manager.

Catatan teknis: CSS cetak menambahkan kelas `.page` (`page-break-before: always`) dan komponen blok lampiran (`.grp`, `.grp-head`, `.mini`). Jumlah halaman lampiran = jumlah pelanggan asal muatan + baris tooltip tombol cetak menampilkan estimasi ini. Total DPP lampiran selalu sama dengan DPP invoice karena lampiran membaca `invoice.sjIds` terkini (otomatis mengikuti hasil **revisi** dan **carry forward**).

---

## 10. Tarif Pajak Manual & Tanda Tangan Cetak Invoice

### a. Tarif pajak (PPN) dapat diisi manual
- **Model**: `Invoice.ppnRate` (mis. `0.11` = 11%) menyimpan tarif yang dipakai saat invoice diterbitkan; default sistem `app.tax.ppnRate` = 11%.
- **Tempat mengisi** (semua ber-*live recalculate*):
  1. **Invoice Gabungan** → field *Tarif Pajak PPN (%)* + checkbox *“Simpan …% sebagai tarif pajak default sistem”*.
  2. **Tagih SJ Belum Diinvoice** (penagihan massal) → field tarif di bagian atas berlaku untuk semua invoice yang dihasilkan, plus tombol **Jadikan Tarif Default**.
  3. **Revisi Invoice** → field tarif (default mengikuti tarif invoice saat ini) dengan rekap ulang total & selisih.
  4. **Carry Forward** → field tarif (mewarisi tarif invoice asal) untuk invoice baru.
- **API**: `app.createInvoice(sjIds, { ppnRate, saveRateAsDefault, … })`, `app.reviseInvoice(id, { ppnRate, … })`, `app.carryForward(id, sjIds, { ppnRate, … })`, `app.setTaxRate(rate)` (default sistem), `app.taxRateLabel(rate)` (label siap pakai, mis. `PPN 1.5%`). Nilai diterima dalam desimal (11% → `0.11`).
- **Audit**: setiap revisi/carry forward mencantumkan tarif yang dipakai pada audit trail invoice.
- **Tampilan**: drawer invoice menampilkan label tarif + penanda *tarif manual* / *tarif default*; label pajak di tabel, rekap, dan cetak PDF mengikuti tarif invoice (tidak lagi hardcoded 11%).

### b. Tanda tangan pada hasil cetak PDF
- Hanya **satu blok tanda tangan: Direktur (`Gunawan Santosa`)** dengan tempat & tanggal, dan **hanya di halaman 1 (ringkasan invoice)**.
- Blok tanda tangan tiga kolom (Dibuat/Diperiksa/Disetujui maupun Admin Penagihan/Verifikasi Timbangan/Finance Manager) **dihapus** dari halaman ringkasan maupun halaman lampiran/rekapitulasi.
- Halaman lampiran (pembuka, per pelanggan, rekapitulasi) tidak memuat tanda tangan apa pun — hanya catatan verifikasi timbangan pada tiap blok pelanggan.

---

## 11. Saldo Awal Bulanan per Akun (input pertama & roll forward otomatis)

**Prinsip:** *saldo awal adalah posisi kas/bank pada awal periode — BUKAN pemasukan.* Nilai ini tidak membuat mutasi kas masuk, tidak menambah pendapatan/piutang, dan **tidak dihitung** pada kolom “Kas Masuk” di dashboard/rekap.

### Tata cara penggunaan
1. **Penggunaan pertama kali** → *Kas, Bank & Keuangan → tombol **Inisialisasi Pertama Kali*** → modal menampilkan seluruh rekening sekaligus (nilai acuan = saldo akhir bulan sebelumnya bila ada), boleh diberi catatan migrasi (mis. “migrasi dari Excel per 01/10/2026”). Tersimpan sebagai tipe **Saldo Awal Sistem**.
2. **Bulan-bulan berikutnya otomatis** → saldo awal = **saldo akhir bulan sebelumnya** (roll forward berantai: Agustus → September → Oktober → November → …), tanpa perlu input ulang. Kolom *Sumber* menandai nilai sebagai **Otomatis Roll Forward** beserta bulan sumbernya.
3. **Bila ingin dikunci permanen** → tombol ⟳ (*Kunci Roll Forward*) menyimpan nilai otomatis menjadi entri saldo awal tetap + bukti audit.
4. **Input manual** (tombol **Input Saldo Awal Bulan**) hanya diperlukan untuk: rekening baru, koreksi/rekonsiliasi bank, atau pemisahan saldo. Terdapat tombol pintas **Isi dari Saldo Akhir <bulan lalu>**.
5. **Koreksi** → tombol ↺ menghapus entri tersimpan sehingga bulan tersebut kembali memakai perhitungan otomatis (tercatat sebagai audit *koreksi*).

### Tampilan di aplikasi
- Section **“Saldo Awal Bulan & Roll Forward”** di *Kas, Bank & Keuangan*: pemilih bulan (input `type="month"` + navigasi bulan sebelumnya/berikutnya), 4 kartu ringkas (Saldo Awal, Saldo Akhir, selisih antar bulan, penegasan “Bukan Pemasukan”), **Kartu Saldo Awal per Rekening** (Saldo Awal, Sumber, Mutasi Masuk, Mutasi Keluar, Saldo Akhir, aksi ⟳/↺), panduan 1-2-3, dan **Audit Saldo Awal** (tipe: sistem / manual / rollforward / koreksi).
- **Cetak** → `printOpeningBalance()` menghasilkan dokumen *Kartu Saldo Awal Bulanan & Rekonsiliasi* (tabel per rekening, total, audit saldo awal, tanda tangan Direktur).
- Dashboard & kartu rekening kini memakai **saldo awal bulan laporan**, sehingga angka referensi tetap sama (Saldo awal Rp 355.000.000 • masuk Rp 350.050.000 • keluar Rp 154.250.000 • saldo akhir Rp 550.800.000).

### API
| Kebutuhan | API |
| --- | --- |
| Saldo awal bulan tertentu (manual / otomatis / sistem) | `app.openingOf(accountId, "2026-11")` → `{ amount, source, fromMonth, explicit }` |
| Saldo akhir bulan tertentu | `app.closingOf(accountId, "2026-10")` |
| Mutasi masuk/keluar + jumlah transaksi bulan tertentu | `app.monthlyMutations(accountId, "2026-10")` |
| Kartu lengkap per rekening dalam satu bulan | `app.monthSummary("2026-11")` |
| Input / inisialisasi saldo awal | `app.setOpeningBalance(ym, [{ accountId, amount, note }], { firstTime? })` |
| Kunci nilai otomatis jadi permanen | `app.rollForwardMonth(ym)` |
| Koreksi (kembali otomatis) | `app.clearOpening(accountId, ym)` |
| Riwayat perubahan saldo awal | `app.openingLog` |
| Helper bulan | `monthKey`, `prevYm`, `nextYm`, `ymLabel` di `src/lib/format.ts` |

**Catatan implementasi:** entri disimpan di map `openingBalances` dengan kunci `` `${accountId}|${YYYY-MM}` `` + tipe (`sistem` / `manual` / `rollforward`), sedangkan `Account.opening` menyimpan saldo awal sistem sebagai fallback. Urutan prioritas: **input manual bulan tsb → input manual terakhir sebelumnya + roll forward → saldo awal sistem**.
