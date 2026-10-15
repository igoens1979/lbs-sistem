import { EMPLOYEES } from "./data";
import { iso, TODAY } from "./format";
import { NAV, type Route } from "./routes";

/* =========================================================
   Manajemen Pengguna & Hak Akses (RBAC) — LBS System 1.0
   ========================================================= */

export type PermAction = "view" | "create" | "edit" | "delete";

export const PERM_ACTIONS: { id: PermAction; label: string; short: string; icon: string; desc: string }[] = [
  { id: "view", label: "Lihat", short: "L", icon: "visibility", desc: "Melihat menu, data, dan laporan" },
  { id: "create", label: "Tambah", short: "T", icon: "add_circle", desc: "Membuat data / dokumen baru" },
  { id: "edit", label: "Ubah", short: "U", icon: "edit", desc: "Mengubah, memproses, atau memverifikasi data" },
  { id: "delete", label: "Hapus", short: "H", icon: "delete", desc: "Menghapus / membatalkan data" },
];

export type ModulePermissions = Record<Route, Record<PermAction, boolean>>;

export type UserRoleId = "super-admin" | "finance" | "operasional" | "hrd" | "viewer";

export interface RoleTemplate {
  id: UserRoleId;
  label: string;
  desc: string;
  icon: string;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  { id: "super-admin", label: "Super Admin", desc: "Akses penuh semua modul termasuk pengaturan sistem", icon: "admin_panel_settings" },
  { id: "finance", label: "Finance & Treasury", desc: "Kas/bank, invoice, rekap, hutang piutang penuh", icon: "account_balance" },
  { id: "operasional", label: "Operasional Site", desc: "Surat jalan & BBM penuh, keuangan hanya lihat", icon: "local_shipping" },
  { id: "hrd", label: "HRD & Kepegawaian", desc: "Payroll, master data & kepegawaian penuh", icon: "badge" },
  { id: "viewer", label: "Viewer / Auditor", desc: "Hanya boleh melihat seluruh modul", icon: "visibility" },
];

export interface UserAccount {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  role: UserRoleId;
  status: "Aktif" | "Nonaktif" | "Ditangguhkan";
  scope: "Semua Site" | "Site Golo Mori" | "Labuan Bajo" | "Kantor Pusat";
  createdAt: string;
  lastLogin: string;
  note?: string;
  permissions: ModulePermissions;
}

/* ---------------- Builder & template peran ---------------- */

export function emptyPermissions(): ModulePermissions {
  const out = {} as ModulePermissions;
  NAV.forEach((n) => {
    out[n.id] = { view: false, create: false, edit: false, delete: false };
  });
  return out;
}

export function allPermissions(): ModulePermissions {
  const out = {} as ModulePermissions;
  NAV.forEach((n) => {
    out[n.id] = { view: true, create: true, edit: true, delete: true };
  });
  return out;
}

export function buildPermissions(spec: Partial<Record<Route, PermAction[]>>): ModulePermissions {
  const out = emptyPermissions();
  (Object.keys(spec) as Route[]).forEach((r) => {
    spec[r]?.forEach((a) => {
      if (out[r]) out[r][a] = true;
    });
  });
  return out;
}

const R = (view: boolean, create = false, edit = false, del = false): PermAction[] => [
  ...(view ? (["view"] as PermAction[]) : []),
  ...(create ? (["create"] as PermAction[]) : []),
  ...(edit ? (["edit"] as PermAction[]) : []),
  ...(del ? (["delete"] as PermAction[]) : []),
];

export function rolePermissions(role: UserRoleId): ModulePermissions {
  switch (role) {
    case "super-admin":
      return allPermissions();
    case "finance":
      return buildPermissions({
        dashboard: R(true, true, true, true),
        "surat-jalan": R(true, true),
        invoice: R(true, true, true, true),
        "kas-bank": R(true, true, true, true),
        "rekap-keuangan": R(true, true, true),
        "hutang-piutang": R(true, true, true, true),
        bbm: R(true, true, true),
        "master-data": R(true),
        hrd: R(true),
      });
    case "operasional":
      return buildPermissions({
        dashboard: R(true),
        "surat-jalan": R(true, true, true, true),
        invoice: R(true),
        "kas-bank": R(true),
        "rekap-keuangan": R(true),
        "hutang-piutang": R(true),
        bbm: R(true, true, true, true),
        "master-data": R(true, true),
        hrd: R(false),
      });
    case "hrd":
      return buildPermissions({
        dashboard: R(true),
        "surat-jalan": R(true),
        invoice: R(true),
        "kas-bank": R(true),
        "rekap-keuangan": R(true),
        "hutang-piutang": R(true),
        bbm: R(true),
        "master-data": R(true, true, true),
        hrd: R(true, true, true, true),
      });
    case "viewer":
      return buildPermissions({
        dashboard: R(true),
        "surat-jalan": R(true),
        invoice: R(true),
        "kas-bank": R(true),
        "rekap-keuangan": R(true),
        "hutang-piutang": R(true),
        bbm: R(true),
        "master-data": R(true),
        hrd: R(true),
      });
  }
}

export const roleLabel = (role: UserRoleId) => ROLE_TEMPLATES.find((r) => r.id === role)?.label ?? role;

/** Jumlah modul yang bisa dilihat & jumlah aksi yang diizinkan. */
export function permissionSummary(p: ModulePermissions) {
  const routes = Object.keys(p) as Route[];
  const visible = routes.filter((r) => p[r].view).length;
  const actions = routes.reduce((s, r) => s + PERM_ACTIONS.filter((a) => p[r][a.id]).length, 0);
  return { visible, actions, total: routes.length };
}

export function employeeOf(employeeId: string) {
  return EMPLOYEES.find((e) => e.id === employeeId);
}

/* ---------------- Data awal akun pengguna ---------------- */

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "U-001",
    employeeId: "E-018", // Gunawan Santosa — Manajemen / Finance
    username: "gunawan.s",
    email: "gunawan.s@lbs-group.co.id",
    role: "super-admin",
    status: "Aktif",
    scope: "Semua Site",
    createdAt: "2024-01-08",
    lastLogin: iso(TODAY),
    note: "Pemilik sistem & approval akhir seluruh modul.",
    permissions: rolePermissions("super-admin"),
  },
  {
    id: "U-002",
    employeeId: "E-013", // Rosalia Mendonca — Keuangan & Pajak
    username: "rosalia.m",
    email: "rosalia.m@lbs-group.co.id",
    role: "finance",
    status: "Aktif",
    scope: "Kantor Pusat",
    createdAt: "2024-02-19",
    lastLogin: "2026-10-14",
    note: "Operator kas/bank & penagihan invoice.",
    permissions: rolePermissions("finance"),
  },
  {
    id: "U-003",
    employeeId: "E-017", // Paulus Aran — Supervisor Operasional Site
    username: "paulus.aran",
    email: "paulus.aran@lbs-group.co.id",
    role: "operasional",
    status: "Aktif",
    scope: "Site Golo Mori",
    createdAt: "2024-05-06",
    lastLogin: "2026-10-15",
    note: "Penerbit surat jalan & pencatatan BBM lapangan.",
    permissions: rolePermissions("operasional"),
  },
  {
    id: "U-004",
    employeeId: "E-016", // Yohanes Pareira — HRD & Umum
    username: "yohanes.p",
    email: "yohanes.p@lbs-group.co.id",
    role: "hrd",
    status: "Aktif",
    scope: "Kantor Pusat",
    createdAt: "2024-07-22",
    lastLogin: "2026-10-13",
    note: "Menjalankan payroll & pemeliharaan master karyawan.",
    permissions: rolePermissions("hrd"),
  },
  {
    id: "U-005",
    employeeId: "E-020", // Simon Duling — Security
    username: "simon.duling",
    email: "simon.duling@lbs-group.co.id",
    role: "viewer",
    status: "Aktif",
    scope: "Site Golo Mori",
    createdAt: "2025-01-15",
    lastLogin: "2026-10-09",
    note: "Akses baca untuk pengecekan fisik stockpile & kas terminal.",
    permissions: rolePermissions("viewer"),
  },
  {
    id: "U-006",
    employeeId: "E-019", // Maria Fatima — Commercial & CRM
    username: "maria.fatima",
    email: "maria.fatima@lbs-group.co.id",
    role: "finance",
    status: "Nonaktif",
    scope: "Labuan Bajo",
    createdAt: "2024-09-02",
    lastLogin: "2026-09-28",
    note: "Akun dinonaktifkan sementara (mutasi tugas komersial).",
    permissions: buildPermissions({
      dashboard: R(true),
      invoice: R(true),
      "hutang-piutang": R(true),
      "rekap-keuangan": R(true),
      "master-data": R(true),
    }),
  },
];
