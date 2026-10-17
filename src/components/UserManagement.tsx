import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Td, Th } from "@/components/ui";
import { NAV, type Route } from "@/lib/routes";
import {
  PERM_ACTIONS,
  ROLE_TEMPLATES,
  employeeOf,
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

export function UserForm({ draft, onSave, onClose, canEdit }: { draft: UserAccount; onSave: (u: UserAccount) => void; onClose: () => void; canEdit: boolean }) {
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
      title={draft.username ? `Akun Pengguna - ${emp?.name ?? draft.username}` : "Akun Pengguna Baru"}
      subtitle="Hubungkan akun login dengan data karyawan, lalu atur izin per menu (Lihat / Tambah / Ubah / Hapus)."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button icon="save" disabled={!canEdit} onClick={() => {
            if (!form.employeeId) { app.toast("Karyawan belum dipilih", "Akun login harus terkait dengan data karyawan", "warn"); return; }
            if (!form.email.trim() || !form.username.trim()) { app.toast("Username & email wajib diisi", "Data ini dipakai untuk login ke sistem", "warn"); return; }
            if (sum.visible === 0) { app.toast("Minimal satu modul harus dapat dilihat", "Centang izin Lihat pada menu yang diperlukan", "warn"); return; }
            onSave(form);
          }}>Simpan Akun & Hak Akses</Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-lg">
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <Field label="Karyawan Terhubung" className="sm:col-span-2">
            <Select value={form.employeeId} onChange={(e) => { const eid = e.target.value; const emp2 = app.employees.find(x=>x.id===eid); const baseUser = emp2?.name.split(" ")[0].toLowerCase().replace(/\s+/g,"") ?? ""; const emailBase = (emp2 as any)?.email ?? (baseUser ? `${baseUser}@lbs-group.co.id` : form.email); setForm(f => ({ ...f, employeeId: eid, username: baseUser || f.username, email: emailBase.toLowerCase() })); }} disabled={!canEdit}>
              <option value="">- Pilih karyawan -</option>
              {app.employees.filter(e => e.status !== "Resign").sort((a,b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.id}>{e.name} - {e.division} ({e.role})</option>)}
            </Select>
          </Field>
          <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!canEdit} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} disabled={!canEdit} /></Field>
          <Field label="Peran Sistem">
            <Select value={form.role} onChange={(e) => applyRole(e.target.value as UserRoleId)} disabled={!canEdit}>
              {ROLE_TEMPLATES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Status Akun">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserAccount["status"] })} disabled={!canEdit}>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Ditangguhkan">Ditangguhkan</option>
            </Select>
          </Field>
          <Field label="Cakupan Data">
            <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as UserAccount["scope"] })} disabled={!canEdit}>
              <option value="Site Golo Mori">Site Golo Mori</option>
              <option value="Head Office">Head Office</option>
              <option value="Kantor Pusat">Kantor Pusat</option>
              <option value="Labuan Bajo">Labuan Bajo</option>
              <option value="Semua Site">Semua Site</option>
            </Select>
          </Field>
          {(draft.tempPassword || form.tempPassword) && (
            <Field label="Kata Sandi Sementara" className="sm:col-span-2" hint="Bagikan ke karyawan sekali saja — wajib diganti saat login.">
              <div className="flex items-center gap-space-sm">
                <Input readOnly value={form.tempPassword || draft.tempPassword || ""} />
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(form.tempPassword || draft.tempPassword || "")}>Salin</Button>
                <Button variant="secondary" size="sm" onClick={() => { const p = `LBS-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.floor(Math.random()*90+10)}`; setForm(f => ({ ...f, tempPassword: p, mustChangePassword: true })); }}>Generate Ulang</Button>
              </div>
            </Field>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th>Modul</Th>
                {PERM_ACTIONS.map(a => <Th key={a.id} align="center">{a.label}</Th>)}
                <Th align="center">Semua</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {NAV.map(n => {
                const p = form.permissions[n.id];
                const allOn = PERM_ACTIONS.every(a => p[a.id]);
                return (
                  <tr key={n.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", !p.view && "opacity-70")}>
                    <Td>{n.label}</Td>
                    {PERM_ACTIONS.map(a => (
                      <Td key={a.id} align="center">
                        <input type="checkbox" checked={p[a.id]} disabled={!canEdit || (a.id !== "view" && !p.view)} onChange={() => toggle(n.id, a.id)} className="h-4 w-4 accent-[#00274e]" />
                      </Td>
                    ))}
                    <Td align="center">
                      <button type="button" disabled={!canEdit} onClick={() => toggleAll(n.id, !allOn)} className={cn("rounded-lg px-2 py-1 font-label-sm text-[10px] uppercase transition-colors disabled:opacity-40", allOn ? "bg-primary text-on-primary" : "bg-surface-container text-primary hover:bg-surface-container-high")}>
                        {allOn ? "penuh" : "pilih"}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}


export function UserManagement({ prefillEmployeeId, onConsumePrefill }: { prefillEmployeeId: string | null; onConsumePrefill: () => void }) {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRoleId>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserAccount["status"]>("all");
  const [draft, setDraft] = useState<UserAccount | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserAccount | null>(null);
  const [tempPwd, setTempPwd] = useState<{ id: string; pwd: string; email: string } | null>(null);

  const canCreate = app.can("master-data", "create");
  const canEdit = app.can("master-data", "edit");
  const canDelete = app.can("master-data", "delete");

  const genPwd = () => `LBS-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;

  const blankAccount = (employeeId = ""): UserAccount => {
    const emp = employeeOf(employeeId);
    const user = emp?.name.split(" ")[0].toLowerCase().replace(/\s+/g,"") ?? "";
    const email = emp?.email ?? (user ? `${user}@lbs-group.co.id` : "");
    return {
      id: `U-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      employeeId,
      username: user,
      email: email.toLowerCase(),
      role: "viewer",
      status: "Aktif",
      scope: "Site Golo Mori",
      createdAt: iso(TODAY()),
      lastLogin: "-",
      note: "",
      permissions: rolePermissions("viewer"),
      tempPassword: genPwd(),
      mustChangePassword: true,
    };
  };

  useEffect(() => {
    if (prefillEmployeeId) { setDraft(blankAccount(prefillEmployeeId)); onConsumePrefill(); }
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
            <Button variant="secondary" size="sm" icon="grid_view" onClick={() => setMatrixOpen(true)}>Matriks Hak Akses</Button>
            <Button variant="secondary" size="sm" icon="print" onClick={() => printUserAccess(app.users, NAV, employeeOf)}>Cetak Daftar Akses</Button>
            <Button size="sm" icon="person_add" disabled={!canCreate} onClick={() => setDraft(blankAccount(app.employees.find((e) => !app.users.some((u) => u.employeeId === e.id))?.id ?? ""))}>Tambah Akun Pengguna</Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        <Card accentTop="bg-primary"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Akun</span><p className="mt-1 font-numeric-metric text-primary tabular">{stats.total}</p></Card>
        <Card accentTop="bg-success"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Akun Aktif</span><p className="mt-1 font-numeric-metric text-primary tabular">{stats.aktif}</p></Card>
        <Card accentTop="bg-secondary-container"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Karyawan Tanpa Akun</span><p className="mt-1 font-numeric-metric text-secondary tabular">{stats.tanpaAkun}</p></Card>
        <Card accentTop="bg-primary-container"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Modul Dikelola</span><p className="mt-1 font-numeric-metric text-primary tabular">{NAV.length}</p></Card>
      </div>
      <div className="flex flex-wrap items-end gap-space-sm">
        <Field label="Pencarian" className="min-w-[220px] flex-1"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama karyawan, username, atau email..." /></Field>
        <Field label="Peran">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Semua peran</option>
            {ROLE_TEMPLATES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Status Akun">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Semua status</option>
            {["Aktif", "Nonaktif", "Ditangguhkan"].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <div className="overflow-x-auto rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th>Karyawan</Th><Th>Akun Login</Th><Th align="center">Peran</Th><Th align="center">Cakupan</Th><Th align="center">Hak Akses Modul</Th><Th align="center">Login Terakhir</Th><Th align="center">Status</Th><Th align="center">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {rows.map(({ u, emp, account }) => {
              const sum = permissionSummary(u.permissions);
              return (
                <tr key={u.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", u.status !== "Aktif" && "opacity-70")}>
                  <Td>
                    <div className="flex items-center gap-space-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">{(emp?.name ?? u.username).split(" ").slice(0,2).map(w => w[0]).join("")}</span>
                      <span className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-primary">{emp?.name ?? "Tanpa data karyawan"}{account && <Pill tone="amberSoft" className="ml-2">Sesi Anda</Pill>}</span>
                        <span className="text-[11px] text-on-surface-variant">{emp?.code ?? "-"} - {emp?.division ?? "-"} - {emp?.role ?? "-"}</span>
                        {u.tempPassword && <span className="text-[10px] text-secondary">Ada password sementara (wajib diganti)</span>}
                      </span>
                    </div>
                  </Td>
                  <Td><span className="block font-mono text-on-surface">{u.username}</span><span className="text-[11px] text-on-surface-variant">{u.email}</span></Td>
                  <Td align="center"><Pill tone={u.role === "super-admin" ? "navy" : u.role === "viewer" ? "outline" : "neutral"}>{roleLabel(u.role)}</Pill></Td>
                  <Td align="center">{u.scope}</Td>
                  <Td align="center"><span className="font-label-md text-label-md text-primary">{sum.visible}/{sum.total} modul - {sum.actions} izin</span></Td>
                  <Td align="center" className="whitespace-nowrap font-mono">{u.lastLogin === "-" ? "Belum pernah" : d(parseISO(u.lastLogin))}</Td>
                  <Td align="center"><StatusPill status={u.status} /></Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" disabled={!canEdit} onClick={() => setDraft({ ...u, permissions: { ...u.permissions }, employeeId: u.employeeId })} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"><Icon name="manage_accounts" size={18} /></button>
                      <button type="button" disabled={!canEdit} onClick={() => app.resetUserPassword(u.id)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"><Icon name="key" size={18} /></button>
                      <button type="button" disabled={!canEdit} onClick={() => app.setUserStatus(u.id, u.status === "Aktif" ? "Nonaktif" : "Aktif")} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"><Icon name={u.status === "Aktif" ? "toggle_on" : "toggle_off"} size={18} /></button>
                      <button type="button" disabled={!canDelete} onClick={() => setConfirmDelete(u)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30"><Icon name="delete" size={18} /></button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (<tr><Td colSpan={8}><EmptyState icon="admin_panel_settings" title="Tidak ada akun" detail="Tidak ada akun sesuai filter." /></Td></tr>)}
          </tbody>
        </table>
      </div>
      {draft && <UserForm draft={draft} onClose={() => setDraft(null)} onSave={(u) => { app.saveUser(u); const isNew = !app.users.some(x => x.id === u.id); const pwd = u.tempPassword || draft.tempPassword; if (isNew && pwd) { setTempPwd({ id: u.id, pwd, email: u.email }); } setDraft(null); }} canEdit={canEdit || canCreate} />}
      {tempPwd && (
        <Modal open onClose={() => setTempPwd(null)} title="Kata Sandi Sementara Dibuat" subtitle="Salin dan kirim ke email karyawan. Wajib diganti saat login pertama." footer={<Button onClick={() => setTempPwd(null)}>Tutup</Button>}>
          <div className="flex flex-col gap-space-md">
            <Field label="Email Tujuan"><Input readOnly value={tempPwd.email} /></Field>
            <Field label="Kata Sandi Sementara">
              <div className="flex items-center gap-space-sm">
                <Input readOnly value={tempPwd.pwd} />
                <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(tempPwd.pwd)}>Salin</Button>
              </div>
            </Field>
            <p className="text-[11px] text-on-surface-variant">Password ini hanya ditampilkan sekali saat dibuat. Disarankan untuk tidak menyimpannya di tempat umum.</p>
          </div>
        </Modal>
      )}
      <Modal open={matrixOpen} onClose={() => setMatrixOpen(false)} width="max-w-[1000px]" title="Matriks Hak Akses Pengguna" footer={<Button variant="outline" onClick={() => setMatrixOpen(false)}>Tutup</Button>}>
        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead><tr><Th>Pengguna</Th>{NAV.map(n => <Th key={n.id} align="center">{n.label.length > 18 ? n.label.slice(0,16) + "..." : n.label}</Th>)}</tr></thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {app.users.map(u => (
                <tr key={u.id}>
                  <Td><span className="font-label-md text-label-md text-primary">{employeeOf(u.employeeId)?.name ?? u.username}</span><span className="block text-[11px] text-on-surface-variant">{roleLabel(u.role)} - {u.status}</span></Td>
                  {NAV.map(n => { const p = u.permissions?.[n.id] ?? { view: false, create: false, edit: false, delete: false }; const letters = PERM_ACTIONS.filter(a => p[a.id]).map(a => a.short); return <Td key={n.id} align="center">{letters.length === 0 ? "-" : letters.join("")}</Td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Hapus Akun Pengguna" footer={<><Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button><Button variant="danger" icon="delete_forever" onClick={() => { if (confirmDelete) app.removeUser(confirmDelete.id); setConfirmDelete(null); }}>Hapus Akun</Button></>}>
        <p className="font-body-md text-body-md text-on-surface">Menghapus akun akan mencabut seluruh akses modul milik pengguna ini.</p>
      </Modal>
    </div>
  );
}


