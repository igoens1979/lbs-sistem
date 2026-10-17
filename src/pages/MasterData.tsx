import { useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { UserManagement } from "@/components/UserManagement";
import { Button, Card, Field, Icon, Input, Modal, Pill, SectionHeading, Select, StatusPill, Tabs, Td, Th } from "@/components/ui";
import { nextServiceKm, remainingServiceKm, type Commodity, type Customer, type Driver, type Employee, type Supplier, type Vehicle } from "@/lib/data";
import { cn, csvDownload, d, iso, num, parseISO, rupiah, TODAY } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import { useApp } from "@/lib/store";

type CollectionKey = "customers" | "suppliers" | "commodities" | "vehicles" | "drivers" | "employees";
type TabKey = CollectionKey | "users";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: string[];
  span?: boolean;
  hint?: string;
}

const SCHEMAS: Record<CollectionKey, FieldDef[]> = {
  customers: [
    { key: "name", label: "Nama Pelanggan", span: true },
    { key: "code", label: "Kode Pelanggan" },
    { key: "city", label: "Kota" },
    { key: "contact", label: "Nama Kontak" },
    { key: "phone", label: "Telepon" },
    { key: "term", label: "Termin (hari)", type: "number" },
    { key: "segment", label: "Segmen", type: "select", options: ["Enterprise", "Korporasi", "UMKM"] },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
    { key: "since", label: "Pelanggan Sejak", type: "date" },
  ],
  suppliers: [
    { key: "name", label: "Nama Supplier", span: true },
    { key: "code", label: "Kode Supplier" },
    { key: "category", label: "Kategori", type: "select", options: ["Sparepart", "Solar & BBM", "Sewa Alat", "Jasa"] },
    { key: "contact", label: "Nama Kontak" },
    { key: "phone", label: "Telepon" },
    { key: "hutang", label: "Hutang Berjalan (Rp)", type: "number" },
    { key: "dueDays", label: "Termin (hari)", type: "number" },
  ],
  commodities: [
    { key: "name", label: "Nama Komoditas", span: true },
    { key: "unit", label: "Satuan" },
    { key: "price", label: "Harga Jual (Rp)", type: "number" },
    { key: "stock", label: "Stok Stockpile", type: "number" },
  ],
  vehicles: [
    { key: "plate", label: "Nomor Polisi" },
    { key: "model", label: "Model / Merk" },
    { key: "type", label: "Jenis", type: "select", options: ["Dump Truck", "Excavator", "Wheel Loader"] },
    { key: "capacity", label: "Kapasitas (m³)", type: "number" },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Servis", "Nonaktif"] },
    { key: "odometer", label: "Odometer Kini (km)", type: "number" },
    { key: "lastServiceOdometer", label: "Servis Terakhir — Odometer (km)", type: "number", hint: "Odometer saat servis berkala terakhir" },
    { key: "serviceIntervalKm", label: "Interval Servis (km)", type: "number", hint: "Jarak menuju servis berikutnya — co: 10.000" },
    { key: "lastServiceDate", label: "Tanggal Servis Terakhir", type: "date" },
    { key: "serviceNote", label: "Catatan Pemeliharaan", span: true },
  ],
  drivers: [
    { key: "name", label: "Nama Driver", span: true },
    { key: "phone", label: "Telepon" },
    { key: "sim", label: "Nomor SIM" },
    { key: "rating", label: "Rating (1-5)", type: "number" },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Cuti", "Nonaktif"] },
  ],
  employees: [
    { key: "name", label: "Nama Karyawan", span: true },
    { key: "code", label: "NIK Internal" },
    { key: "role", label: "Jabatan", type: "select", options: ["Driver", "Staff", "Supervisor", "Manajemen", "Security"] },
    { key: "division", label: "Divisi" },
    { key: "basic", label: "Gaji Pokok (Rp)", type: "number" },
    { key: "allowance", label: "Tunjangan (Rp)", type: "number" },
    { key: "bank", label: "Bank Payroll", type: "select", options: ["Bank NTT", "Bank Mandiri", "BCA"] },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Cuti", "Resign"] },
  ],
};

const TABS: { id: TabKey; label: string; icon: string }[] = [
  { id: "customers", label: "Pelanggan", icon: "groups" },
  { id: "suppliers", label: "Supplier", icon: "storefront" },
  { id: "commodities", label: "Komoditas", icon: "category" },
  { id: "vehicles", label: "Armada", icon: "local_shipping" },
  { id: "drivers", label: "Driver", icon: "badge" },
  { id: "employees", label: "Karyawan", icon: "people" },
  { id: "users", label: "Pengguna & Hak Akses", icon: "admin_panel_settings" },
];

export default function MasterData() {
  const app = useApp();
  const [tab, setTab] = useState<TabKey>("customers");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");

  const isUsersTab = tab === "users";
  const collection = (isUsersTab ? "employees" : tab) as CollectionKey;
  const list = app[collection] as unknown as Record<string, unknown>[];
  const filtered = list.filter((row) => query.trim() === "" || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const schema = SCHEMAS[collection];

  const canCreate = app.can("master-data", "create");
  const canEdit = app.can("master-data", "edit");
  const canDelete = app.can("master-data", "delete");

  const blank = (): Record<string, unknown> => {
    const base: Record<string, unknown> = { id: `${collection.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` };
    schema.forEach((f) => {
      base[f.key] = f.type === "number" ? 0 : f.type === "date" ? iso(TODAY()) : f.options ? f.options[0] : "";
    });
    return base;
  };

  return (
    <PageBody>
      <PageHeader
        eyebrow="Konfigurasi Sistem"
        title="Master Data & Parameter Operasional"
        description="Kelola referensi pelanggan, supplier, komoditas, armada, driver, dan karyawan. Semua perubahan langsung memengaruhi modul transaksi."
        actions={
          <PeriodActions
            onExport={() => csvDownload(`master-${tab}-lbs.csv`, [schema.map((f) => f.label), ...filtered.map((row) => schema.map((f) => String(row[f.key] ?? "")))])}
            onPrint={() => window.print()}
          />
        }
      />

      <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
        <SectionHeading
          icon="database"
          title={isUsersTab ? "Pusat Data Referensi & Manajemen Pengguna" : "Pusat Data Referensi"}
          subtitle={
            isUsersTab
              ? `${app.users.length} akun pengguna terdaftar • ${app.users.filter((u) => u.status === "Aktif").length} aktif • ${app.employees.length} karyawan tersedia`
              : `${list.length} record aktif pada tabel ${tab} · ${filtered.length} tersaring`
          }
          right={
            isUsersTab ? undefined : (
              <Button icon="add" disabled={!canCreate} onClick={() => setEditing(blank())}>
                Tambah {TABS.find((t) => t.id === tab)?.label}
              </Button>
            )
          }
        />
        <div className="flex flex-wrap items-end gap-space-sm">
          <Tabs
            tabs={TABS.map((t) => ({
              ...t,
              badge: t.id === "users" ? app.users.length : (app[t.id] as unknown as unknown[]).length,
            }))}
            value={tab}
            onChange={(t) => {
              setTab(t);
              setQuery("");
            }}
          />
          {!isUsersTab && (
            <div className="ml-auto min-w-[200px] flex-1">
              <Field label="Pencarian cepat">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ketik nama, kode, atau kata kunci…" />
              </Field>
            </div>
          )}
        </div>

        {isUsersTab ? (
          <UserManagement prefillEmployeeId={app.userFormRequest} onConsumePrefill={() => app.requestUserForm(null)} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg bg-surface-container-low">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {renderHeader(collection, tab === "employees")}
                    <Th align="center">Aksi</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                  {filtered.map((row) => (
                    <tr key={String(row.id)} className="transition-colors hover:bg-surface-container-lowest/60">
                      {renderCells(collection, row, app, tab === "employees")}
                      <Td align="center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Ubah data"
                            disabled={!canEdit}
                            onClick={() => setEditing(row)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="edit" size={18} />
                          </button>
                          <button
                            type="button"
                            title="Hapus data"
                            disabled={!canDelete}
                            onClick={() => app.removeMaster(collection, String(row.id))}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <Td colSpan={schema.length + 1} align="center" className="py-space-xl text-on-surface-variant">
                        Tidak ada data yang cocok dengan pencarian.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!isUsersTab && (
          <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low px-space-sm py-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Perubahan master data tercatat pada audit trail LBS System 1.0 • update terakhir {d(TODAY())} • Anda masuk sebagai{" "}
              {app.currentAccount ? roleLabel(app.currentAccount.role) : "-"}
            </span>
            <span className="flex gap-2">
              <Pill tone="outline">{list.length} record</Pill>
              <Pill tone={canEdit ? "amberSoft" : "error"}>{canEdit ? "Izin ubah aktif" : "Hanya lihat"}</Pill>
            </span>
          </div>
        )}
      </Card>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          width="max-w-2xl"
          title={`Form ${TABS.find((t) => t.id === tab)?.label}`}
          subtitle="Perubahan langsung tersimpan ke database aplikasi"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button
                icon="save"
                disabled={!canEdit && !canCreate}
                onClick={() => {
                  app.saveMaster(collection, editing as unknown as never);
                  setEditing(null);
                }}
              >
                Simpan Data
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            {schema.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} className={f.span ? "sm:col-span-2" : undefined}>
                {f.type === "select" ? (
                  <Select value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                    {(f.options ?? []).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={String(editing[f.key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="mt-space-md rounded-xl bg-surface-container-low p-space-sm font-body-sm text-body-sm text-on-surface-variant">
            ID record: <b className="text-primary">{String(editing.id)}</b> • data referensi ini dipakai oleh modul surat jalan, invoice, kas/bank, dan payroll.
          </div>
        </Modal>
      )}
    </PageBody>
  );
}

function renderHeader(tab: CollectionKey, showAccount = false) {
  switch (tab) {
    case "customers":
      return (
        <>
          <Th>Nama Pelanggan</Th>
          <Th>Kode</Th>
          <Th>Kota</Th>
          <Th>Kontak</Th>
          <Th align="center">Termin</Th>
          <Th align="center">Segmen</Th>
          <Th align="center">Status</Th>
        </>
      );
    case "suppliers":
      return (
        <>
          <Th>Nama Supplier</Th>
          <Th>Kategori</Th>
          <Th>Kontak</Th>
          <Th align="right">Hutang Berjalan</Th>
          <Th align="center">Termin</Th>
        </>
      );
    case "commodities":
      return (
        <>
          <Th>Komoditas</Th>
          <Th>Satuan</Th>
          <Th align="right">Harga Jual</Th>
          <Th align="right">Stok Stockpile</Th>
          <Th align="right">Nilai Stok</Th>
        </>
      );
    case "vehicles":
      return (
        <>
          <Th>Unit</Th>
          <Th>Model</Th>
          <Th align="center">Jenis</Th>
          <Th align="right">Kapasitas</Th>
          <Th align="right">Odometer Kini</Th>
          <Th align="right">Servis Terakhir</Th>
          <Th align="right">Interval</Th>
          <Th align="right">Servis Berikutnya</Th>
          <Th align="center">Status</Th>
        </>
      );
    case "drivers":
      return (
        <>
          <Th>Nama Driver</Th>
          <Th>Telepon</Th>
          <Th>SIM</Th>
          <Th align="center">Rating</Th>
          <Th align="center">Status</Th>
        </>
      );
    case "employees":
      return (
        <>
          <Th>Nama Karyawan</Th>
          <Th>Jabatan</Th>
          <Th>Divisi</Th>
          {showAccount && <Th align="center">Akun Login</Th>}
          <Th align="right">Gaji Pokok</Th>
          <Th align="right">Tunjangan</Th>
          <Th align="center">Status</Th>
        </>
      );
  }
}

function renderCells(tab: CollectionKey, row: Record<string, unknown>, app: ReturnType<typeof useApp>, showAccount = false) {
  switch (tab) {
    case "customers": {
      const c = row as unknown as Customer;
      return (
        <>
          <Td><span className="font-label-md text-label-md font-semibold text-primary">{c.name}</span></Td>
          <Td>{c.code}</Td>
          <Td>{c.city}</Td>
          <Td>
            <span className="block">{c.contact}</span>
            <span className="text-[11px] text-on-surface-variant">{c.phone}</span>
          </Td>
          <Td align="center">{c.term} hari</Td>
          <Td align="center"><Pill tone="outline">{c.segment}</Pill></Td>
          <Td align="center"><StatusPill status={c.status} /></Td>
        </>
      );
    }
    case "suppliers": {
      const s = row as unknown as Supplier;
      return (
        <>
          <Td><span className="font-label-md text-label-md font-semibold text-primary">{s.name}</span><span className="block text-[11px] text-on-surface-variant">{s.code}</span></Td>
          <Td>{s.category}</Td>
          <Td>
            <span className="block">{s.contact}</span>
            <span className="text-[11px] text-on-surface-variant">{s.phone}</span>
          </Td>
          <Td align="right" className={cn("font-mono font-semibold", s.hutang > 0 ? "text-error" : "text-success")}>{rupiah(s.hutang)}</Td>
          <Td align="center">{s.dueDays} hari</Td>
        </>
      );
    }
    case "commodities": {
      const k = row as unknown as Commodity;
      return (
        <>
          <Td><span className="font-label-md text-label-md font-semibold text-primary">{k.name}</span></Td>
          <Td>{k.unit}</Td>
          <Td align="right" className="font-mono">{rupiah(k.price)}</Td>
          <Td align="right" className="font-mono">{num(k.stock)}</Td>
          <Td align="right" className="font-mono font-semibold text-primary">{rupiah(k.price * k.stock)}</Td>
        </>
      );
    }
    case "vehicles": {
      const v = row as unknown as Vehicle;
      const trips = app.sj.filter((r) => r.vehicleId === v.id && r.date >= app.period.from && r.date <= app.period.to).reduce((s, r) => s + r.trips, 0);
      return (
        <>
          <Td>
            <span className="font-label-md text-label-md font-semibold text-primary">{v.plate}</span>
            <span className="block text-[11px] text-on-surface-variant">{trips} ritase periode ini</span>
          </Td>
          <Td>{v.model}</Td>
          <Td align="center"><Pill tone="outline">{v.type}</Pill></Td>
          <Td align="right" className="font-mono">{num(v.capacity)} m³</Td>
          <Td align="right" className="font-mono">{num(v.odometer)} km</Td>
          <Td align="right">
            <span className="block font-mono">{num(v.lastServiceOdometer)} km</span>
            <span className="text-[11px] text-on-surface-variant">{d(parseISO(v.lastServiceDate))}</span>
          </Td>
          <Td align="right" className="font-mono">{num(v.serviceIntervalKm)} km</Td>
          <Td align="right">
            <span className="block font-mono font-semibold text-primary">{num(nextServiceKm(v))} km</span>
            <span className={cn("font-label-sm text-[10px]", remainingServiceKm(v) <= 0 ? "text-error" : remainingServiceKm(v) <= app.maintenance.warnKm ? "text-secondary" : "text-success")}>
              {remainingServiceKm(v) <= 0 ? `terlambat ${num(Math.abs(remainingServiceKm(v)))} km` : `sisa ${num(remainingServiceKm(v))} km`}
            </span>
          </Td>
          <Td align="center"><StatusPill status={v.status} /></Td>
        </>
      );
    }
    case "drivers": {
      const dr = row as unknown as Driver;
      const trips = app.sj.filter((r) => r.driverId === dr.id && r.date >= app.period.from && r.date <= app.period.to).reduce((s, r) => s + r.trips, 0);
      return (
        <>
          <Td>
            <span className="font-label-md text-label-md font-semibold text-primary">{dr.name}</span>
            <span className="block text-[11px] text-on-surface-variant">{trips} ritase periode ini</span>
          </Td>
          <Td>{dr.phone}</Td>
          <Td>{dr.sim}</Td>
          <Td align="center">★ {dr.rating}</Td>
          <Td align="center"><StatusPill status={dr.status} /></Td>
        </>
      );
    }
    case "employees": {
      const e = row as unknown as Employee;
      return (
        <>
          <Td>
            <span className="font-label-md text-label-md font-semibold text-primary">{e.name}</span>
            <span className="block text-[11px] text-on-surface-variant">{e.code} • gabung {d(parseISO(e.joinDate))}</span>
          </Td>
          <Td>{e.role}</Td>
          <Td>{e.division}</Td>
          {showAccount &&
            (() => {
              const acc = app.users.find((u) => u.employeeId === e.id);
              if (!acc) {
                return (
                  <Td align="center">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="person_add"
                      disabled={!app.can("master-data", "create")}
                      onClick={() => {
                        app.requestUserForm(e.id);
                        app.toast("Form akun dibuka", `Tetapkan peran & hak akses untuk ${e.name}`, "info");
                      }}
                    >
                      Buat Akun
                    </Button>
                  </Td>
                );
              }
              return (
                <Td align="center">
                  <div className="flex flex-col items-center gap-1">
                    <Pill tone={acc.status === "Aktif" ? "success" : "error"}>{acc.status}</Pill>
                    <span className="font-label-sm text-[10px] text-on-surface-variant">{roleLabel(acc.role)}</span>
                    <button
                      type="button"
                      disabled={!app.can("master-data", "edit")}
                      onClick={() => {
                        app.requestUserForm(e.id);
                        app.toast("Akun sudah ada", "Form terbuka dalam mode pengaturan hak akses", "warn");
                      }}
                      className="font-label-sm text-[10px] font-bold text-primary hover:underline disabled:opacity-30"
                    >
                      Kelola Akses
                    </button>
                  </div>
                </Td>
              );
            })()}
          <Td align="right" className="font-mono">{rupiah(e.basic)}</Td>
          <Td align="right" className="font-mono">{rupiah(e.allowance)}</Td>
          <Td align="center"><StatusPill status={e.status} /></Td>
        </>
      );
    }
  }
}

