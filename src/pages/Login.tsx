import { useState } from "react";
import { Button, Card, Field, Icon, Input, Pill } from "@/components/ui";
import { d, TODAY } from "@/lib/format";
import { useApp } from "@/lib/store";

export default function Login() {
  const app = useApp();
const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

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
          <span>Tgl sistem {d(TODAY())} • Site Golo Mori, NTT</span>
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
              app.login(email, password);
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
              Akses hanya diperuntukkan bagi personel dan staf resmi PT Logam Bumi Santosa. Seluruh aktivitas login dipantau dan diaudit secara berkala.
            </span>
          </div>

          <div className="mt-space-md flex items-center justify-center gap-space-sm">
            <Icon name="support_agent" size={18} className="text-primary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">IT Helpdesk Site : +62 88991593993</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

