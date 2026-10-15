/**
 * ============================================================
 *  REGISTRY HALAMAN — LBS SYSTEM 1.0
 * ============================================================
 *  Setiap menu pada sidebar memiliki SATU slot halaman di sini.
 *
 *  CARA MENGHUBUNGKAN HALAMAN BARU (per menu):
 *  1. Simpan komponen halaman Anda, misalnya `src/pages/RekapKeuangan.tsx`
 *     yang meng-export `export default function RekapKeuangan() { ... }`.
 *  2. Import komponen tersebut pada blok import di bawah.
 *  3. Ganti nilai slot pada `PAGES` sesuai id menu (lihat src/lib/routes.ts):
 *       dashboard        → Dashboard
 *       surat-jalan      → SuratJalan
 *       invoice          → Invoices
 *       kas-bank         → KasBank
 *       rekap-keuangan   → RekapKeuangan      <-- baru
 *       hutang-piutang   → HutangPiutang      <-- baru
 *       bbm              → Bbm
 *       master-data      → MasterData
 *       hrd              → Hrd
 *  4. Menu di sidebar, breadcrumb, pencarian cepat, dan router pada
 *     App.tsx otomatis mengikuti — tidak perlu mengubah file lain.
 *
 *  Kontrak minimal sebuah halaman:
 *   - Boleh memakai `useApp()` (`src/lib/store.tsx`) untuk data & aksi:
 *     app.kpi, app.aging, app.sj, app.invoices, app.recordPayment(), dsb.
 *   - Disarankan dibungkus `<PageBody>` + `<PageHeader>` dari
 *     `src/components/Shell.tsx` agar spacing & judul konsisten.
 *   - Ekspor `default` (React component tanpa props).
 * ============================================================
 */
import type { ReactNode } from "react";
import { NAV, type Route } from "@/lib/routes";
import Bbm from "./Bbm";
import Dashboard from "./Dashboard";
import Hrd from "./Hrd";
import HutangPiutang from "./HutangPiutang";
import Invoices from "./Invoices";
import KasBank from "./KasBank";
import MasterData from "./MasterData";
import RekapKeuangan from "./RekapKeuangan";
import SuratJalan from "./SuratJalan";

export const PAGES: Record<Route, ReactNode> = {
  dashboard: <Dashboard />,
  "surat-jalan": <SuratJalan />,
  invoice: <Invoices />,
  "kas-bank": <KasBank />,
  "rekap-keuangan": <RekapKeuangan />,
  "hutang-piutang": <HutangPiutang />,
  bbm: <Bbm />,
  "master-data": <MasterData />,
  hrd: <Hrd />,
};

/** Halaman yang dirender untuk rute aktif (fallback: Dashboard). */
export function pageFor(route: Route): ReactNode {
  return PAGES[route] ?? PAGES.dashboard;
}

export { NAV };
