import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Td, Th } from "@/components/ui";
import { NAV, type Route } from "@/lib/routes";
import {
  PERM_ACTIONS,
  ROLE_TEMPLATES,
  allPermissions,
  employeeOf,
  emptyPermissions,
  permissionSummary,
  roleLabel,
  rolePermissions,
  type PermAction,
  type UserAccount,
  type UserRoleId,
} from "@/lib/permissions";
import { cn, csvDownload, d, iso, parseISO, TODAY } from "@/lib/format";
import { printUserAccess } from "@/lib/print";
import { useApp } from "@/lib/store";

export function UserManagement({ prefillEmployeeId, onConsumePrefill }: { prefillEmployeeId: string | null; onConsumePrefill: () => void }) {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRoleId>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserAccount["status"]>("all");
  const [draft, setDraft] = useState<UserAccount | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserAccount | null>(null);

  const canCreate = app.can("master-data", "create");
  const canEdit = app.can("master-data", "edit");
  const canDelete = app.can("master-data", "delete");

  const blankAccount = (employeeId = ""): UserAccount => {
    const emp = employeeOf(employeeId);
    const user = emp?.name.split(" ")[0].toLowerCase() ?? "";
    return {
      id: `U-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      employeeId,
      username: user,
      email: user ? `${user}@lbs-group.co.id` : "",
      role: "viewer",
      status: "Aktif",
      scope: "Site Golo Mori",
      createdAt: iso(TODAY),
      lastLogin: "-",
      note: "",
      permissions: rolePermissions("viewer"),
    };
  };

  /* Permintaan form dari halaman lain (mis. HRD → Kelola Akses) */
  useEffect(() => {
    if (prefillEmployeeId) {
      setDraft(blankAccount(prefillEmployeeId));
      onConsumePrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmployeeId]);

  const rows = useMemo(
    () =>
      app.users
        .map((u) => ({ u, emp: employeeOf(u.employeeId), account: app.currentAccount?.id === u.id }))
        .filter((r) => {
          if (roleFilter !== "all" && r.u.role !== roleFilter) return false;
          if (statusFilter !== "all" && r.u.status !== statusFilter) return false;
          if (query.trim()) {
            const q = query.toLowerCase();
            if (!r.u.username.toLowerCase().includes(q) && !r.u.email.toLowerCase().includes(q) && !(r.emp?.name.toLowerCase().includes(q) ?? false)) return false;
          }
          return true;
        })
        .sort((a, b) => (a.u.status === b.u.status ? a.u.id.localeCompare(b.u.id) : a.u.status === "Aktif" ? -1 : 1)),
    [app.users, app.currentAccount, roleFilter, statusFilter, query],
  );

  const stats = {
    total: app.users.length,
    aktif: app.users.filter((u) => u.status === "Aktif").length,
    nonaktif: app.users.filter((u) => u.status !== "Aktif").length,
    superAdmin: app.users.filter((u) => u.role === "super-admin").length,
    tanpaAkun: app.employees.filter((e) => e.status !== "Resign" && !app.users.some((u) => u.employeeId === e.id)).length,
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <SectionHeading
        icon="admin_panel_settings"
        title="Manajemen Pengguna & Hak Akses"
        subtitle="Daftarkan karyawan sebagai pengguna sistem, tetapkan peran, lalu atur izin Lihat / Tambah / Ubah / Hapus per menu."
        right={
          <div className="flex flex-wrap items-center gap-space-sm">
            <Button variant="secondary" size="sm" icon="grid_view" onClick={() => setMatrixOpen(true)}>
              Matriks Hak Akses
            </Button>
            <Button variant="secondary" size="sm" icon="print" onClick={() => printUserAccess(app.users, NAV, employeeOf)}>
              Cetak Daftar Akses
            </Button>
            <Button
              size="sm"
              icon="person_add"
              disabled={!canCreate}
              onClick={() => setDraft(blankAccount(app.employees.find((e) => !app.users.some((u) => u.employeeId === e.id))?.id ?? ""))}
            >
              Tambah Akun Pengguna
            </Button>
          </div>
        }
      />

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        <Card accentTop="bg-primary">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Akun</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{stats.total}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {stats.superAdmin} Super Admin • {stats.total - stats.superAdmin} peran terbatas
          </p>
        </Card>
        <Card accentTop="bg-success">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Akun Aktif</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{stats.aktif}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {stats.nonaktif} akun dinonaktifkan / ditangguhkan
          </p>
        </Card>
        <Card accentTop="bg-secondary-container">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Karyawan Tanpa Akun</span>
          <p className="mt-1 font-numeric-metric text-secondary tabular">{stats.tanpaAkun}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Belum memiliki akses login ke sistem
          </p>
        </Card>
        <Card accentTop="bg-primary-container">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Modul Dikelola</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{NAV.length}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            4 jenis izin per modul (Lihat, Tambah, Ubah, Hapus)
          </p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-space-sm">
        <Field label="Pencarian" className="min-w-[220px] flex-1">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama karyawan, username, atau email…" />
        </Field>
        <Field label="Peran">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Semua peran</option>
            {ROLE_TEMPLATES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status Akun">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Semua status</option>
            {["Aktif", "Nonaktif", "Ditangguhkan"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Button
          variant="secondary"
          icon="download"
          onClick={() =>
            csvDownload("daftar-pengguna-hak-akses-lbs.csv", [
              ["ID", "Karyawan", "Divisi", "Username", "Email", "Peran", "Cakupan", "Status", "Login Terakhir", ...NAV.map((n) => n.label)],
              ...app.users.map((u) => {
                const emp = employeeOf(u.employeeId);
                return [
                  u.id,
                  emp?.name ?? "-",
                  emp?.division ?? "-",
                  u.username,
                  u.email,
                  roleLabel(u.role),
                  u.scope,
                  u.status,
                  u.lastLogin,
                  ...NAV.map((n) => PERM_ACTIONS.filter((a) => u.permissions[n.id][a.id]).map((a) => a.short).join("") || "—"),
                ];
              }),
            ])
          }
        >
          Export Hak Akses
        </Button>
      </div>

      {/* Tabel pengguna */}
      <div className="overflow-x-auto rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th>Karyawan</Th>
              <Th>Akun Login</Th>
              <Th align="center">Peran</Th>
              <Th align="center">Cakupan</Th>
              <Th align="center">Hak Akses Modul</Th>
              <Th align="center">Login Terakhir</Th>
              <Th align="center">Status</Th>
              <Th align="center">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {rows.map(({ u, emp, account }) => {
              const sum = permissionSummary(u.permissions);
              return (
                <tr key={u.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", u.status !== "Aktif" && "opacity-70")}>
                  <Td>
                    <div className="flex items-center gap-space-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">
                        {(emp?.name ?? u.username).split(" ").slice(0, 2).map((w) => w[0]).join("")}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-primary">
                          {emp?.name ?? "Tanpa data karyawan"}
                          {account && <Pill tone="amberSoft" className="ml-2">Sesi Anda</Pill>}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {(emp?.code ?? "-") + " • " + (emp?.division ?? "-") + " • " + (emp?.role ?? "-")}
                        </span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="block font-mono text-on-surface">{u.username}</span>
                    <span className="text-[11px] text-on-surface-variant">{u.email}</span>
                  </Td>
                  <Td align="center">
                    <Pill tone={u.role === "super-admin" ? "navy" : u.role === "viewer" ? "outline" : "neutral"}>{roleLabel(u.role)}</Pill>
                  </Td>
                  <Td align="center">{u.scope}</Td>
                  <Td align="center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-label-md text-label-md text-primary">
                        {sum.visible}/{sum.total} modul • {sum.actions} izin
                      </span>
                      <div className="w-28">
                        <ProgressBar value={(sum.visible / sum.total) * 100} tone={sum.actions >= sum.total * 4 ? "bg-error" : sum.actions > sum.total ? "bg-secondary-container" : "bg-primary"} height="h-1.5" />
                      </div>
                    </div>
                  </Td>
                  <Td align="center" className="whitespace-nowrap font-mono">
                    {u.lastLogin === "-" ? "Belum pernah" : d(parseISO(u.lastLogin))}
                  </Td>
                  <Td align="center">
                    <StatusPill status={u.status} />
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title="Ubah akun & hak akses"
                        disabled={!canEdit}
                        onClick={() => setDraft({ ...u, permissions: { ...u.permissions } })}
                        className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                      >
                        <Icon name="manage_accounts" size={18} />
                      </button>
                      <button
                        type="button"
                        title="Reset kata sandi"
                        disabled={!canEdit}
                        onClick={() => app.resetUserPassword(u.id)}
                        className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                      >
                        <Icon name="key" size={18} />
                      </button>
                      <button
                        type="button"
                        title={u.status === "Aktif" ? "Nonaktifkan akun" : "Aktifkan akun"}
                        disabled={!canEdit}
                        onClick={() => app.setUserStatus(u.id, u.status === "Aktif" ? "Nonaktif" : "Aktif")}
                        className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                      >
                        <Icon name={u.status === "Aktif" ? "toggle_on" : "toggle_off"} size={18} />
                      </button>
                      <button
                        type="button"
                        title="Hapus akun"
                        disabled={!canDelete}
                        onClick={() => setConfirmDelete(u)}
                        className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <Td colSpan={8}>
                  <EmptyState icon="admin_panel_settings" title="Tidak ada akun sesuai filter" detail="Ubah kata kunci atau filter peran/status, atau tambahkan akun pengguna baru." />
                </Td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
              <Td colSpan={4}>Total {rows.length} akun terfilter dari {app.users.length} akun</Td>
              <Td colSpan={4} align="center" className="font-label-sm text-label-sm">
                Klik ikon <span className="font-mono">manage_accounts</span> untuk mengubah peran &amp; izin per menu
              </Td>
            </tr>
          </tfoot>
        </table>
      </div>

      {draft && (
        <UserForm
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={(u) => {
            app.saveUser(u);
            setDraft(null);
          }}
          canEdit={canEdit || canCreate}
        />
      )}

      <Modal
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        width="max-w-[1000px]"
        title="Matriks Hak Akses Pengguna"
        subtitle="L = Lihat · T = Tambah · U = Ubah · H = Hapus • sel kosong berarti izin dicabut"
        footer={
          <>
            <Button variant="outline" onClick={() => setMatrixOpen(false)}>
              Tutup
            </Button>
            <Button variant="secondary" icon="print" onClick={() => printUserAccess(app.users, NAV, employeeOf)}>
              Cetak Matriks
            </Button>
          </>
        }
      >
        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th>Pengguna</Th>
                {NAV.map((n) => (
                  <Th key={n.id} align="center">
                    {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {app.users.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <span className="font-label-md text-label-md text-primary">{employeeOf(u.employeeId)?.name ?? u.username}</span>
                    <span className="block text-[11px] text-on-surface-variant">
                      {roleLabel(u.role)} • {u.status}
                    </span>
                  </Td>
                  {NAV.map((n) => {
                    const p = u.permissions[n.id];
                    const letters = PERM_ACTIONS.filter((a) => p[a.id]).map((a) => a.short);
                    return (
                      <Td key={n.id} align="center">
                        {letters.length === 0 ? (
                          <span className="text-outline-variant">—</span>
                        ) : (
                          <span className="inline-flex gap-0.5">
                            {letters.map((l) => (
                              <span
                                key={l}
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded font-label-sm text-[10px]",
                                  l === "H" ? "bg-error-container text-error" : l === "U" ? "bg-secondary-fixed text-on-secondary-fixed" : l === "T" ? "bg-primary-fixed text-primary" : "bg-surface-container text-primary",
                                )}
                              >
                                {l}
                              </span>
                            ))}
                          </span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Hapus Akun Pengguna"
        subtitle={confirmDelete ? `${employeeOf(confirmDelete.employeeId)?.name ?? confirmDelete.username} • ${confirmDelete.email}` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              icon="delete_forever"
              onClick={() => {
                if (confirmDelete) app.removeUser(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Hapus Akun
            </Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface">
          Menghapus akun akan mencabut seluruh akses modul milik pengguna ini. Data karyawan, surat jalan, dan transaksi historis tetap tersimpan di sistem.
        </p>
        <div className="mt-space-md rounded-lg bg-secondary-fixed px-space-sm py-2 text-on-secondary-fixed">
          <span className="font-label-sm text-label-sm uppercase tracking-wider">Disarankan</span>
          <p className="font-body-sm text-body-sm">Gunakan <b>Nonaktifkan akun</b> bila akses hanya perlu dihentikan sementara agar riwayat audit tetap utuh.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ----------------------------- Form akun & izin ----------------------------- */

function UserForm({ draft, onSave, onClose, canEdit }: { draft: UserAccount; onSave: (u: UserAccount) => void; onClose: () => void; canEdit: boolean }) {
  const app = useApp();
  const [form, setForm] = useState<UserAccount>(draft);
  const emp = employeeOf(form.employeeId);
  const sum = permissionSummary(form.permissions);

  const toggle = (route: Route, action: PermAction) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [route]: { ...f.permissions[route], [action]: !f.permissions[route][action] } } }));

  const toggleAll = (route: Route, on: boolean) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [route]: { view: on, create: on, edit: on, delete: on } } }));

  const applyRole = (role: UserRoleId) =>
    setForm((f) => ({ ...f, role, permissions: rolePermissions(role) }));

  const chosenEmployeeTaken = app.users.some((u) => u.employeeId === form.employeeId && u.id !== form.id);

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-4xl"
      title={draft.username ? `Akun Pengguna — ${emp?.name ?? draft.username}` : "Akun Pengguna Baru"}
      subtitle="Hubungkan akun login dengan data karyawan, lalu atur izin per menu (Lihat / Tambah / Ubah / Hapus)."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="save"
            disabled={!canEdit}
            onClick={() => {
              if (!form.employeeId) {
                app.toast("Karyawan belum dipilih", "Akun login harus terkait dengan data karyawan", "warn");
                return;
              }
              if (!form.email.trim() || !form.username.trim()) {
                app.toast("Username & email wajib diisi", "Data ini dipakai untuk login ke sistem", "warn");
                return;
              }
              if (app.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== form.id)) {
                app.toast("Email sudah dipakai akun lain", "Gunakan email korporat yang berbeda", "error");
                return;
              }
              if (sum.visible === 0) {
                app.toast("Minimal satu modul harus dapat dilihat", "Centang izin Lihat pada menu yang diperlukan", "warn");
                return;
              }
              onSave(form);
            }}
          >
            Simpan Akun &amp; Hak Akses
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-lg">
        {/* Data akun */}
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <Field
            label="Karyawan"
            hint={chosenEmployeeTaken ? "Karyawan ini sudah memiliki akun login — periksa daftar akun sebelum menyimpan" : emp ? `${emp.code} • ${emp.division}` : "Wajib dipilih"}
            className="sm:col-span-2"
          >
            <Select value={form.employeeId} onChange={(e) => {
              const id = e.target.value;
              const e2 = employeeOf(id);
              const base = e2?.name.split(" ")[0].toLowerCase() ?? "";
              setForm((f) => ({ ...f, employeeId: id, username: f.username || base, email: f.email || (base ? `${base}@lbs-group.co.id` : "") }));
            }}>
              <option value="">— Pilih karyawan —</option>
              {app.employees.map((e) => {
                const taken = app.users.some((u) => u.employeeId === e.id && u.id !== form.id);
                return (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.role} / {e.division}
                    {taken ? " (sudah ada akun)" : ""}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Username Login">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="mis. paulus.aran" />
          </Field>
          <Field label="Email Korporat">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@lbs-group.co.id" />
          </Field>
          <Field label="Peran (Template Hak Akses)">
            <Select value={form.role} onChange={(e) => applyRole(e.target.value as UserRoleId)}>
              {ROLE_TEMPLATES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cakupan Data">
            <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as UserAccount["scope"] })}>
              {["Semua Site", "Site Golo Mori", "Labuan Bajo", "Kantor Pusat"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status Akun">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserAccount["status"] })}>
              {["Aktif", "Nonaktif", "Ditangguhkan"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Catatan Akses">
            <Input value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="mis. hanya untuk verifikasi timbangan" />
          </Field>
        </div>

        <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
          <Icon name={ROLE_TEMPLATES.find((r) => r.id === form.role)?.icon ?? "shield_person"} size={22} className="text-primary" />
          <span className="min-w-0">
            <span className="block font-label-md text-label-md text-primary">
              {roleLabel(form.role)} — {ROLE_TEMPLATES.find((r) => r.id === form.role)?.desc}
            </span>
            <span className="block font-body-sm text-body-sm text-on-surface-variant">
              {sum.visible} dari {sum.total} modul terlihat • {sum.actions} izin aktif dari maksimum {sum.total * 4} — ubah rinciannya di bawah bila perlu penyesuaian khusus.
            </span>
          </span>
        </div>

        {/* Matriks izin */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <SectionHeading icon="rule" title="Izin per Menu" subtitle="Centang aksi yang diizinkan untuk akun ini" />
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="secondary" icon="auto_fix_high" disabled={!canEdit} onClick={() => applyRole(form.role)}>
              Terapkan Template Peran
            </Button>
            <Button size="sm" variant="secondary" icon="checklist" disabled={!canEdit} onClick={() => setForm((f) => ({ ...f, permissions: allPermissions() }))}>
              Beri Semua
            </Button>
            <Button size="sm" variant="outline" icon="block" disabled={!canEdit} onClick={() => setForm((f) => ({ ...f, permissions: emptyPermissions() }))}>
              Kosongkan
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th>Menu / Modul</Th>
                {PERM_ACTIONS.map((a) => (
                  <Th key={a.id} align="center">
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center gap-1">
                        <Icon name={a.icon} size={14} />
                        {a.label}
                      </span>
                      <span className="font-body-sm text-[10px] font-normal normal-case tracking-normal text-on-surface-variant">{a.desc}</span>
                    </span>
                  </Th>
                ))}
                <Th align="center">Semua</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {NAV.map((n) => {
                const p = form.permissions[n.id];
                const allOn = PERM_ACTIONS.every((a) => p[a.id]);
                return (
                  <tr key={n.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", !p.view && "opacity-70")}>
                    <Td>
                      <span className="flex items-center gap-space-sm">
                        <Icon name={n.icon} size={18} className="text-primary" />
                        <span className="flex flex-col">
                          <span className="font-label-md text-label-md text-primary">{n.label}</span>
                          <span className="text-[11px] text-on-surface-variant">
                            {n.group} • {n.hint}
                          </span>
                        </span>
                      </span>
                    </Td>
                    {PERM_ACTIONS.map((a) => (
                      <Td key={a.id} align="center">
                        <input
                          type="checkbox"
                          aria-label={`${a.label} ${n.label}`}
                          checked={p[a.id]}
                          disabled={!canEdit}
                          onChange={() => toggle(n.id, a.id)}
                          className="h-4 w-4 accent-[#00274e]"
                        />
                      </Td>
                    ))}
                    <Td align="center">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => toggleAll(n.id, !allOn)}
                        className={cn(
                          "rounded-lg px-2 py-1 font-label-sm text-[10px] uppercase transition-colors disabled:opacity-40",
                          allOn ? "bg-primary text-on-primary" : "bg-surface-container text-primary hover:bg-surface-container-high",
                        )}
                      >
                        {allOn ? "penuh" : "pilih"}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Akun akses lain untuk perbandingan */}
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Akun aktif saat ini</span>
          <div className="mt-space-sm flex flex-wrap gap-space-sm">
            {app.users.map((u) => (
              <span key={u.id} className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-2 py-1">
                <Icon name={u.role === "super-admin" ? "shield_person" : "person"} size={14} className="text-primary" />
                <span className="font-label-sm text-[11px] text-on-surface">{employeeOf(u.employeeId)?.name ?? u.username}</span>
                <Pill tone={u.status === "Aktif" ? "success" : "error"}>{u.status}</Pill>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
