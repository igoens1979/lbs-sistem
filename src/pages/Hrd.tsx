import { useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { Button, Card, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Td, Th } from "@/components/ui";
import type { Employee } from "@/lib/data";
import { cn, csvDownload, d, iso, monthLabel, num, parseISO, pct, rupiah, rupiahShort, TODAY } from "@/lib/format";
import { printPayslip } from "@/lib/print";
import { useApp } from "@/lib/store";

export default function Hrd() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payslip, setPayslip] = useState<Employee | null>(null);
  const canPayroll = app.can("hrd", "create");
  const canEdit = app.can("hrd", "edit");

  const employees = app.employees;
  const filtered = employees.filter((e) => {
    if (role !== "all" && e.role !== role) return false;
    if (query.trim() && !e.name.toLowerCase().includes(query.toLowerCase()) && !e.division.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const active = employees.filter((e) => e.status !== "Resign");
  const totals = useMemo(() => {
    const gross = active.reduce((s, e) => s + e.basic + e.allowance, 0);
    const potongan = Math.round(gross * 0.105);
    return { gross, potongan, net: gross - potongan, headcount: active.length, avg: gross / (active.length || 1) };
  }, [active]);

  const attendance = {
    hadir: employees.reduce((s, e) => s + e.hadir, 0),
    izin: employees.reduce((s, e) => s + e.izin, 0),
    alpha: employees.reduce((s, e) => s + e.alpha, 0),
  };
  const attendanceRate = pct(attendance.hadir, attendance.hadir + attendance.izin + attendance.alpha);

  const byDivision = Object.entries(
    active.reduce<Record<string, number>>((acc, e) => {
      acc[e.division] = (acc[e.division] ?? 0) + e.basic + e.allowance;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const potonganOf = (e: Employee) => Math.round((e.basic + e.allowance) * 0.085) + e.alpha * 250_000;

  return (
    <PageBody>
      <PageHeader
        eyebrow="Sumber Daya Manusia"
        title="HRD, Absensi & Payroll Operasional"
        description="Kelola data kepegawaian, rekap absensi bulanan, komponen gaji supir dan staf, serta jalankan payroll batch langsung dari rekening perusahaan."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("data-kepegawaian-lbs.csv", [
                ["NIK", "Nama", "Jabatan", "Divisi", "Gaji Pokok", "Tunjangan", "Hadir", "Izin", "Alpha", "Take Home"],
                ...employees.map((e) => [e.code, e.name, e.role, e.division, e.basic, e.allowance, e.hadir, e.izin, e.alpha, e.basic + e.allowance - potonganOf(e)]),
              ])
            }
            onPrint={() => window.print()}
          />
        }
      />

      <section className="flex flex-wrap gap-space-md">
        <Card accentTop="bg-primary" className="min-w-[210px] flex-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Headcount Aktif</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{num(totals.headcount)} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">orang</span></p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {employees.filter((e) => e.role === "Driver").length} driver • {employees.filter((e) => e.status === "Cuti").length} sedang cuti
          </p>
        </Card>
        <Card accentTop="bg-primary-container" className="min-w-[210px] flex-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Gaji Bruto Bulanan</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{rupiahShort(totals.gross)}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Rata-rata {rupiahShort(totals.avg)} per karyawan
          </p>
        </Card>
        <Card accentTop="bg-secondary-container" className="min-w-[210px] flex-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Potongan (BPJS, PPh21, Absensi)</span>
          <p className="mt-1 font-numeric-metric text-secondary tabular">{rupiahShort(totals.potongan)}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Estimasi take home {rupiahShort(totals.net)}
          </p>
        </Card>
        <Card accentTop="bg-primary" className="min-w-[210px] flex-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tingkat Kehadiran</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{attendanceRate.toFixed(1)}%</p>
          <div className="mt-space-sm">
            <ProgressBar value={attendanceRate} />
          </div>
          <p className="mt-space-sm rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {num(attendance.hadir)} hadir • {num(attendance.izin)} izin • {num(attendance.alpha)} alpha
          </p>
        </Card>
      </section>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-8">
          <SectionHeading
            icon="groups"
            title="Buku Induk Karyawan"
            subtitle="Komponen gaji, absensi, dan status kepegawaian"
            right={
              <Button size="sm" icon="payments" disabled={!canPayroll} onClick={() => setPayrollOpen(true)}>
                Jalankan Payroll
              </Button>
            }
          />
          <div className="flex flex-wrap items-end gap-space-sm">
            <Field label="Pencarian" className="min-w-[200px] flex-1">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama karyawan atau divisi…" />
            </Field>
            <Field label="Jabatan">
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">Semua jabatan</option>
                {[...new Set(employees.map((e) => e.role))].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="overflow-x-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>Karyawan</Th>
                  <Th>Jabatan / Divisi</Th>
                  <Th align="right">Gaji Pokok</Th>
                  <Th align="right">Tunjangan</Th>
                  <Th align="center">Absensi</Th>
                  <Th align="right">Take Home</Th>
                  <Th align="center">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {filtered.map((e) => {
                  const thp = e.basic + e.allowance - potonganOf(e);
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-surface-container-lowest/60">
                      <Td>
                        <div className="flex items-center gap-space-sm">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">
                            {e.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                          </span>
                          <span className="flex flex-col">
                           <span className="font-label-md text-label-md font-semibold text-primary">{e.name}</span>
                           <span className="text-[11px] text-on-surface-variant">{e.code}</span>
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="block">{e.role}</span>
                        <span className="text-[11px] text-on-surface-variant">{e.division}</span>
                      </Td>
                      <Td align="right" className="font-mono">{rupiah(e.basic)}</Td>
                      <Td align="right" className="font-mono">{rupiah(e.allowance)}</Td>
                      <Td align="center">
                        <span className="font-mono">{e.hadir}/{e.izin}/{e.alpha}</span>
                        <div className="mt-1 w-16">
                          <ProgressBar value={pct(e.hadir, 26)} height="h-1" />
                        </div>
                      </Td>
                      <Td align="right" className={cn("font-mono font-semibold", e.status === "Resign" ? "text-outline" : "text-primary")}>{rupiah(thp)}</Td>
                      <Td align="center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Cetak slip gaji"
                            onClick={() => setPayslip(e)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary"
                          >
                            <Icon name="print" size={18} />
                          </button>
                          <button
                            type="button"
                            title="Ubah status kepegawaian"
                            disabled={!canEdit}
                            onClick={() => {
                              const next = e.status === "Aktif" ? "Cuti" : "Aktif";
                              app.saveMaster("employees", { ...e, status: next });
                            }}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="swap_horiz" size={18} />
                          </button>
                          <button
                            type="button"
                            title="Kelola akun login & hak akses"
                            disabled={!canEdit}
                            onClick={() => {
                              app.requestUserForm(e.id);
                              app.go("master-data");
                              app.toast("Kelola akses login", `Peran & izin untuk ${e.name} dapat diatur di tab Pengguna & Hak Akses`, "info");
                            }}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="admin_panel_settings" size={18} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                  <Td colSpan={2}>Total {filtered.length} karyawan terfilter</Td>
                  <Td align="right" className="font-mono">{rupiah(filtered.reduce((s, e) => s + e.basic, 0))}</Td>
                  <Td align="right" className="font-mono">{rupiah(filtered.reduce((s, e) => s + e.allowance, 0))}</Td>
                  <Td align="center" className="font-label-sm text-label-sm">H/I/A</Td>
                  <Td align="right" className="font-mono">{rupiah(filtered.reduce((s, e) => s + e.basic + e.allowance - potonganOf(e), 0))}</Td>
                  <Td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="history" title="Riwayat Payroll" subtitle="Batch pembayaran gaji yang telah dieksekusi" />
            <div className="flex flex-col divide-y divide-surface-container">
              {app.payrollRuns.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-space-sm first:pt-0">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-primary">{r.period}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {r.headcount} karyawan • {d(parseISO(r.date))}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono font-semibold text-primary">
                      {rupiah(r.net || r.gross * 0.895 || 0)}
                    </span>
                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="donut_small" title="Distribusi Beban Gaji per Divisi" subtitle="Total bruto tiap divisi bulan berjalan" />
            <div className="flex flex-col gap-space-md">
              {byDivision.map(([div, amount]) => (
                <div key={div} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-label-md text-label-md text-on-surface">{div}</span>
                    <span className="font-mono font-bold text-primary">{rupiahShort(amount)}</span>
                  </div>
                  <ProgressBar value={pct(amount, totals.gross)} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Rasio payroll terhadap revenue periode</span>
              <span className="font-label-lg text-label-lg text-primary">
                {pct(totals.gross, app.kpi.invoiceTotal || 1).toFixed(1)}%
              </span>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md bg-primary p-space-md text-on-primary sm:p-space-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">Payroll Berikutnya</span>
                <p className="mt-1 font-headline-md text-headline-md">{monthLabel(TODAY())}</p>
                <p className="font-body-sm text-body-sm text-primary-fixed-dim">Jadwal bayar 28 {monthLabel(TODAY())}</p>
              </div>
              <Icon name="calendar_month" size={26} className="text-secondary-container" />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary-container px-space-sm py-2">
              <span className="font-body-sm text-body-sm">Estimasi netto</span>
              <span className="font-label-lg text-label-lg text-secondary-fixed">{rupiah(totals.net)}</span>
            </div>
            <Button variant="amber" icon="play_circle" disabled={!canPayroll} onClick={() => setPayrollOpen(true)}>
              Jalankan Payroll Sekarang
            </Button>
          </Card>
        </div>
      </div>

      {payrollOpen && (
        <PayrollModal
          onClose={() => setPayrollOpen(false)}
          onRun={(period, accountId, extra) => {
            app.runPayroll(period, accountId);
            app.toast("Rekap absensi diperbarui", `${extra} karyawan masuk batch payroll`, "info");
            setPayrollOpen(false);
          }}
          totals={totals}
        />
      )}

      <Modal
        open={!!payslip}
        onClose={() => setPayslip(null)}
        title={payslip ? `Slip Gaji — ${payslip.name}` : ""}
        subtitle={payslip ? `${payslip.role} • ${payslip.division} • periode ${monthLabel(TODAY())}` : ""}
        footer={
          payslip && (
            <>
              <Button variant="outline" onClick={() => setPayslip(null)}>
                Tutup
              </Button>
              <Button
                icon="print"
                onClick={() =>
                  printPayslip(monthLabel(TODAY()), payslip, {
                    potongan: potonganOf(payslip),
                    net: payslip.basic + payslip.allowance - potonganOf(payslip),
                  })
                }
              >
                Cetak Slip Gaji
              </Button>
            </>
          )
        }
      >
        {payslip && (
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-md text-label-md text-on-surface">Gaji Pokok</span>
              <span className="font-mono text-primary">{rupiah(payslip.basic)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-md text-label-md text-on-surface">Tunjangan operasional</span>
              <span className="font-mono text-primary">{rupiah(payslip.allowance)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-md text-label-md text-on-surface">Potongan BPJS &amp; PPh 21 (8,5%)</span>
              <span className="font-mono text-error">- {rupiah(Math.round((payslip.basic + payslip.allowance) * 0.085))}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-md text-label-md text-on-surface">Potongan absensi ({payslip.alpha} alpha × Rp 250.000)</span>
              <span className="font-mono text-error">- {rupiah(payslip.alpha * 250_000)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary px-space-sm py-2 text-on-primary">
              <span className="font-label-lg text-label-lg">Take Home Pay</span>
              <span className="font-headline-sm text-headline-sm">{rupiah(payslip.basic + payslip.allowance - potonganOf(payslip))}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill tone="outline">Hadir {payslip.hadir} hari</Pill>
              <Pill tone="outline">Izin {payslip.izin} hari</Pill>
              <Pill tone="outline">Bank {payslip.bank}</Pill>
            </div>
          </div>
        )}
      </Modal>
    </PageBody>
  );
}

function PayrollModal({
  onClose,
  onRun,
  totals,
}: {
  onClose: () => void;
  onRun: (period: string, accountId: string, extra: string) => void;
  totals: { gross: number; potongan: number; net: number; headcount: number };
}) {
  const app = useApp();
  const [period, setPeriod] = useState(monthLabel(TODAY()));
  const [accountId, setAccountId] = useState("A-001");

  return (
    <Modal
      open
      onClose={onClose}
      title="Jalankan Payroll Batch"
      subtitle="Sistem menghitung gaji bruto, potongan, dan transfer bersih ke rekening payroll karyawan"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button icon="play_circle" onClick={() => onRun(period, accountId, String(totals.headcount))}>
            Proses Payroll
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Periode Payroll">
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
        <Field label="Rekening Sumber Dana" hint={`Saldo ${rupiahShort(app.accountBalance(accountId))}`}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-space-md grid grid-cols-3 gap-space-sm">
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Bruto</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiahShort(totals.gross)}</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Potongan</span>
          <p className="font-label-lg text-label-lg text-error tabular">{rupiahShort(totals.potongan)}</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Netto</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiahShort(totals.net)}</p>
        </div>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-xl bg-secondary-fixed px-space-sm py-2 text-on-secondary-fixed">
        <span className="font-body-sm text-body-sm">{totals.headcount} karyawan • dijadwalkan {iso(TODAY())}</span>
        <Pill tone="amberSoft">Menunggu persetujuan</Pill>
      </div>
    </Modal>
  );
}

