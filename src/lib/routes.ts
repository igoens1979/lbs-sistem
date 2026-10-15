/**
 * LBS System 1.0 — Definisi menu & rute (satu sumber kebenaran).
 *
 * Menambah / menghapus menu cukup diubah di file ini + daftarkan komponen
 * halamannya di `src/pages/registry.tsx`.
 */
export type Route =
  | "dashboard"
  | "surat-jalan"
  | "invoice"
  | "kas-bank"
  | "rekap-keuangan"
  | "hutang-piutang"
  | "bbm"
  | "master-data"
  | "hrd";

export interface RouteMeta {
  id: Route;
  label: string;
  icon: string;
  group: string;
  hint: string;
  /** file komponen halaman — dipakai sebagai catatan integrasi */
  page: string;
}

export const GROUPS = ["Command Center", "Operasional & Logistik", "Konfigurasi"] as const;

export const NAV: RouteMeta[] = [
  {
    id: "dashboard",
    label: "Dashboard Keuangan",
    icon: "dashboard",
    group: "Command Center",
    hint: "Konsolidasi kas, invoice & ritase",
    page: "src/pages/Dashboard.tsx",
  },
  {
    id: "surat-jalan",
    label: "Surat Jalan & Logistik",
    icon: "local_shipping",
    group: "Operasional & Logistik",
    hint: "Terbitkan & tagih surat jalan",
    page: "src/pages/SuratJalan.tsx",
  },
  {
    id: "invoice",
    label: "Manajemen Invoice",
    icon: "receipt_long",
    group: "Operasional & Logistik",
    hint: "Penagihan, aging & pembayaran",
    page: "src/pages/Invoices.tsx",
  },
  {
    id: "kas-bank",
    label: "Kas, Bank & Keuangan",
    icon: "account_balance_wallet",
    group: "Operasional & Logistik",
    hint: "Mutasi, transfer & kewajiban",
    page: "src/pages/KasBank.tsx",
  },
  {
    id: "rekap-keuangan",
    label: "Rekap Keuangan",
    icon: "summarize",
    group: "Operasional & Logistik",
    hint: "Laba rugi, arus kas & rincian biaya",
    page: "src/pages/RekapKeuangan.tsx",
  },
  {
    id: "hutang-piutang",
    label: "Hutang Piutang",
    icon: "balance",
    group: "Operasional & Logistik",
    hint: "Kartu piutang mitra & kewajiban",
    page: "src/pages/HutangPiutang.tsx",
  },
  {
    id: "bbm",
    label: "Operasional & BBM",
    icon: "local_gas_station",
    group: "Operasional & Logistik",
    hint: "Stok solar, armada & pemeliharaan",
    page: "src/pages/Bbm.tsx",
  },
  {
    id: "master-data",
    label: "Master Data",
    icon: "database",
    group: "Konfigurasi",
    hint: "Pelanggan, supplier, armada, karyawan",
    page: "src/pages/MasterData.tsx",
  },
  {
    id: "hrd",
    label: "HRD & Payroll",
    icon: "badge",
    group: "Konfigurasi",
    hint: "Kepegawaian, absensi & payroll",
    page: "src/pages/Hrd.tsx",
  },
];

export const navByGroup = (): Record<string, RouteMeta[]> =>
  NAV.reduce<Record<string, RouteMeta[]>>((acc, n) => {
    acc[n.group] = acc[n.group] ?? [];
    acc[n.group].push(n);
    return acc;
  }, {});

export const routeMeta = (route: Route): RouteMeta => NAV.find((n) => n.id === route) ?? NAV[0];
