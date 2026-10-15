import { useState } from "react";
import { Button, Card, Field, Icon, Input, Pill } from "@/components/ui";
import { cn } from "@/lib/format";
import { d, TODAY } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import { useApp } from "@/lib/store";

export default function Login() {
  const app = useApp();
  const [email, setEmail] = useState("gunawan.s@lbs-group.co.id");
  const [password, setPassword] = useState("lbs-system-1.0");
  const [remember, setRemember] = useState(true);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-primary p-margin text-on-primary lg:col-span-5 lg:p-margin-desktop">
        <div className="flex items-center gap-space-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container">
            <span className="font-heading text-sm font-extrabold text-on-secondary-fixed">LBS</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm tracking-tight">PT LOGAM BUMI SANTOSA</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">LBS System 1.0</span>
          </div>
        </div>

        <div className="my-space-xl flex flex-col gap-space-md">
          <Pill tone="amber">Enterprise Resource Gateway</Pill>
          <h1 className="font-headline-xl text-headline-xl-mobile tracking-tight md:text-headline-xl">
            Satu pintu untuk CRM, keuangan, dan operasional hauling Golo Mori.
          </h1>
          <p className="max-w-md font-body-lg text-body-lg text-primary-fixed-dim">
            Konsolidasi kas &amp; bank, penagihan surat jalan, pipeline komersial, stok solar, hingga payroll supir — tersinkron dalam satu database.
          </p>
          <div className="grid grid-cols-2 gap-space-md">
            {[
              { icon: "receipt_long", label: "Siklus penagihan otomatis" },
              { icon: "handshake", label: "Pipeline CRM terukur" },
              { icon: "local_gas_station", label: "Kontrol BBM & armada" },
              { icon: "verified_user", label: "Audit trail lengkap" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-space-sm rounded-xl bg-tertiary-container p-space-sm">
                <Icon name={f.icon} size={20} className="text-secondary-container" />
                <span className="font-label-md text-label-md">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-tertiary-container">
          <span>© 2026 PT Logam Bumi Santosa</span>
          <span>Tgl sistem {d(TODAY)} • Site Golo Mori, NTT</span>
        </div>
      </div>

      {/* Login form */}
      <div className="flex flex-col items-center justify-center bg-surface-container-low p-margin lg:col-span-7 lg:p-margin-desktop">
        <Card className="w-full max-w-md p-space-lg">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Autentikasi Pengguna</span>
            <h2 className="font-headline-lg text-headline-lg text-primary">Masuk ke LBS System</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Gunakan akun korporat yang diberikan administrator sistem.</p>
          </div>

          <form
            className="mt-space-lg flex flex-col gap-space-md"
            onSubmit={(e) => {
              e.preventDefault();
              app.login(email);
            }}
          >
            <Field label="Email / Username Korporat" hint="Contoh: gunawan.s@lbs-group.co.id atau paulus.aran">
              <Input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@lbs-group.co.id" required />
            </Field>
            <Field label="Kata Sandi">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </Field>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#00274e]" />
                Ingat perangkat ini
              </label>
              <button type="button" className="font-label-sm text-label-sm font-bold text-primary hover:underline" onClick={() => app.toast("Tautan reset dikirim", "Cek email korporat Anda untuk instruksi lanjutan", "info")}>
                Lupa kata sandi?
              </button>
            </div>
            <Button type="submit" icon="login" className="w-full">
              Masuk Sistem
            </Button>
          </form>

          <div className="mt-space-lg flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
            <Icon name="shield_person" size={22} className="text-primary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Peran akun menentukan hak akses: <b className="text-primary">Lihat / Tambah / Ubah / Hapus</b> per menu, diatur pada Master Data → Pengguna &amp; Hak Akses.
            </span>
          </div>

          <div className="mt-space-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Pilih akun demo (hak akses berbeda)</span>
              <Pill tone="outline">{app.users.length} akun terdaftar</Pill>
            </div>
            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {app.users.map((u) => {
                const emp = app.employees.find((e) => e.id === u.employeeId);
                const aktif = u.status === "Aktif";
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => app.login(u.email)}
                    className={cn(
                      "flex items-center gap-space-sm rounded-xl p-space-sm text-left transition-colors",
                      aktif ? "bg-surface-container-low hover:bg-surface-container" : "bg-error-container/40 hover:bg-error-container/70",
                    )}
                  >
                    <Icon name={u.role === "super-admin" ? "shield_person" : u.role === "viewer" ? "visibility" : "person"} size={18} className={aktif ? "text-primary" : "text-error"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-label-md text-label-md text-primary">{emp?.name ?? u.username}</span>
                      <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">
                        {roleLabel(u.role)} • {u.scope}
                      </span>
                    </span>
                    <Pill tone={aktif ? "success" : "error"}>{u.status}</Pill>
                  </button>
                );
              })}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Izin modul mengikuti peran akun: memilih <b>Viewer</b> hanya dapat melihat laporan, sementara <b>Super Admin</b> dapat menambah, mengubah, dan menghapus data.
            </p>
          </div>
        </Card>
        <p className="mt-space-md max-w-md text-center font-body-sm text-body-sm text-on-surface-variant">
          Data pada aplikasi demo ini tersimpan di memori sesi browser. Setiap transaksi yang Anda buat akan langsung memperbarui dashboard.
        </p>
      </div>
    </div>
  );
}
