import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MAINT_DEFAULT,
  nextServiceKm,
  remainingServiceKm,
  FUEL_STATE,
  legacyOutstanding,
  type Account,
  type BankTx,
  type Commodity,
  type Customer,
  type Driver,
  type Employee,
  type FuelLog,
  type ID,
  type Invoice,
  type InvoiceRevision,
  type Lead,
  type LeadStage,
  type LegacyDebt,
  type OpeningBalanceEntry,
  type OpeningLogEntry,
  type OpeningSource,
  type PayrollRun,
  type Payment,
  type SJ,
  type Supplier,
  type Vehicle,
} from "./data";
import { supabase, type DbAccount, type DbBankTx, type DbCustomer, type DbCommodity, type DbDriver, type DbEmployee, type DbFuelLog, type DbInvoice, type DbInvoiceRevision, type DbLead, type DbLegacyDebt, type DbOpeningBalance, type DbOpeningLog, type DbPayrollRun, type DbPayment, type DbSupplier, type DbSuratJalan, type DbUser, type DbVehicle } from "./supabase";
import { addDays, daysBetween, iso, monthKey, nextYm, prevYm, rupiah, TODAY, ymLabel } from "./format";
import type { Route } from "./routes";
import {
  DEFAULT_USERS,
  roleLabel,
  rolePermissions,
  type PermAction,
  type UserAccount,
} from "./permissions";

export type { Route } from "./routes";

export interface Toast {
  id: number;
  tone: "success" | "info" | "warn" | "error";
  title: string;
  detail?: string;
}

interface Session {
  name: string;
  role: string;
  email: string;
  accountId: string;
  division?: string;
}

interface State {
  accounts: Account[];
  sj: SJ[];
  invoices: Invoice[];
  invoiceRevisions: InvoiceRevision[];
  payments: Payment[];
  bankTx: BankTx[];
  invoiceSJ: { invoiceId: string; sjId: string }[];
  customers: Customer[];
  suppliers: Supplier[];
  commodities: Commodity[];
  vehicles: Vehicle[];
  drivers: Driver[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  leads: Lead[];
  fuelLogs: FuelLog[];
  fuelLiter: number;
  maintenance: { defaultIntervalKm: number; warnKm: number };
  tax: { ppnRate: number };
  bulkTaxRate: number | null;
  legacyDebts: LegacyDebt[];
  openingBalances: Record<string, OpeningBalanceEntry>;
  openingLog: OpeningLogEntry[];
  users: UserAccount[];
  userFormRequest: string | null;
  user: Session | null;
  loaded: boolean;
}

const initialState: State = {
  accounts: [],
  sj: [],
  invoices: [],
  invoiceRevisions: [],
  payments: [],
  bankTx: [],
  invoiceSJ: [],
  customers: [],
  suppliers: [],
  commodities: [],
  vehicles: [],
  drivers: [],
  employees: [],
  payrollRuns: [],
  leads: [],
  fuelLogs: [],
  fuelLiter: 12_400,
  maintenance: { ...MAINT_DEFAULT },
  tax: { ppnRate: 0.11 },
  bulkTaxRate: null,
  legacyDebts: [],
  openingBalances: {},
  openingLog: [],
  users: DEFAULT_USERS,
  userFormRequest: null,
  user: {
    name: "Gunawan Santosa",
    role: "Super Admin",
    email: "gunawan.s@lbs-group.co.id",
    accountId: "U-001",
    division: "Finance & Strategy",
  },
  loaded: false,
};

/* ---------- Converters DB -> App ---------- */

const toAccount = (r: DbAccount): Account => ({
  id: r.id,
  code: r.code,
  name: r.name,
  bank: r.bank,
  accountNo: r.account_no,
  opening: r.opening,
  type: r.account_type,
  role: r.role ?? undefined,
});

const toBankTx = (r: DbBankTx): BankTx => ({
  id: r.id,
  accountId: r.account_id,
  date: r.tx_date,
  desc: r.keterangan,
  category: r.kategori,
  direction: r.arah,
  amount: r.jumlah,
  allocation: r.alokasi ?? undefined,
  ref: r.ref ?? undefined,
});

const toCustomer = (r: DbCustomer): Customer => ({
  id: r.id,
  code: r.code,
  name: r.name,
  city: r.city,
  contact: r.contact,
  phone: r.phone,
  term: r.term,
  segment: r.segment as any,
  status: r.status as any,
  since: r.since,
});

const toSupplier = (r: DbSupplier): Supplier => ({
  id: r.id,
  code: r.code,
  name: r.name,
  category: r.category as any,
  contact: r.contact,
  phone: r.phone,
  hutang: r.hutang,
  dueDays: r.due_days,
});

const toCommodity = (r: DbCommodity): Commodity => ({
  id: r.id,
  name: r.name,
  unit: r.unit,
  price: r.price,
  stock: r.stock,
});

const toVehicle = (r: DbVehicle): Vehicle => ({
  id: r.id,
  plate: r.plate,
  model: r.model,
  type: r.vehicle_type as any,
  capacity: r.capacity,
  status: r.status as any,
  driverId: r.driver_id ?? undefined,
  odometer: r.odometer,
  lastServiceOdometer: r.last_service_odometer,
  serviceIntervalKm: r.service_interval_km,
  lastServiceDate: r.last_service_date ?? "",
  serviceNote: r.service_note ?? undefined,
});

const toDriver = (r: DbDriver): Driver => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  sim: r.sim,
  rating: r.rating,
  status: r.status as any,
});

const toSJ = (r: DbSuratJalan): SJ => ({
  id: r.id,
  no: r.no,
  date: r.sj_date,
  customerId: r.customer_id,
  commodityId: r.commodity_id,
  volume: r.volume,
  trips: r.trips,
  vehicleId: r.vehicle_id,
  driverId: r.driver_id,
  price: r.price,
  status: r.status as any,
  invoiceId: r.invoice_id ?? null,
  site: r.site,
  note: r.catatan ?? undefined,
});

const toInvoice = (r: DbInvoice, sjIds: ID[] = [], revs: DbInvoiceRevision[] = []): Invoice => ({
  id: r.id,
  no: r.no,
  customerId: r.customer_id,
  date: r.inv_date,
  dueDate: r.due_date,
  dpp: r.dpp,
  ppn: r.ppn,
  total: r.total,
  ppnRate: r.ppn_rate,
  status: r.status as any,
  sjIds,
  note: r.catatan ?? undefined,
  kind: r.jenis as any,
  coveredCustomerIds: [r.customer_id],
  revisions: revs.map(toInvoiceRevision),
  carryFromInvoiceId: undefined,
});

const toInvoiceRevision = (r: DbInvoiceRevision): InvoiceRevision => ({
  id: r.id,
  date: r.rev_date,
  by: r.by_user,
  type: r.rev_type as any,
  detail: r.detail,
});

const toPayment = (r: DbPayment): Payment => ({
  id: r.id,
  invoiceId: r.invoice_id,
  date: r.pay_date,
  amount: r.amount,
  method: r.method as any,
  accountId: r.account_id,
  ref: r.ref,
});

const toLegacyDebt = (r: DbLegacyDebt): LegacyDebt => ({
  id: r.id,
  tahap: r.tahap,
  pokok: r.pokok,
  tenor: r.tenor,
  cicilan: r.cicilan,
  paidCount: r.paid_count,
  nextDue: r.next_due ?? "",
  kreditur: r.kreditur,
});

const toOpeningBalanceEntry = (r: DbOpeningBalance): OpeningBalanceEntry => ({
  amount: r.amount,
  type: r.opening_type as OpeningSource,
  note: r.note ?? "",
  by: r.by_user,
  at: r.at_date ?? "",
  refMonth: r.ref_month ?? undefined,
});

const toOpeningLogEntry = (r: DbOpeningLog): OpeningLogEntry => ({
  id: r.id,
  ym: r.ym,
  accountId: r.account_id,
  amount: r.amount,
  by: r.by_user,
  at: r.at_date ?? "",
  note: r.note ?? "",
  type: r.log_type as OpeningSource | "koreksi",
});

const toUserAccount = (r: DbUser): UserAccount => ({
  id: r.id,
  employeeId: r.employee_id,
  username: r.username,
  email: r.email,
  role: r.role as any,
  status: r.user_status as any,
  scope: r.scope as any,
  createdAt: r.user_created_at ?? "",
  lastLogin: r.last_login ?? "-",
  note: r.note ?? undefined,
  permissions: r.permissions && Object.keys(r.permissions).length ? r.permissions : rolePermissions(r.role as any),
  mustChangePassword: (r as any).must_change_password ?? undefined,
  tempPassword: (r as any).temp_password ?? undefined,
});

const toEmployee = (r: DbEmployee): Employee => ({
  id: r.id,
  code: r.code,
  name: r.name,
  role: r.emp_role as any,
  division: r.division,
  joinDate: r.join_date ?? "",
  basic: r.basic,
  allowance: r.allowance,
  bank: (r.bank as "Bank NTT" | "Bank Mandiri" | "BCA") || "Bank NTT",
  status: r.emp_status as any,
  hadir: r.hadir,
  izin: r.izin,
  alpha: r.alpha,
});

const toLead = (r: DbLead): Lead => ({
  id: r.id,
  company: r.company,
  contact: r.contact,
  phone: r.phone,
  value: r.value,
  stage: r.stage as any,
  probability: r.probability,
  owner: r.owner,
  source: r.source,
  need: r.need,
  nextAction: r.next_action,
  nextDate: r.next_date ?? "",
  activities: [],
});

const toFuelLog = (r: DbFuelLog): FuelLog => ({
  id: r.id,
  date: r.fuel_date ?? "",
  accountId: r.account_id,
  supplierId: r.supplier_id ?? null,
  liter: r.liter,
  pricePerLiter: r.price_per_liter,
  note: r.note,
});

const toPayrollRun = (r: DbPayrollRun): PayrollRun => ({
  id: r.id,
  period: r.period,
  date: r.run_date ?? "",
  gross: r.gross,
  potongan: r.potongan,
  net: r.net,
  headcount: r.headcount,
  status: r.run_status as any,
});

/* ---------- Converters App -> DB ---------- */

const dbBankTx = (tx: BankTx) => ({
  id: tx.id,
  account_id: tx.accountId,
  tx_date: tx.date,
  keterangan: tx.desc,
  kategori: tx.category,
  arah: tx.direction,
  jumlah: tx.amount,
  alokasi: tx.allocation ?? null,
  ref: tx.ref ?? null,
});

const dbCustomer = (c: Customer) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  city: c.city,
  contact: c.contact,
  phone: c.phone,
  term: c.term,
  segment: c.segment,
  status: c.status,
  since: c.since,
});

const dbSupplier = (s: Supplier) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  category: s.category,
  contact: s.contact,
  phone: s.phone,
  hutang: s.hutang,
  due_days: s.dueDays,
});

const dbCommodity = (c: Commodity) => ({
  id: c.id,
  name: c.name,
  unit: c.unit,
  price: c.price,
  stock: c.stock,
});

const dbVehicle = (v: Vehicle) => ({
  id: v.id,
  plate: v.plate,
  model: v.model,
  vehicle_type: v.type,
  capacity: v.capacity,
  status: v.status,
  driver_id: v.driverId ?? null,
  odometer: v.odometer,
  last_service_odometer: v.lastServiceOdometer,
  service_interval_km: v.serviceIntervalKm,
  last_service_date: v.lastServiceDate || null,
  service_note: v.serviceNote ?? null,
});

const dbDriver = (d: Driver) => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  sim: d.sim,
  rating: d.rating,
  status: d.status,
});

const dbSJ = (s: SJ) => ({
  id: s.id,
  no: s.no,
  sj_date: s.date,
  customer_id: s.customerId,
  commodity_id: s.commodityId,
  volume: s.volume,
  trips: s.trips,
  vehicle_id: s.vehicleId,
  driver_id: s.driverId,
  price: s.price,
  status: s.status,
  invoice_id: s.invoiceId,
  site: s.site,
  catatan: s.note ?? null,
});

const dbInvoice = (inv: Invoice) => ({
  id: inv.id,
  no: inv.no,
  customer_id: inv.customerId,
  inv_date: inv.date,
  due_date: inv.dueDate,
  dpp: inv.dpp,
  ppn: inv.ppn,
  total: inv.total,
  ppn_rate: inv.ppnRate ?? 0.11,
  status: inv.status,
  jenis: inv.kind ?? "Reguler",
  catatan: inv.note ?? null,
});

const dbInvoiceRevision = (rev: InvoiceRevision, invoiceId: string) => ({
  id: rev.id,
  invoice_id: invoiceId,
  rev_date: rev.date,
  by_user: rev.by,
  rev_type: rev.type,
  detail: rev.detail,
});

const dbPayment = (p: Payment) => ({
  id: p.id,
  invoice_id: p.invoiceId,
  pay_date: p.date,
  amount: p.amount,
  method: p.method,
  account_id: p.accountId,
  ref: p.ref,
});

const dbOpeningBalance = (accountId: string, ym: string, amount: number, type: OpeningSource, note: string, by: string, at: string, refMonth?: string) => ({
  account_id: accountId,
  ym,
  amount,
  opening_type: type,
  note,
  by_user: by,
  at_date: at,
  ref_month: refMonth ?? null,
});

const dbOpeningLog = (ym: string, accountId: string, amount: number, by: string, at: string, note: string, type: OpeningSource | "koreksi") => ({
  ym,
  account_id: accountId,
  amount,
  by_user: by,
  at_date: at,
  note,
  log_type: type,
});

const dbUser = (u: UserAccount) => ({
  id: u.id,
  employee_id: u.employeeId,
  username: u.username,
  email: u.email,
  role: u.role,
  user_status: u.status,
  scope: u.scope,
  user_created_at: u.createdAt,
  last_login: u.lastLogin === "-" ? null : u.lastLogin,
  note: u.note ?? null,
  permissions: u.permissions,
});

const dbEmployee = (e: Employee) => ({
  id: e.id,
  code: e.code,
  name: e.name,
  emp_role: e.role,
  division: e.division,
  join_date: e.joinDate || null,
  basic: e.basic,
  allowance: e.allowance,
  bank: e.bank,
  emp_status: e.status,
  hadir: e.hadir,
  izin: e.izin,
  alpha: e.alpha,
});

const dbLead = (l: Lead) => ({
  id: l.id,
  company: l.company,
  contact: l.contact,
  phone: l.phone,
  value: l.value,
  stage: l.stage,
  probability: l.probability,
  owner: l.owner,
  source: l.source,
  need: l.need,
  next_action: l.nextAction,
  next_date: l.nextDate || null,
});

const dbLeadActivity = (a: { id: string; date: string; type: string; note: string; by: string }) => ({
  id: a.id,
  lead_id: "", // filled on insert
  act_date: a.date,
  act_type: a.type,
  note: a.note,
  by_user: a.by,
});

const dbFuelLog = (p: { id: string; liter: number; pricePerLiter: number; accountId: string; supplierId: string | null; date: string; note: string }) => ({
  id: p.id,
  fuel_date: p.date,
  account_id: p.accountId,
  supplier_id: p.supplierId,
  liter: p.liter,
  price_per_liter: p.pricePerLiter,
  note: p.note,
});

const dbPayrollRun = (r: PayrollRun) => ({
  id: r.id,
  period: r.period,
  run_date: r.date,
  gross: r.gross,
  potongan: r.potongan,
  net: r.net,
  headcount: r.headcount,
  run_status: r.status,
});

/* ---------- Context ---------- */

const AppCtx = createContext<Ctx | null>(null);

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export interface Ctx extends State {
  route: Route;
  go: (r: Route) => void;
  period: { from: string; to: string };
  setPeriod: (p: { from: string; to: string }) => void;
  toasts: Toast[];
  toast: (title: string, detail?: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  login: (emailOrUsername: string, password?: string) => boolean;
  logout: () => void;
  currentAccount: UserAccount | null;
  can: (route: Route, action: PermAction) => boolean;
  saveUser: (user: UserAccount) => Promise<void>;
  removeUser: (id: ID) => Promise<void>;
  setUserStatus: (id: ID, status: UserAccount["status"]) => Promise<void>;
  resetUserPassword: (id: ID) => void;
  changeMyPassword: (oldPass: string, newPass: string) => Promise<boolean>;
  setMyPassword: (newPass: string) => Promise<boolean>;
  requestUserForm: (employeeId: string | null) => void;

  accountBalance: (id: ID) => number;
  accountsWithBalance: (Account & { balance: number; opening: number; openingSource: OpeningSource; openingFrom?: string; masuk: number; keluar: number; txCount: number })[];
  openingOf: (accountId: ID, ym: string) => { amount: number; source: OpeningSource; fromMonth?: string; explicit: boolean };
  closingOf: (accountId: ID, ym: string) => number;
  monthlyMutations: (accountId: ID, ym: string) => { masuk: number; keluar: number; count: number };
  monthSummary: (ym: string) => { account: Account; opening: number; source: OpeningSource; fromMonth?: string; explicit: boolean; masuk: number; keluar: number; closing: number; count: number }[];
  setOpeningBalance: (ym: string, entries: { accountId: ID; amount: number; note?: string }[], opts?: { firstTime?: boolean; globalNote?: string }) => Promise<void>;
  rollForwardMonth: (ym: string) => Promise<void>;
  clearOpening: (accountId: ID, ym: string) => Promise<void>;
  paidOf: (invoiceId: ID) => number;
  outstandingOf: (invoice: Invoice) => number;
  computedStatus: (invoice: Invoice) => Invoice["status"];
  kpi: {
    sjCount: number;
    sjInvoiced: number;
    sjPending: number;
    invoiceTotal: number;
    invoiceCount: number;
    volume: number;
  };
  aging: { label: string; key: string; amount: number; count: number; tone: string }[];
  outstandingTotal: number;
  supplierDebtTotal: number;
  legacyTotal: number;
  legacyOutstandingTotal: number;
  fuelStock: { liter: number; capacity: number; value: number; consumption: number };
  maintenancePlan: { v: Vehicle; nextKm: number; remainingKm: number; overdue: boolean; dueSoon: boolean }[];
  ritaseToday: { trips: number; volume: number; byCommodity: { name: string; trips: number; volume: number; units: number }[]; vehiclesActive: number };
  cashFlowDaily: { date: string; in: number; out: number; net: number }[];
  notifications: { id: string; tone: "warn" | "error" | "info"; title: string; detail: string; route: Route }[];

  addSJ: (payload: Partial<SJ>) => Promise<SJ>;
  updateSJ: (id: ID, patch: Partial<SJ>) => Promise<void>;
  deleteSJ: (id: ID) => Promise<void>;
  createInvoice: (sjIds: ID[], opts?: { note?: string; term?: number; billTo?: ID; kind?: Invoice["kind"]; ppnRate?: number; saveRateAsDefault?: boolean }) => Promise<Invoice | null>;
  reviseInvoice: (invoiceId: ID, p: { addSjIds?: ID[]; removeSjIds?: ID[]; note?: string; ppnRate?: number }) => Promise<Invoice | null>;
  carryForward: (invoiceId: ID, sjIds: ID[], opts?: { date?: string; term?: number; note?: string; ppnRate?: number }) => Promise<Invoice | null>;
  setTaxRate: (ppnRate: number) => void;
  setBulkTaxRate: (ppnRate: number | null) => void;
  taxRateLabel: (rate?: number) => string;
  canRevise: (invoice: Invoice) => { ok: boolean; reason?: string };
  invoiceCoverage: (invoiceId: ID) => { sj: SJ; value: number; covered: number; remaining: number }[];
  recordPayment: (p: { invoiceId: ID; amount: number; accountId: ID; method: Payment["method"]; date?: string; ref?: string }) => Promise<void>;
  addBankTx: (tx: Omit<BankTx, "id">) => Promise<void>;
  transfer: (from: ID, to: ID, amount: number, note: string, date?: string) => Promise<void>;
  paySupplier: (id: ID, amount: number, accountId: ID) => Promise<void>;
  payLegacy: (id: ID, accountId: ID, count?: number) => Promise<void>;
  addFuelPurchase: (p: { liter: number; pricePerLiter: number; accountId: ID; supplierId: ID | null; date: string; note: string }) => Promise<void>;
  setMaintenanceParams: (p: { defaultIntervalKm: number; warnKm: number }, applyToAll?: boolean) => void;
  updateOdometer: (vehicleId: ID, odometer: number, note?: string) => void;
  recordService: (vehicleId: ID, p: { date: string; odometerAtService: number; intervalKm: number; cost: number; accountId: ID; note: string; nextStatus?: Vehicle["status"] }) => Promise<void>;
  runPayroll: (periodLabel: string, accountId: ID) => Promise<void>;
  addLead: (lead: Lead) => Promise<void>;
  setLeadStage: (id: ID, stage: LeadStage) => Promise<void>;
  addLeadActivity: (id: ID, a: { date: string; type: Lead["activities"][number]["type"]; note: string; by: string }) => Promise<void>;
  saveMaster: <K extends "customers" | "suppliers" | "commodities" | "vehicles" | "drivers" | "employees">(
    collection: K,
    item: State[K][number],
  ) => Promise<void>;
  removeMaster: (collection: "customers" | "suppliers" | "commodities" | "vehicles" | "drivers" | "employees", id: ID) => Promise<void>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [route, setRoute] = useState<Route>("dashboard");
  const [period, setPeriod] = useState({ from: "2026-10-01", to: "2026-10-15" });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((title: string, detail?: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, title, detail, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const go = useCallback((r: Route) => {
    setRoute(r);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------- Load data from Supabase ---------- */

  const loadAll = useCallback(async () => {
    try {
      const [accounts, bankTx, customers, suppliers, commodities, vehicles, drivers, sj, invoices, invoiceRevs, payments, invoiceSJ, legacyDebts, openingBalances, openingLog, users, employees, payrollRuns, leads, fuelLogs] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("bank_tx").select("*").order("tx_date", { ascending: false }),
        supabase.from("customers").select("*"),
        supabase.from("suppliers").select("*"),
        supabase.from("commodities").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("drivers").select("*"),
        supabase.from("surat_jalan").select("*").order("sj_date", { ascending: false }),
        supabase.from("invoices").select("*").order("inv_date", { ascending: false }),
        supabase.from("invoice_revisions").select("*"),
        supabase.from("payments").select("*").order("pay_date", { ascending: false }),
        supabase.from("invoice_sj").select("*"),
        supabase.from("legacy_debts").select("*"),
        supabase.from("opening_balances").select("*"),
        supabase.from("opening_log").select("*").order("at_date", { ascending: false }),
        supabase.from("users").select("*"),
        supabase.from("employees").select("*"),
        supabase.from("payroll_runs").select("*"),
        supabase.from("leads").select("*"),
        supabase.from("fuel_logs").select("*").order("fuel_date", { ascending: false }),
      ]);

      const invoiceRows = invoices.data ?? [];
      const revByInv = new Map<string, DbInvoiceRevision[]>();
      for (const r of invoiceRevs.data ?? []) {
        const arr = revByInv.get(r.invoice_id) ?? [];
        arr.push(r);
        revByInv.set(r.invoice_id, arr);
      }
      const builtInvoices = invoiceRows.map((r) => toInvoice(r, (invoiceSJ.data ?? []).filter((x) => x.invoice_id === r.id).map((x) => x.sj_id), revByInv.get(r.id) ?? []));
      const noToId = new Map(builtInvoices.map((i) => [i.no, i.id]));
      for (const inv of builtInvoices) {
        const cfRev = inv.revisions?.find((r) => r.type === "Carry Forward");
        if (cfRev && cfRev.detail.startsWith("Diteruskan dari ")) {
          const originNo = cfRev.detail.split(" • ")[0].replace("Diteruskan dari ", "").trim();
          const originId = noToId.get(originNo);
          if (originId) inv.carryFromInvoiceId = originId;
        }
      }
      setState((s) => ({
        ...s,
        accounts: (accounts.data ?? []).map(toAccount).sort((a, b) => {
          const order: Record<string, number> = { "A-002": 1, "A-001": 2, "A-003": 3 };
          return (order[a.id] ?? 99) - (order[b.id] ?? 99);
        }),
        bankTx: (bankTx.data ?? []).map(toBankTx),
        customers: (customers.data ?? []).map(toCustomer),
        suppliers: (suppliers.data ?? []).map(toSupplier),
        commodities: (commodities.data ?? []).map(toCommodity),
        vehicles: (vehicles.data ?? []).map(toVehicle),
        drivers: (drivers.data ?? []).map(toDriver),
        sj: (sj.data ?? []).map(toSJ),
        invoices: builtInvoices,
        invoiceRevisions: (invoiceRevs.data ?? []).map(toInvoiceRevision),
        payments: (payments.data ?? []).map(toPayment),
        invoiceSJ: (invoiceSJ.data ?? []).map((x) => ({ invoiceId: x.invoice_id, sjId: x.sj_id })),
        legacyDebts: (legacyDebts.data ?? []).map(toLegacyDebt),
        openingBalances: (openingBalances.data ?? []).reduce<Record<string, OpeningBalanceEntry>>((acc, r) => {
          acc[`${r.account_id}|${r.ym}`] = toOpeningBalanceEntry(r);
          return acc;
        }, {}),
        openingLog: (openingLog.data ?? []).map(toOpeningLogEntry),
        users: (users.data ?? []).map(toUserAccount),
        employees: (employees.data ?? []).map(toEmployee),
        payrollRuns: (payrollRuns.data ?? []).map(toPayrollRun),
        leads: (leads.data ?? []).map(toLead),
        fuelLogs: (fuelLogs.data ?? []).map(toFuelLog),
        loaded: true,
      }));
    } catch (err) {
      console.error("Gagal memuat data dari Supabase:", err);
      toast("Gagal memuat data", "Periksa koneksi dan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY di .env", "error");
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ---------- derivations ---------- */

  const derived = useMemo(() => {
    const paidOf = (invoiceId: ID) => state.payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
    const outstandingOf = (inv: Invoice) => Math.max(0, inv.total - paidOf(inv.id));
    const computedStatus = (inv: Invoice): Invoice["status"] => {
      const paid = paidOf(inv.id);
      if (paid >= inv.total - 1) return "Lunas";
      const due = new Date(inv.dueDate);
      const late = daysBetween(due, TODAY());
      if (paid > 0) return late > 0 ? "Terlambat" : "Sebagian";
      if (late > 0) return late > 30 ? "Terlambat" : "Jatuh Tempo";
      return "Belum Jatuh Tempo";
    };

    const SYSTEM_YM = "2026-10";
    const monthlyMutations = (accountId: ID, ym: string) => {
      const tx = state.bankTx.filter((t) => t.accountId === accountId && t.date.startsWith(ym));
      return {
        masuk: tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0),
        keluar: tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0),
        count: tx.length,
      };
    };
    const monthlyNet = (accountId: ID, ym: string) => {
      const m = monthlyMutations(accountId, ym);
      return m.masuk - m.keluar;
    };
    const explicitOpening = (accountId: ID, ym: string) => state.openingBalances[`${accountId}|${ym}`];
    const systemOpening = (accountId: ID) => state.accounts.find((a) => a.id === accountId)?.opening ?? 0;

    const openingOf = (accountId: ID, ym: string) => {
      const direct = explicitOpening(accountId, ym);
      if (direct) {
        return { amount: direct.amount, source: direct.type, fromMonth: direct.refMonth, explicit: true };
      }
      const anchorKeys = Object.keys(state.openingBalances)
        .filter((k) => k.startsWith(`${accountId}|`))
        .map((k) => k.split("|")[1])
        .sort();
      let anchorYm = anchorKeys.find((k) => k <= ym) ?? SYSTEM_YM;
      let amount = explicitOpening(accountId, anchorYm)?.amount ?? systemOpening(accountId);
      let fromMonth = anchorYm;
      let cursor = anchorYm;
      let guard = 0;
      while (cursor < ym && guard++ < 120) {
        const following = nextYm(cursor);
        const explicitNext = explicitOpening(accountId, following);
        if (explicitNext) {
          amount = explicitNext.amount;
          fromMonth = following;
        } else {
          amount += monthlyNet(accountId, cursor);
          fromMonth = cursor;
        }
        cursor = following;
      }
      return {
        amount,
        source: cursor === anchorYm ? ("sistem" as OpeningSource) : ("rollforward" as OpeningSource),
        fromMonth,
        explicit: false,
      };
    };
    const closingOf = (accountId: ID, ym: string) => openingOf(accountId, ym).amount + monthlyNet(accountId, ym);
    const monthSummary = (ym: string) =>
      state.accounts.map((a) => {
        const o = openingOf(a.id, ym);
        const m = monthlyMutations(a.id, ym);
        return { account: a, opening: o.amount, source: o.source, fromMonth: o.fromMonth, explicit: o.explicit, ...m, closing: o.amount + m.masuk - m.keluar };
      });

    const periodYm = monthKey(period.from);
    const accountList = state.accounts.map((a) => {
      const o = openingOf(a.id, periodYm);
      const tx = state.bankTx.filter((t) => t.accountId === a.id && t.date >= period.from && t.date <= period.to);
      const masuk = tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
      const keluar = tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
      return { ...a, opening: o.amount, openingSource: o.source, openingFrom: o.fromMonth, masuk, keluar, txCount: tx.length, balance: o.amount + masuk - keluar };
    });
    const accountBalance = (id: ID) => {
      const todayYm = monthKey(iso(TODAY()));
      const o = openingOf(id, todayYm);
      const tx = state.bankTx.filter((t) => t.accountId === id && t.date >= `${todayYm}-01` && t.date <= iso(TODAY()));
      return o.amount + tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0) - tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    };

    const inPeriod = (date: string) => date >= period.from && date <= period.to;
    const periodSJ = state.sj.filter((r) => inPeriod(r.date) && r.status !== "Batal");
    const sjInvoiced = periodSJ.filter((r) => r.invoiceId).length;
    const sjPending = periodSJ.length - sjInvoiced;
    const periodInvoices = state.invoices.filter((i) => inPeriod(i.date));
    const invoiceTotal = periodInvoices.reduce((s, i) => s + i.total, 0);
    const volume = periodSJ.reduce((s, r) => s + r.volume * r.trips, 0);

    const outstandingList = state.invoices
      .map((inv) => ({ inv, due: outstandingOf(inv) }))
      .filter((x) => x.due > 0);
    const buckets = [
      { key: "notdue", label: "Belum Jatuh Tempo (< 0 Hari)", tone: "bg-primary", test: (n: number) => n <= 0 },
      { key: "b1", label: "Jatuh Tempo 1 - 30 Hari", tone: "bg-primary-container", test: (n: number) => n > 0 && n <= 30 },
      { key: "b2", label: "Jatuh Tempo 31 - 60 Hari", tone: "bg-secondary-container", test: (n: number) => n > 30 && n <= 60 },
      { key: "b3", label: "Kritis > 60 Hari", tone: "bg-error", test: (n: number) => n > 60 },
    ];
    const aging = buckets.map((b) => {
      const rows = outstandingList.filter(({ inv }) => b.test(daysBetween(new Date(inv.dueDate), TODAY())));
      return { label: b.label, key: b.key, tone: b.tone, amount: rows.reduce((s, r) => s + r.due, 0), count: rows.length };
    });
    const outstandingTotal = outstandingList.reduce((s, r) => s + r.due, 0);
    const supplierDebtTotal = state.suppliers.reduce((s, x) => s + x.hutang, 0);
    const legacySum = state.legacyDebts.reduce((s, x) => s + x.pokok, 0);
    const legacyOutSum = state.legacyDebts.reduce((s, x) => s + legacyOutstanding(x), 0);

    const todaySJ = state.sj.filter((r) => r.date === iso(TODAY()) && r.status !== "Batal");
    const commodityRows = state.commodities
      .map((c) => {
        const rows = todaySJ.filter((r) => r.commodityId === c.id);
        return {
          name: c.name,
          trips: rows.reduce((s, r) => s + r.trips, 0),
          volume: rows.reduce((s, r) => s + r.volume * r.trips, 0),
          units: new Set(rows.map((r) => r.vehicleId)).size,
        };
      })
      .filter((c) => c.trips > 0);

    const consumption = state.sj.filter((r) => inPeriod(r.date) && r.status !== "Batal").reduce((s, r) => s + r.trips * FUEL_STATE.literPerRit, 0);

    const dayMap = new Map<string, { in: number; out: number }>();
    state.bankTx.forEach((tx) => {
      const row = dayMap.get(tx.date) ?? { in: 0, out: 0 };
      row[tx.direction === "in" ? "in" : "out"] += tx.amount;
      dayMap.set(tx.date, row);
    });
    const cashFlowDaily = [...dayMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date, in: v.in, out: v.out, net: v.in - v.out }));

    const notifications: Ctx["notifications"] = [];
    const overdue = outstandingList.filter(({ inv }) => daysBetween(new Date(inv.dueDate), TODAY()) > 0);
    if (overdue.length)
      notifications.push({
        id: "n-od",
        tone: "error",
        title: `${overdue.length} invoice melewati jatuh tempo`,
        detail: `Total ${overdue.reduce((s, r) => s + r.due, 0).toLocaleString("id-ID")} rupiah perlu penagihan prioritas`,
        route: "invoice",
      });
    if (sjPending)
      notifications.push({
        id: "n-pending",
        tone: "warn",
        title: `${sjPending} surat jalan belum diterbitkan invoice`,
        detail: `Periode ${period.from} s/d ${period.to} siap ditagihkan`,
        route: "surat-jalan",
      });
    if (state.fuelLiter < 5_000)
      notifications.push({ id: "n-fuel", tone: "error", title: "Stok solar site kritis", detail: `${state.fuelLiter.toLocaleString("id-ID")} liter tersisa`, route: "bbm" });
    const supplierSoon = state.suppliers.filter((s) => s.hutang > 0).slice(0, 1);
    supplierSoon.forEach((s) =>
      notifications.push({
        id: `n-sup-${s.id}`,
        tone: "info",
        title: `Jatuh tempo hutang ${s.name}`,
        detail: `Sisa ${s.hutang.toLocaleString("id-ID")} • termin ${s.dueDays} hari`,
        route: "kas-bank",
      }),
    );
    state.vehicles
      .filter((v) => v.status === "Servis")
      .forEach((v) =>
        notifications.push({ id: `n-sv-${v.id}`, tone: "warn", title: `${v.plate} masuk bengkel`, detail: `${v.model} — pengerjaan pemeliharaan berjalan`, route: "bbm" }),
      );
    state.vehicles
      .map((v) => ({ v, rem: remainingServiceKm(v) }))
      .filter((x) => x.v.status !== "Servis")
      .sort((a, b) => a.rem - b.rem)
      .slice(0, 3)
      .forEach(({ v, rem }) => {
        if (rem <= 0) {
          notifications.push({
            id: `n-mt-late-${v.id}`,
            tone: "error",
            title: `Terlambat servis: ${v.plate}`,
            detail: `Sudah lewat ${Math.abs(rem).toLocaleString("id-ID")} km dari target ${nextServiceKm(v).toLocaleString("id-ID")} km`,
            route: "bbm",
          });
        } else if (rem <= state.maintenance.warnKm) {
          notifications.push({
            id: `n-mt-soon-${v.id}`,
            tone: "warn",
            title: `Servis berkala mendekat: ${v.plate}`,
            detail: `Sisa ${rem.toLocaleString("id-ID")} km menuju ${nextServiceKm(v).toLocaleString("id-ID")} km`,
            route: "bbm",
          });
        }
      });

    return {
      paidOf,
      outstandingOf,
      computedStatus,
      accountBalance,
      accountsWithBalance: accountList,
      openingOf,
      closingOf,
      monthlyMutations,
      monthSummary,
      kpi: { sjCount: periodSJ.length, sjInvoiced, sjPending, invoiceTotal, invoiceCount: periodInvoices.length, volume },
      aging,
      outstandingTotal,
      supplierDebtTotal,
      legacyTotal: legacySum,
      legacyOutstandingTotal: legacyOutSum,
      maintenancePlan: state.vehicles
        .map((v) => {
          const nextKm = nextServiceKm(v);
          const remainingKm = remainingServiceKm(v);
          return { v, nextKm, remainingKm, overdue: remainingKm <= 0, dueSoon: remainingKm > 0 && remainingKm <= state.maintenance.warnKm };
        })
        .sort((a, b) => a.remainingKm - b.remainingKm),
      fuelStock: { liter: state.fuelLiter, capacity: FUEL_STATE.capacity, value: state.fuelLiter * FUEL_STATE.pricePerLiter, consumption },
      ritaseToday: {
        trips: todaySJ.reduce((s, r) => s + r.trips, 0),
        volume: todaySJ.reduce((s, r) => s + r.volume * r.trips, 0),
        byCommodity: commodityRows,
        vehiclesActive: new Set(todaySJ.map((r) => r.vehicleId)).size,
      },
      cashFlowDaily,
      notifications,
    } satisfies Partial<Ctx>;
  }, [period, state]);

  /* ---------- actions ---------- */

  const addSJ: Ctx["addSJ"] = async (payload) => {
    const nextNo = payload.no?.trim() || `SJ/LBS/2026/10/${String(state.sj.filter((r) => r.date.startsWith("2026-10")).length + 1).padStart(4, "0")}`;
    const row: SJ = {
      id: uid("SJ"),
      no: nextNo,
      date: payload.date ?? iso(TODAY()),
      customerId: payload.customerId ?? state.customers[0]?.id ?? "",
      commodityId: payload.commodityId ?? state.commodities[0]?.id ?? "",
      volume: payload.volume ?? 28,
      trips: payload.trips ?? 1,
      vehicleId: payload.vehicleId ?? state.vehicles[0]?.id ?? "",
      driverId: payload.driverId ?? state.drivers[0]?.id ?? "",
      price: payload.price ?? state.commodities[0]?.price ?? 0,
      status: payload.status ?? "Terkirim",
      invoiceId: null,
      site: payload.site ?? "SITE GOLO MORI",
      note: payload.note ?? "",
    };
    await supabase.from("surat_jalan").insert([dbSJ(row)]);
    setState((s) => ({ ...s, sj: [row, ...s.sj] }));
    toast("Surat jalan diterbitkan", `${row.no} • ${row.volume} m³`, "success");
    return row;
  };

  const updateSJ: Ctx["updateSJ"] = async (id, patch) => {
    const current = state.sj.find((r) => r.id === id);
    if (current?.invoiceId) {
      toast("Gagal mengubah", "Surat jalan sudah diinvoice dan tidak dapat diubah.", "error");
      return;
    }
    await supabase.from("surat_jalan").update({ ...dbSJ({ ...current!, ...patch }), id }).eq("id", id);
    setState((s) => ({ ...s, sj: s.sj.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };

  const deleteSJ: Ctx["deleteSJ"] = async (id) => {
    await supabase.from("surat_jalan").delete().eq("id", id);
    setState((s) => ({ ...s, sj: s.sj.filter((r) => r.id !== id) }));
    toast("Surat jalan dihapus", undefined, "info");
  };

  const sjValue = (r: SJ) => r.volume * r.trips * r.price;
  const calcTotals = (rows: SJ[], rate = state.tax.ppnRate) => {
    const dpp = rows.reduce((s, r) => s + sjValue(r), 0);
    const safeRate = Math.max(0, Math.min(1, rate));
    const ppn = Math.round(dpp * safeRate);
    return { dpp, ppn, total: dpp + ppn, rate: safeRate };
  };
  const taxRateLabel = (rate?: number) => {
    const pctValue = (rate ?? state.tax.ppnRate) * 100;
    return `PPN ${pctValue % 1 === 0 ? pctValue.toFixed(0) : pctValue.toFixed(2).replace(/0$/, "")}%`;
  };
  const nextInvoiceNo = (dateIso: string) => {
    const ym = dateIso.slice(0, 7);
    return `INV/LBS/${dateIso.slice(0, 4)}/${dateIso.slice(5, 7)}/${String(state.invoices.filter((i) => i.date.startsWith(ym)).length + 1).padStart(4, "0")}`;
  };
  const actor = () => state.user?.name ?? "Sistem LBS";

  const createInvoice: Ctx["createInvoice"] = async (sjIds, opts) => {
    const rows = state.sj.filter((r) => sjIds.includes(r.id) && !r.invoiceId && r.status !== "Batal");
    if (!rows.length) {
      toast("Tidak ada surat jalan terpilih", "Pilih minimal satu surat jalan yang belum diinvoice", "warn");
      return null;
    }
    const distinct = [...new Set(rows.map((r) => r.customerId))];
    const valueByCustomer = distinct.map((id) => ({ id, value: rows.filter((r) => r.customerId === id).reduce((s, r) => s + sjValue(r), 0) }));
    const billToId = opts?.billTo ?? valueByCustomer.sort((a, b) => b.value - a.value)[0].id;
    const billTo = state.customers.find((c) => c.id === billToId) ?? state.customers[0];
    const date = iso(TODAY());
    const term = opts?.term ?? billTo.term;
    const rate = Math.max(0, Math.min(1, opts?.ppnRate ?? state.tax.ppnRate));
    const { dpp, ppn, total } = calcTotals(rows, rate);
    const kind: Invoice["kind"] = distinct.length > 1 ? "Gabungan" : "Reguler";
    const invoice: Invoice = {
      id: uid("INV"),
      no: nextInvoiceNo(date),
      customerId: billTo.id,
      date,
      dueDate: iso(addDays(TODAY(), term)),
      dpp,
      ppn,
      total,
      ppnRate: rate,
      status: "Belum Jatuh Tempo",
      sjIds: rows.map((r) => r.id),
      note: opts?.note ?? `Tagihan ${rows.length} surat jalan`,
      kind,
      coveredCustomerIds: distinct,
      revisions: [
        {
          id: uid("RV"),
          date,
          by: actor(),
          type: "Terbit",
          detail: `Invoice ${kind.toLowerCase()} diterbitkan • ${rows.length} surat jalan • ${distinct.length} pelanggan asal muatan • total ${rupiah(total)}`,
        },
      ],
    };
    await supabase.from("invoices").insert([dbInvoice(invoice)]);
    await supabase.from("invoice_revisions").insert([dbInvoiceRevision(invoice.revisions![0], invoice.id)]);
    await supabase.from("invoice_sj").insert([...rows.map((r) => ({ invoice_id: invoice.id, sj_id: r.id }))]);
    await supabase.from("surat_jalan").update({ invoice_id: invoice.id, status: "Diinvoice" }).in("id", rows.map((r) => r.id));
    setState((s) => ({
      ...s,
      invoices: [invoice, ...s.invoices],
      tax: opts?.saveRateAsDefault ? { ppnRate: rate } : s.tax,
      sj: s.sj.map((r) => (rows.some((x) => x.id === r.id) ? { ...r, invoiceId: invoice.id, status: "Diinvoice" } : r)),
    }));
    toast(
      "Invoice diterbitkan",
      `${invoice.no} • ${rows.length} surat jalan • DPP ${rupiah(dpp)} + ${taxRateLabel(rate)} ${rupiah(ppn)} = ${rupiah(total)}${kind === "Gabungan" ? ` • gabungan ${distinct.length} pelanggan` : ""}${opts?.saveRateAsDefault ? " • tarif pajak disimpan sebagai default" : ""}`,
      "success",
    );
    return invoice;
  };

  const canRevise: Ctx["canRevise"] = (invoice) => {
    const paid = derived.paidOf(invoice.id);
    if ((invoice.status as string) === "Batal") return { ok: false, reason: "Invoice sudah dibatalkan." };
    if (paid >= invoice.total - 1) return { ok: false, reason: "Invoice sudah lunas — revisi tidak diizinkan." };
    if (paid > 0) return { ok: false, reason: `Invoice sudah menerima pembayaran ${rupiah(paid)}. Gunakan Carry Forward untuk sisa tagihan.` };
    return { ok: true };
  };

  const reviseInvoice: Ctx["reviseInvoice"] = async (invoiceId, p) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return null;
    const check = canRevise(inv);
    if (!check.ok) {
      toast("Revisi invoice ditolak", check.reason, "error");
      return null;
    }
    const removeIds = (p.removeSjIds ?? []).filter((id) => inv.sjIds.includes(id));
    const addIds = p.addSjIds ?? [];
    const kePt = state.sj.filter((r) => inv.sjIds.includes(r.id) && !removeIds.includes(r.id));
    const addRows = state.sj.filter((r) => addIds.includes(r.id) && !r.invoiceId && r.status !== "Batal");
    if (!kePt.length) {
      toast("Revisi ditolak", "Invoice harus menyisakan minimal satu surat jalan. Gunakan Carry Forward bila ingin memindahkan seluruh tagihan.", "error");
      return null;
    }
    if (!removeIds.length && !addRows.length) {
      toast("Tidak ada perubahan", "Tandai surat jalan yang dikeluarkan atau ditambahkan terlebih dahulu", "warn");
      return null;
    }
    const finalRows = [...kePt, ...addRows];
    const rate = Math.max(0, Math.min(1, p.ppnRate ?? inv.ppnRate ?? state.tax.ppnRate));
    const { dpp, ppn, total } = calcTotals(finalRows, rate);
    const covered = [...new Set(finalRows.map((r) => r.customerId))];
    const revision: InvoiceRevision = {
      id: uid("RV"),
      date: iso(TODAY()),
      by: actor(),
      type: "Revisi",
      detail: `${removeIds.length ? `-${removeIds.length} surat jalan` : ""}${removeIds.length && addRows.length ? " • " : ""}${addRows.length ? `+${addRows.length} surat jalan` : ""} • ${taxRateLabel(rate)} • total ${rupiah(inv.total)} → ${rupiah(total)}`,
    };
    const updated: Invoice = {
      ...inv,
      dpp,
      ppn,
      total,
      ppnRate: rate,
      sjIds: finalRows.map((r) => r.id),
      coveredCustomerIds: covered,
      kind: covered.length > 1 ? "Gabungan" : "Reguler",
      note: p.note ?? inv.note,
      status: (derived.paidOf(inv.id) >= total - 1 ? "Lunas" : "Sebagian") as Invoice["status"],
      revisions: [...(inv.revisions ?? []), revision],
    };
    await supabase.from("invoices").update(dbInvoice(updated)).eq("id", invoiceId);
    await supabase.from("invoice_revisions").insert([dbInvoiceRevision(revision, invoiceId)]);
    await supabase.from("invoice_sj").delete().eq("invoice_id", invoiceId);
    await supabase.from("invoice_sj").insert([...finalRows.map((r) => ({ invoice_id: invoiceId, sj_id: r.id }))]);
    await supabase.from("surat_jalan").update({ invoice_id: null, status: "Terkirim" }).in("id", removeIds);
    await supabase.from("surat_jalan").update({ invoice_id: invoiceId, status: "Diinvoice" }).in("id", addRows.map((r) => r.id));
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => (i.id === invoiceId ? updated : i)),
      sj: s.sj.map((r) =>
        removeIds.includes(r.id)
          ? { ...r, invoiceId: null, status: "Terkirim" }
          : addRows.some((x) => x.id === r.id)
            ? { ...r, invoiceId: invoiceId, status: "Diinvoice" }
            : r,
      ),
    }));
    toast(
      "Revisi invoice disimpan",
      `${inv.no} • ${finalRows.length} surat jalan • total baru ${rupiah(total)}${addRows.length ? ` • ${addRows.length} SJ dapat ditagihkan/dicarikan kembali` : ""}`,
      "success",
    );
    return updated;
  };

  const carryForward: Ctx["carryForward"] = async (invoiceId, sjIds, opts) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return null;
    const paid = derived.paidOf(inv.id);
    const outstanding = Math.max(0, inv.total - paid);
    if (paid <= 0) {
      toast("Carry forward tidak berlaku", "Invoice belum menerima pembayaran sebagian. Gunakan Revisi Invoice untuk mengubah susunan surat jalan.", "warn");
      return null;
    }
    if (outstanding <= 0) {
      toast("Carry forward tidak berlaku", "Invoice sudah lunas — tidak ada sisa tagihan untuk diteruskan.", "warn");
      return null;
    }
    const all = state.sj.filter((r) => inv.sjIds.includes(r.id));
    const carried = all.filter((r) => sjIds.includes(r.id));
    const keptRows = all.filter((r) => !sjIds.includes(r.id));
    if (!carried.length) {
      toast("Belum ada surat jalan dipilih", "Pilih surat jalan yang belum tertutup pembayaran untuk diteruskan", "warn");
      return null;
    }
    if (!keptRows.length) {
      toast("Carry forward ditolak", "Invoice asal harus menyisakan minimal satu surat jalan sebagai dasar pembayaran yang sudah diterima.", "error");
      return null;
    }
    const carriedDpp = carried.reduce((s, r) => s + sjValue(r), 0);
    const rate = Math.max(0, Math.min(1, opts?.ppnRate ?? inv.ppnRate ?? state.tax.ppnRate));
    const origin = calcTotals(keptRows, rate);
    const billTo = state.customers.find((c) => c.id === inv.customerId) ?? state.customers[0];
    const date = opts?.date ?? iso(TODAY());
    const term = opts?.term ?? billTo.term;
    const carriedPpn = Math.round(carriedDpp * rate);
    const carriedTotal = carriedDpp + carriedPpn;
    if (carriedTotal > outstanding) {
      toast("Nilai carry forward melebihi sisa tagihan", `Maksimal total ${rupiah(outstanding)} agar pembayaran yang sudah diterima tetap tertutup`, "error");
      return null;
    }
    const covered = [...new Set(carried.map((r) => r.customerId))];
    const newInvoice: Invoice = {
      id: uid("INV"),
      no: nextInvoiceNo(date),
      customerId: inv.customerId,
      date,
      dueDate: iso(addDays(new Date(date), term)),
      dpp: carriedDpp,
      ppn: carriedPpn,
      total: carriedTotal,
      ppnRate: rate,
      status: "Belum Jatuh Tempo",
      sjIds: carried.map((r) => r.id),
      note: opts?.note ?? `Carry forward dari ${inv.no} — sisa surat jalan belum tertutup pembayaran`,
      kind: covered.length > 1 ? "Gabungan" : "Reguler",
      coveredCustomerIds: covered,
      carryFromInvoiceId: inv.id,
      revisions: [
        {
          id: uid("RV"),
          date,
          by: actor(),
          type: "Carry Forward",
          detail: `Diteruskan dari ${inv.no} • ${carried.length} surat jalan • ${taxRateLabel(rate)} • ${rupiah(carriedTotal)} • pembayaran terdahulu di invoice asal ${rupiah(paid)}`,
        },
      ],
    };
    const originRevision: InvoiceRevision = {
      id: uid("RV"),
      date,
      by: actor(),
      type: "Carry Forward",
      detail: `${carried.length} surat jalan (${rupiah(carriedTotal)}) diteruskan ke ${newInvoice.no} • total invoice disesuaikan menjadi ${rupiah(origin.total)}`,
    };
    await supabase.from("invoices").insert([dbInvoice(newInvoice)]);
    await supabase.from("invoice_revisions").insert([dbInvoiceRevision(newInvoice.revisions![0], newInvoice.id), dbInvoiceRevision(originRevision, invoiceId)]);
    await supabase.from("invoice_sj").delete().eq("invoice_id", invoiceId);
    await supabase.from("invoice_sj").insert([...carried.map((r) => ({ invoice_id: newInvoice.id, sj_id: r.id })), ...keptRows.map((r) => ({ invoice_id: invoiceId, sj_id: r.id }))]);
    await supabase.from("surat_jalan").update({ invoice_id: newInvoice.id, status: "Diinvoice" }).in("id", carried.map((r) => r.id));
    await supabase.from("invoices").update({ dpp: origin.dpp, ppn: origin.ppn, total: origin.total, ppnRate: rate, status: paid >= origin.total - 1 ? "Lunas" : "Sebagian" }).eq("id", invoiceId);
    setState((s) => ({
      ...s,
      invoices: [
        newInvoice,
        ...s.invoices.map((i): Invoice =>
          i.id === invoiceId
            ? {
                ...i,
                dpp: origin.dpp,
                ppn: origin.ppn,
                total: origin.total,
                ppnRate: rate,
                sjIds: keptRows.map((r) => r.id),
                coveredCustomerIds: [...new Set(keptRows.map((r) => r.customerId))],
                status: paid >= origin.total - 1 ? "Lunas" : "Sebagian",
                revisions: [...(i.revisions ?? []), originRevision],
              }
            : i,
        ),
      ],
      sj: s.sj.map((r) => (carried.some((x) => x.id === r.id) ? { ...r, invoiceId: newInvoice.id, status: "Diinvoice" } : r)),
    }));
    toast(
      "Carry forward dibuat",
      `${newInvoice.no} meneruskan ${carried.length} surat jalan senilai ${rupiah(carriedTotal)} • invoice asal ${inv.no} kini ${rupiah(origin.total)} (${paid >= origin.total - 1 ? "lunas" : "tetap sebagian"})`,
      "success",
    );
    return newInvoice;
  };

  const invoiceCoverage: Ctx["invoiceCoverage"] = (invoiceId) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return [];
    let budget = derived.paidOf(inv.id);
    return state.sj
      .filter((r) => inv.sjIds.includes(r.id))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.no < b.no ? -1 : 1))
      .map((r) => {
        const value = sjValue(r);
        const covered = Math.max(0, Math.min(value, budget));
        budget -= covered;
        return { sj: r, value, covered, remaining: value - covered };
      });
  };

  const recordPayment: Ctx["recordPayment"] = async ({ invoiceId, amount, accountId, method, date, ref }) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const payDate = date ?? iso(TODAY());
    const payload: Payment = {
      id: uid("PAY"),
      invoiceId,
      date: payDate,
      amount,
      method,
      accountId,
      ref: ref ?? `TRF/${inv.no}/PT`,
    };
    await supabase.from("payments").insert([dbPayment(payload)]);
    const accName = state.accounts.find((a) => a.id === accountId)?.name ?? accountId;
    setState((s) => ({
      ...s,
      payments: [...s.payments, payload],
      bankTx: [
        {
          id: uid("TX"),
          accountId,
          date: payDate,
          desc: `Penerimaan pembayaran ${inv.no}`,
          category: "Penerimaan Piutang",
          direction: "in",
          amount,
          ref: payload.ref,
        },
        ...s.bankTx,
      ],
      invoices: s.invoices.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              revisions: [
                ...(i.revisions ?? []),
                {
                  id: uid("RV"),
                  date: payDate,
                  by: s.user?.name ?? "Sistem LBS",
                  type: "Pembayaran" as const,
                  detail: `${method} ${rupiah(amount)} ke ${accName} • sisa tagihan ${rupiah(Math.max(0, i.total - derived.paidOf(i.id) - amount))}`,
                },
              ],
            }
          : i,
      ),
    }));
    toast("Pembayaran tercatat", `${inv.no} • ${rupiah(amount)} • sisa ${rupiah(Math.max(0, inv.total - derived.paidOf(inv.id) - amount))}`, "success");
  };

  const addBankTx: Ctx["addBankTx"] = async (tx) => {
    const fullTx: BankTx = { ...tx, id: uid("TX") };
    await supabase.from("bank_tx").insert([dbBankTx(fullTx)]);
    setState((s) => ({ ...s, bankTx: [fullTx, ...s.bankTx] }));
    toast("Mutasi kas/bank tersimpan", tx.desc, "success");
  };

  const transfer: Ctx["transfer"] = async (from, to, amount, note, date) => {
    const d = date ?? iso(TODAY());
    const txIn: BankTx = { id: uid("TX"), accountId: to, date: d, desc: `Transfer masuk dari ${from} — ${note}`, category: "Internal Transfer", direction: "in", amount };
    const txOut: BankTx = { id: uid("TX"), accountId: from, date: d, desc: `Transfer keluar ke ${to} — ${note}`, category: "Internal Transfer", direction: "out", amount };
    await supabase.from("bank_tx").insert([dbBankTx(txIn), dbBankTx(txOut)]);
    setState((s) => ({
      ...s,
      bankTx: [txIn, txOut, ...s.bankTx],
    }));
    toast("Transfer antar rekening selesai", `${amount.toLocaleString("id-ID")} dipindahkan`, "success");
  };

  const paySupplier: Ctx["paySupplier"] = async (id, amount, accountId) => {
    const sup = state.suppliers.find((s) => s.id === id);
    if (!sup) return;
    const pay = Math.min(amount, sup.hutang);
    await supabase.from("suppliers").update({ hutang: Math.max(0, sup.hutang - pay) }).eq("id", id);
    const tx: BankTx = { id: uid("TX"), accountId, date: iso(TODAY()), desc: `Pembayaran hutang ${sup.name}`, category: "Hutang Supplier", direction: "out", amount: pay, ref: sup.code };
    await supabase.from("bank_tx").insert([dbBankTx(tx)]);
    setState((s) => ({
      ...s,
      suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, hutang: Math.max(0, x.hutang - pay) } : x)),
      bankTx: [tx, ...s.bankTx],
    }));
    toast("Pembayaran supplier tercatat", `${sup.name} • ${pay.toLocaleString("id-ID")}`, "success");
  };

  const payLegacy: Ctx["payLegacy"] = async (id, accountId, count = 1) => {
    const dbt = state.legacyDebts.find((x) => x.id === id);
    if (!dbt) return;
    const amount = Math.min(dbt.cicilan * count, legacyOutstanding(dbt));
    if (amount <= 0) {
      toast("Kewajiban sudah lunas", dbt.tahap, "info");
      return;
    }
    await supabase.from("legacy_debts").update({ paid_count: Math.min(dbt.tenor, dbt.paidCount + count) }).eq("id", id);
    const tx: BankTx = { id: uid("TX"), accountId, date: iso(TODAY()), desc: `Angsuran ${dbt.tahap}`, category: "Kewajiban Historis", direction: "out", amount };
    await supabase.from("bank_tx").insert([dbBankTx(tx)]);
    setState((s) => ({
      ...s,
      legacyDebts: s.legacyDebts.map((x) => (x.id === id ? { ...x, paidCount: Math.min(x.tenor, x.paidCount + count) } : x)),
      bankTx: [tx, ...s.bankTx],
    }));
    toast("Angsuran kewajiban historis dibayar", `${dbt.tahap} • ${amount.toLocaleString("id-ID")}`, "success");
  };

  const addFuelPurchase: Ctx["addFuelPurchase"] = async (p) => {
    const id = uid("FL");
    const log: FuelLog = { id, ...p };
    await supabase.from("fuel_logs").insert([dbFuelLog({ id, liter: p.liter, pricePerLiter: p.pricePerLiter, accountId: p.accountId, supplierId: p.supplierId, date: p.date, note: p.note })]);
    const tx: BankTx = {
      id: uid("TX"),
      accountId: p.accountId,
      date: p.date,
      desc: `Pembelian solar industrial ${p.liter.toLocaleString("id-ID")} L @ ${p.pricePerLiter.toLocaleString("id-ID")}`,
      category: "BBM & Solar",
      direction: "out",
      amount: p.liter * p.pricePerLiter,
      ref: p.supplierId ?? undefined,
    };
    await supabase.from("bank_tx").insert([dbBankTx(tx)]);
    setState((s) => ({
      ...s,
      fuelLogs: [log, ...s.fuelLogs],
      fuelLiter: s.fuelLiter + p.liter,
      bankTx: [tx, ...s.bankTx],
    }));
    toast("Pembelian solar tersimpan", `${p.liter.toLocaleString("id-ID")} liter masuk tangki`, "success");
  };

  const setMaintenanceParams: Ctx["setMaintenanceParams"] = (params, applyToAll = false) => {
    setState((s) => ({
      ...s,
      maintenance: params,
      vehicles: applyToAll ? s.vehicles.map((v) => ({ ...v, serviceIntervalKm: params.defaultIntervalKm })) : s.vehicles,
    }));
    toast(
      "Parameter pemeliharaan disimpan",
      applyToAll
        ? `Interval ${params.defaultIntervalKm.toLocaleString("id-ID")} km diterapkan ke ${state.vehicles.length} unit • peringatan ${params.warnKm.toLocaleString("id-ID")} km`
        : `Interval default ${params.defaultIntervalKm.toLocaleString("id-ID")} km • peringatan ${params.warnKm.toLocaleString("id-ID")} km`,
      "success",
    );
  };

  const updateOdometer: Ctx["updateOdometer"] = (vehicleId, odometer, note) => {
    const veh = state.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, odometer, serviceNote: note ?? v.serviceNote } : v)),
    }));
    const rem = nextServiceKm({ ...veh, odometer }) - odometer;
    toast(
      "Odometer diperbarui",
      rem <= 0
        ? `${veh.plate} pada ${odometer.toLocaleString("id-ID")} km — sudah melewati target servis ${Math.abs(rem).toLocaleString("id-ID")} km`
        : `${veh.plate} pada ${odometer.toLocaleString("id-ID")} km • sisa ${rem.toLocaleString("id-ID")} km menuju servis berikutnya`,
      rem <= 0 ? "warn" : "success",
    );
  };

  const recordService: Ctx["recordService"] = async (vehicleId, p) => {
    const veh = state.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;
    const odo = Math.max(p.odometerAtService, 0);
    setState((s) => ({
      ...s,
      vehicles: s.vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              odometer: Math.max(v.odometer, odo),
              lastServiceOdometer: odo,
              serviceIntervalKm: p.intervalKm,
              lastServiceDate: p.date,
              status: p.nextStatus ?? "Aktif",
              serviceNote: p.note || `Servis berkala pada ${odo.toLocaleString("id-ID")} km`,
            }
          : v,
      ),
    }));
    if (p.cost > 0) {
      const tx: BankTx = {
        id: uid("TX"),
        accountId: p.accountId,
        date: p.date,
        desc: `Servis berkala ${veh.plate} (${veh.model}) pada ${odo.toLocaleString("id-ID")} km`,
        category: "Pemeliharaan",
        direction: "out",
        amount: p.cost,
        ref: veh.id,
      };
      await supabase.from("bank_tx").insert([dbBankTx(tx)]);
      setState((s) => ({ ...s, bankTx: [tx, ...s.bankTx] }));
    }
    toast(
      "Servis tercatat",
      `${veh.plate} • odometer ${odo.toLocaleString("id-ID")} km • target berikutnya ${(odo + p.intervalKm).toLocaleString("id-ID")} km${p.cost > 0 ? ` • biaya Rp ${p.cost.toLocaleString("id-ID")} dibebankan ke kas/bank` : ""}`,
      "success",
    );
  };

  const setOpeningBalance: Ctx["setOpeningBalance"] = async (ym, entries, opts) => {
    const valid = entries.filter((e) => Number.isFinite(e.amount));
    if (!valid.length) {
      toast("Tidak ada saldo awal diisi", "Isi minimal satu akun", "warn");
      return;
    }
    const now = iso(TODAY());
    const who = state.user?.name ?? "Sistem LBS";
    const type: OpeningSource = opts?.firstTime ? "sistem" : "manual";
    const toInsert = valid.map((e) => dbOpeningBalance(e.accountId, ym, e.amount, type, e.note?.trim() || opts?.globalNote?.trim() || (opts?.firstTime ? "Inisialisasi saldo awal saat aplikasi pertama digunakan" : `Saldo awal ${ymLabel(ym)} diinput manual (bukan pemasukan)`), who, now));
    const toLog = valid.map((e) => dbOpeningLog(ym, e.accountId, e.amount, who, now, toInsert.find((x) => x.account_id === e.accountId)!.note, type));
    await supabase.from("opening_balances").upsert(toInsert, { onConflict: "account_id,ym" });
    await supabase.from("opening_log").insert(toLog);
    setState((s) => {
      const next = { ...s.openingBalances };
      const log = [...s.openingLog];
      valid.forEach((e) => {
        const key = `${e.accountId}|${ym}`;
        next[key] = { amount: e.amount, type, note: e.note?.trim() || opts?.globalNote?.trim() || (opts?.firstTime ? "Inisialisasi saldo awal saat aplikasi pertama digunakan" : `Saldo awal ${ymLabel(ym)} diinput manual (bukan pemasukan)`), by: who, at: now };
        log.unshift({ id: uid("OP"), ym, accountId: e.accountId, amount: e.amount, by: who, at: now, note: next[key].note, type });
      });
      return { ...s, openingBalances: next, openingLog: log };
    });
    const total = valid.reduce((s2, e) => s2 + e.amount, 0);
    toast(
      opts?.firstTime ? "Saldo awal sistem diinisialisasi" : `Saldo awal ${ymLabel(ym)} disimpan`,
      `${valid.length} akun • total ${rupiah(total)} • dicatat sebagai saldo awal, BUKAN pemasukan (tidak muncul pada kas masuk / pendapatan)`,
      "success",
    );
  };

  const rollForwardMonth: Ctx["rollForwardMonth"] = async (ym) => {
    const prev = prevYm(ym);
    const pending = state.accounts.filter((a) => !state.openingBalances[`${a.id}|${ym}`]);
    if (!pending.length) {
      toast("Roll forward tidak diperlukan", `Seluruh akun sudah memiliki saldo awal tersimpan untuk ${ymLabel(ym)}`, "info");
      return;
    }
    const now = iso(TODAY());
    const who = state.user?.name ?? "Sistem LBS";
    const toInsert = pending.map((a) => {
      const amount = derived.closingOf(a.id, prev);
      return dbOpeningBalance(a.id, ym, amount, "rollforward", `Otomatis dibaca dari saldo akhir ${ymLabel(prev)} — bukan pemasukan`, who, now, prev);
    });
    const toLog = pending.map((_, i) => dbOpeningLog(ym, pending[i].id, toInsert[i].amount, who, now, `Roll forward saldo awal ${ymLabel(ym)} dari saldo akhir ${ymLabel(prev)}`, "rollforward"));
    await supabase.from("opening_balances").insert(toInsert);
    await supabase.from("opening_log").insert(toLog);
    setState((s) => {
      const next = { ...s.openingBalances };
      const log = [...s.openingLog];
      pending.forEach((a) => {
        const amount = derived.closingOf(a.id, prev);
        next[`${a.id}|${ym}`] = { amount, type: "rollforward", note: `Otomatis dibaca dari saldo akhir ${ymLabel(prev)} — bukan pemasukan`, by: who, at: now, refMonth: prev };
        log.unshift({ id: uid("OP"), ym, accountId: a.id, amount, by: who, at: now, note: `Roll forward saldo awal ${ymLabel(ym)} dari saldo akhir ${ymLabel(prev)}`, type: "rollforward" });
      });
      return { ...s, openingBalances: next, openingLog: log };
    });
    toast(
      "Saldo awal dikunci (roll forward)",
      `${pending.length} akun mengambil saldo akhir ${ymLabel(prev)} • nilai tersimpan permanen pada audit saldo awal`,
      "success",
    );
  };

  const clearOpening: Ctx["clearOpening"] = async (accountId, ym) => {
    const key = `${accountId}|${ym}`;
    const existing = state.openingBalances[key];
    if (!existing) {
      toast("Tidak ada saldo awal tersimpan", `${ymLabel(ym)} untuk akun ini masih memakai perhitungan otomatis`, "info");
      return;
    }
    const who = state.user?.name ?? "Sistem LBS";
    await supabase.from("opening_balances").delete().match({ account_id: accountId, ym });
    await supabase.from("opening_log").insert([dbOpeningLog(ym, accountId, existing.amount, who, nowIso(), `Koreksi: saldo awal ${ymLabel(ym)} dihapus — bulan ini kembali memakai perhitungan roll forward otomatis`, "koreksi")]);
    setState((s) => {
      const next = { ...s.openingBalances };
      delete next[key];
      return {
        ...s,
        openingBalances: next,
        openingLog: [
          { id: uid("OP"), ym, accountId, amount: existing.amount, by: who, at: iso(TODAY()), note: `Koreksi: saldo awal ${ymLabel(ym)} dihapus — bulan ini kembali memakai perhitungan roll forward otomatis`, type: "koreksi" as const },
          ...s.openingLog,
        ],
      };
    });
    toast("Saldo awal dihapus", `${ymLabel(ym)} kembali dihitung otomatis dari bulan sebelumnya`, "info");
  };

  const nowIso = () => iso(TODAY());

  const setTaxRate: Ctx["setTaxRate"] = (ppnRate) => {
    const rate = Math.max(0, Math.min(1, ppnRate));
    setState((s) => ({ ...s, tax: { ppnRate: rate } }));
    toast("Tarif pajak default disimpan", `${taxRateLabel(rate)} akan dipakai pada penerbitan invoice berikutnya`, "success");
  };

  const setBulkTaxRate: Ctx["setBulkTaxRate"] = (ppnRate) => {
    setState((s) => ({ ...s, bulkTaxRate: ppnRate === null ? null : Math.max(0, Math.min(1, ppnRate)) }));
  };

  const runPayroll: Ctx["runPayroll"] = async (periodLabel, accountId) => {
    const gross = state.employees.filter((e) => e.status !== "Resign").reduce((s, e) => s + e.basic + e.allowance, 0);
    const potongan = Math.round(gross * 0.105);
    const net = gross - potongan;
    const run: PayrollRun = {
      id: uid("PR"),
      period: periodLabel,
      date: iso(TODAY()),
      gross,
      potongan,
      net,
      headcount: state.employees.filter((e) => e.status !== "Resign").length,
      status: "Disetujui",
    };
    await supabase.from("payroll_runs").insert([dbPayrollRun(run)]);
    const tx: BankTx = {
      id: uid("TX"),
      accountId,
      date: iso(TODAY()),
      desc: `Pembayaran payroll ${periodLabel} (${run.headcount} karyawan)`,
      category: "Payroll",
      direction: "out",
      amount: net,
    };
    await supabase.from("bank_tx").insert([dbBankTx(tx)]);
    setState((s) => ({
      ...s,
      payrollRuns: [run, ...s.payrollRuns],
      bankTx: [tx, ...s.bankTx],
    }));
    toast("Payroll dijalankan", `${periodLabel} • netto ${net.toLocaleString("id-ID")}`, "success");
  };

  const addLead: Ctx["addLead"] = async (lead) => {
    await supabase.from("leads").insert([dbLead(lead)]);
    setState((s) => ({ ...s, leads: [lead, ...s.leads] }));
  };

  const setLeadStage: Ctx["setLeadStage"] = async (id, stage) => {
    await supabase.from("leads").update({ stage, probability: stage === "Deal" ? 100 : stage === "Gagal" ? 0 : undefined }).eq("id", id);
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, stage, probability: stage === "Deal" ? 100 : stage === "Gagal" ? 0 : l.probability } : l)) }));
  };

  const addLeadActivity: Ctx["addLeadActivity"] = async (id, a) => {
    const act = { id: uid("ACT"), ...a };
    await supabase.from("lead_activities").insert([{ ...dbLeadActivity(act), lead_id: id }]);
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, activities: [act, ...l.activities] } : l)) }));
    toast("Aktivitas CRM tercatat", a.note, "success");
  };

  const saveMaster: Ctx["saveMaster"] = async (collection, item) => {
    const tableMap: Record<string, string> = {
      customers: "customers",
      suppliers: "suppliers",
      commodities: "commodities",
      vehicles: "vehicles",
      drivers: "drivers",
      employees: "employees",
    };
    const table = tableMap[collection];
    const dbItem = (() => {
      switch (collection) {
        case "customers": return dbCustomer(item as Customer);
        case "suppliers": return dbSupplier(item as Supplier);
        case "commodities": return dbCommodity(item as Commodity);
        case "vehicles": return dbVehicle(item as Vehicle);
        case "drivers": return dbDriver(item as Driver);
        case "employees": return dbEmployee(item as Employee);
      }
    })();
    await supabase.from(table).upsert([dbItem]);
    setState((s) => {
      const list = s[collection] as { id: ID }[];
      const exists = list.some((x) => x.id === item.id);
      const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
      return { ...s, [collection]: next } as State;
    });
    toast("Master data tersimpan", (item as { name: string }).name, "success");
  };

  const removeMaster: Ctx["removeMaster"] = async (collection, id) => {
    const tableMap: Record<string, string> = {
      customers: "customers",
      suppliers: "suppliers",
      commodities: "commodities",
      vehicles: "vehicles",
      drivers: "drivers",
      employees: "employees",
    };
    await supabase.from(tableMap[collection]).delete().eq("id", id);
    setState((s) => {
      const list = s[collection] as { id: ID }[];
      return { ...s, [collection]: list.filter((x) => x.id !== id) } as State;
    });
    toast("Data dihapus", undefined, "info");
  };

  const login: Ctx["login"] = (emailOrUsername, password) => {
    const key = emailOrUsername.trim().toLowerCase();
    const acc = state.users.find((u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key);
    if (!acc) {
      toast("Akun tidak ditemukan", "Periksa email/username atau hubungi Super Admin", "error");
      return false;
    }
    if (acc.status !== "Aktif") {
      toast(`Akun ${acc.status.toLowerCase()}`, "Hubungi Super Admin untuk mengaktifkan kembali akses login ini", "warn");
      return false;
    }
    const emp = state.employees.find((e) => e.id === acc.employeeId);
    if (acc.mustChangePassword) {
      if (acc.tempPassword && password !== acc.tempPassword) {
        toast("Password tidak sesuai", "Masukkan password sementara yang diberikan admin atau gunakan demo", "warn");
        return false;
      }
    }
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === acc.id ? { ...u, lastLogin: iso(TODAY()), mustChangePassword: acc.mustChangePassword && password === acc.tempPassword ? true : u.mustChangePassword } : u)),
      user: {
        name: emp?.name ?? acc.username,
        role: roleLabel(acc.role),
        email: acc.email,
        accountId: acc.id,
        division: emp?.division,
      },
    }));
    if (acc.mustChangePassword) {
      toast("Wajib ganti password", "Silakan ganti password Anda melalui 'Ganti Password'", "warn");
    } else {
      toast(`Selamat datang, ${emp?.name ?? acc.username}`, `${roleLabel(acc.role)} • ${acc.scope} • hak akses diterapkan ke seluruh modul`, "info");
    }
    return true;
  };

  const logout = () => {
    setState((s) => ({ ...s, user: null }));
    setRoute("dashboard");
    toast("Sesi diakhiri", "Anda telah keluar dari LBS System", "info");
  };

  const currentAccount = state.user ? state.users.find((u) => u.id === state.user!.accountId) ?? null : null;

  const can: Ctx["can"] = (rt, action) => {
    if (!state.user) return false;
    const acc = state.users.find((u) => u.id === state.user!.accountId);
    if (!acc) return false;
    if (acc.role === "super-admin") return true;
    return Boolean(acc.permissions[rt]?.[action]);
  };

  const saveUser: Ctx["saveUser"] = async (user) => {
    try {
      const payload = dbUser(user);
      const { error } = await supabase.from("users").upsert([payload]);
      if (error) throw error;
    } catch (e: any) {
      const err = e?.error ?? e;
      const serializable = {
        message: err?.message ?? e?.message ?? String(e),
        code: err?.code ?? e?.code,
        details: err?.details ?? err?.detail ?? e?.details ?? e?.detail,
        hint: err?.hint ?? e?.hint,
        status: err?.status ?? e?.status,
      };
      const readable = Object.entries(serializable)
        .map(([k, v]) => (v != null && v !== "" ? `${k}: ${v}` : null))
        .filter(Boolean)
        .join(" | ");
      console.error("[saveUser] Gagal menyimpan akun pengguna:", serializable);
      toast("Gagal menyimpan akun pengguna", readable || String(e), "error");
      return;
    }
    setState((s) => {
      const exists = s.users.some((u) => u.id === user.id);
      const nextUser = { ...user };
      return { ...s, users: exists ? s.users.map((u) => (u.id === user.id ? nextUser : u)) : [nextUser, ...s.users] };
    });
    toast("Akun pengguna tersimpan", `${user.username} - ${roleLabel(user.role)} - ${user.status}`, "success");
  };

  const removeUser: Ctx["removeUser"] = async (id) => {
    const target = state.users.find((u) => u.id === id);
    const isSelf = state.user?.accountId === id;
    await supabase.from("users").delete().eq("id", id);
    setState((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
      user: s.user?.accountId === id ? null : s.user,
    }));
    if (isSelf) {
      setRoute("dashboard");
      toast("Akun Anda dihapus", "Sesi login dihentikan otomatis", "warn");
      return;
    }
    toast("Akun pengguna dihapus", target ? `${target.username} tidak lagi dapat login` : undefined, "info");
  };

  const setUserStatus: Ctx["setUserStatus"] = async (id, status) => {
    await supabase.from("users").update({ user_status: status }).eq("id", id);
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) }));
    toast(`Status akun: ${status}`, status === "Aktif" ? "Akses login diaktifkan kembali" : "Pengguna tidak dapat login sampai diaktifkan", status === "Aktif" ? "success" : "warn");
  };

  const resetUserPassword: Ctx["resetUserPassword"] = (id: ID) => {
    const target = state.users.find((u) => u.id === id);
    const temp = `LBS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, tempPassword: temp, mustChangePassword: true } : u)),
    }));
    toast("Kata sandi direset", `${target?.email ?? "pengguna"} • sandi sementara ${temp} (salin & kirim ke email aktif karyawan)`, "info");
  };

  const changeMyPassword: Ctx["changeMyPassword"] = async (oldPass, newPass) => {
    if (!state.user) return false;
    if (newPass.length < 6) {
      toast("Password terlalu pendek", "Minimal 6 karakter", "warn");
      return false;
    }
    const acc = state.users.find((u) => u.id === state.user!.accountId);
    if (acc?.mustChangePassword && acc.tempPassword && acc.tempPassword !== oldPass) {
      toast("Password sementara tidak sesuai", "Periksa kembali password sementara yang diberikan", "warn");
      return false;
    }
    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === state.user!.accountId ? { ...u, tempPassword: undefined, mustChangePassword: false } : u,
      ),
    }));
    toast("Password berhasil diubah", undefined, "success");
    return true;
  };

  const setMyPassword: Ctx["setMyPassword"] = async (newPass) => {
    if (newPass.length < 6) { toast("Password terlalu pendek", "Minimal 6 karakter", "warn"); return false; }
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === state.user!.accountId ? { ...u, tempPassword: undefined, mustChangePassword: false } : u)),
    }));
    toast("Password berhasil diubah", undefined, "success");
    return true;
  };

  const requestUserForm: Ctx["requestUserForm"] = (employeeId) => {
    setState((s) => ({ ...s, userFormRequest: employeeId }));
  };

  const value: Ctx = {
    ...state,
    ...derived,
    currentAccount,
    can,
    saveUser,
    removeUser,
    setUserStatus,
    resetUserPassword,
    changeMyPassword,
    setMyPassword,
    requestUserForm,
    route,
    go,
    period,
    setPeriod,
    toasts,
    toast,
    dismissToast,
    login,
    logout,
    addSJ,
    updateSJ,
    deleteSJ,
    createInvoice,
    reviseInvoice,
    carryForward,
    canRevise,
    invoiceCoverage,
    recordPayment,
    addBankTx,
    transfer,
    paySupplier,
    payLegacy,
    addFuelPurchase,
    setTaxRate,
    setBulkTaxRate,
    setOpeningBalance,
    rollForwardMonth,
    clearOpening,
    taxRateLabel,
    setMaintenanceParams,
    updateOdometer,
    recordService,
    runPayroll,
    addLead,
    setLeadStage,
    addLeadActivity,
    saveMaster,
    removeMaster,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp harus dipakai di dalam AppProvider");
  return ctx;
}

