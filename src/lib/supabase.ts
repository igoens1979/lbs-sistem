import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase: SupabaseClient = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export type DbAccount = {
  id: string;
  code: string;
  name: string;
  bank: string;
  account_no: string;
  opening: number;
  account_type: "Bank" | "Kas";
  role?: string | null;
  is_operational: boolean;
  created_at: string;
};

export type DbBankTx = {
  id: string;
  account_id: string;
  tx_date: string;
  keterangan: string;
  kategori: string;
  arah: "in" | "out";
  jumlah: number;
  alokasi: "LBS" | "KMS" | null;
  ref: string | null;
  created_at: string;
};

export type DbCustomer = {
  id: string;
  code: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  term: number;
  segment: string;
  status: string;
  since: string;
  created_at: string;
};

export type DbSupplier = {
  id: string;
  code: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  hutang: number;
  due_days: number;
  created_at: string;
};

export type DbCommodity = {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  created_at: string;
};

export type DbVehicle = {
  id: string;
  plate: string;
  model: string;
  vehicle_type: string;
  capacity: number;
  status: string;
  driver_id: string | null;
  odometer: number;
  last_service_odometer: number;
  service_interval_km: number;
  last_service_date: string | null;
  service_note: string | null;
  created_at: string;
};

export type DbDriver = {
  id: string;
  name: string;
  phone: string;
  sim: string;
  rating: number;
  status: string;
  created_at: string;
};

export type DbSuratJalan = {
  id: string;
  no: string;
  sj_date: string;
  customer_id: string;
  commodity_id: string;
  volume: number;
  trips: number;
  vehicle_id: string;
  driver_id: string;
  price: number;
  status: string;
  invoice_id: string | null;
  site: string;
  catatan: string | null;
  created_at: string;
};

export type DbInvoice = {
  id: string;
  no: string;
  customer_id: string;
  inv_date: string;
  due_date: string;
  dpp: number;
  ppn: number;
  total: number;
  ppn_rate: number;
  status: string;
  catatan: string | null;
  jenis: string;
  created_at: string;
};

export type DbInvoiceRevision = {
  id: string;
  invoice_id: string;
  rev_date: string;
  by_user: string;
  rev_type: string;
  detail: string;
  created_at: string;
};

export type DbPayment = {
  id: string;
  invoice_id: string;
  pay_date: string;
  amount: number;
  method: string;
  account_id: string;
  ref: string;
  created_at: string;
};

export type DbInvoiceSJ = {
  invoice_id: string;
  sj_id: string;
};

export type DbLegacyDebt = {
  id: string;
  tahap: string;
  pokok: number;
  tenor: number;
  cicilan: number;
  paid_count: number;
  next_due: string | null;
  kreditur: string;
  created_at: string;
};

export type DbOpeningBalance = {
  id: string;
  account_id: string;
  ym: string;
  amount: number;
  opening_type: string;
  note: string | null;
  by_user: string;
  at_date: string | null;
  ref_month: string | null;
  created_at: string;
};

export type DbOpeningLog = {
  id: string;
  ym: string;
  account_id: string;
  amount: number;
  by_user: string;
  at_date: string | null;
  note: string | null;
  log_type: string;
  created_at: string;
};

export type DbUser = {
  id: string;
  employee_id: string;
  username: string;
  email: string;
  role: string;
  user_status: string;
  scope: string;
  user_created_at: string | null;
  last_login: string | null;
  note: string | null;
  permissions: any;
  created_at: string;
};

export type DbEmployee = {
  id: string;
  code: string;
  name: string;
  emp_role: string;
  division: string;
  join_date: string | null;
  basic: number;
  allowance: number;
  bank: string;
  emp_status: string;
  hadir: number;
  izin: number;
  alpha: number;
  created_at: string;
};

export type DbLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  value: number;
  stage: string;
  probability: number;
  owner: string;
  source: string;
  need: string;
  next_action: string;
  next_date: string | null;
  created_at: string;
};

export type DbLeadActivity = {
  id: string;
  lead_id: string;
  act_date: string | null;
  act_type: string;
  note: string;
  by_user: string;
  created_at: string;
};

export type DbFuelLog = {
  id: string;
  fuel_date: string | null;
  account_id: string;
  supplier_id: string | null;
  liter: number;
  price_per_liter: number;
  note: string;
  created_at: string;
};

export type DbPayrollRun = {
  id: string;
  period: string;
  run_date: string | null;
  gross: number;
  potongan: number;
  net: number;
  headcount: number;
  run_status: string;
  created_at: string;
};
