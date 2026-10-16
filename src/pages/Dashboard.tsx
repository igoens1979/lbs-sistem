import { Link } from "@/components/Link";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { BarPairs, Button, Card, Donut, EmptyState, HEX, Icon, Pill, ProgressBar, SectionHeading, StatusPill, Td, Th } from "@/components/ui";
import { commodityName, vehiclePlate } from "@/lib/data";
import { addDays, csvDownload, d, daysBetween, num, parseISO, pct, rupiah, rupiahShort } from "@/lib/format";
import { useApp } from "@/lib/store";
import { cn, iso } from "@/lib/format";

export default function Dashboard() {
  const app = useApp();
  const kpi = app.kpi;

  // Perbandingan dengan periode sebelumnya (durasi sama)
  const periodDays = Math.max(1, daysBetween(parseISO(app.period.from), parseISO(app.period.to)) + 1);
  const prevTo = iso(addDays(parseISO(app.period.from), -1));
  const prevFrom = iso(addDays(parseISO(app.period.from), -periodDays));
  const prevSJ = app.sj.filter((r) => r.date >= prevFrom && r.date <= prevTo && r.status !== "Batal");
  const prevKpi = {
    sj: prevSJ.length,
    invoiced: prevSJ.filter((r) => r.invoiceId).length,
    invoiceTotal: app.invoices.filter((i) => i.date >= prevFrom && i.date <= prevTo).reduce((s, i) => s + i.total, 0),
  };
  const delta = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : 0);
  const accounts = app.accountsWithBalance;
  const liquidity = accounts.reduce((s, a) => s + a.balance, 0);
  const totalMasuk = accounts.reduce((s, a) => s + a.masuk, 0);
  const totalKeluar = accounts.reduce((s, a) => s + a.keluar, 0);
  const totalOpening = accounts.reduce((s, a) => s + a.opening, 0);
  const outstanding = app.outstandingTotal;
  const ritase = app.ritaseToday;
  const fuel = app.fuelStock;

  // Rekap kinerja keuangan bulanan (untuk widget Laba Rugi ringkas)
  const monthStats = Array.from({ length: 3 }, (_, i) => {
    const m = new Date(2026, 9 - (2 - i), 1);
    const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const tx = app.bankTx.filter((t) => t.date.startsWith(ym));
    const payroll = app.payrollRuns.filter((x) => x.date.startsWith(ym)).reduce((s, x) => s + x.net, 0);
    const bbm = app.fuelLogs.filter((f) => f.date.startsWith(ym)).reduce((s, f) => s + f.liter * f.pricePerLiter, 0);
    const masuk = tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const keluar = tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    return { label: m.toLocaleDateString("id-ID", { month: "short" }).replace(".", ""), masuk, keluar, net: masuk - keluar, beban: payroll + bbm };
  });
  const pendapatanPeriode = app.invoices.filter((i) => i.date >= app.period.from && i.date <= app.period.to).reduce((s, i) => s + i.dpp, 0);

  const topCustomers = app.customers
    .map((c) => {
      const rows = app.sj.filter((r) => r.customerId === c.id && r.date >= app.period.from && r.date <= app.period.to && r.status !== "Batal");
      const revenue = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
      const due = app.invoices.filter((i) => i.customerId === c.id).reduce((s, i) => s + app.outstandingOf(i), 0);
      return { c, revenue, trips: rows.reduce((s, r) => s + r.trips, 0), due };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = Math.max(...topCustomers.map((t) => t.revenue), 1);

  const feed = [
    ...app.sj.filter((r) => r.status !== "Batal").slice(0, 6).map((r) => ({
      id: r.id,
      date: r.date,
      icon: "local_shipping",
      title: `Surat jalan ${r.no}`,
      detail: `${app.customers.find((c) => c.id === r.customerId)?.name} • ${r.volume} m³ ${commodityName(r.commodityId)}`,
      amount: r.volume * r.trips * r.price,
      route: "surat-jalan" as const,
    })),
    ...app.invoices.slice(0, 5).map((i) => ({
      id: i.id,
      date: i.date,
      icon: "receipt_long",
      title: `Invoice ${i.no}`,
      detail: `${app.customers.find((c) => c.id === i.customerId)?.name} • jatuh tempo ${d(parseISO(i.dueDate))}`,
      amount: i.total,
      route: "invoice" as const,
    })),
    ...app.payments.slice(-3).map((p) => ({
      id: p.id,
      date: p.date,
      icon: "payments",
      title: `Pembayaran diterima`,
      detail: `${app.invoices.find((i) => i.id === p.invoiceId)?.no} • ${p.method}`,
      amount: p.amount,
      route: "kas-bank" as const,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const chartData = app.cashFlowDaily.slice(-12).map((c) => ({ label: c.date.slice(8), a: c.in, b: c.out }));
  const agingTotal = app.aging.reduce((s, a) => s + a.amount, 0) || 1;

  return (
    <PageBody>
      <PageHeader
        eyebrow="Konsolidasi Finansial, CRM & Armada"
        title="Dashboard Keuangan & Operasional"
        description="Ringkasan posisi kas, piutang invoice, pipeline CRM, operasional dump truck, dan status neraca kewajiban berjalan."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("matriks-arus-kas-lbs.csv", [
                ["Rekening / Akun", "Saldo Awal", "Masuk", "Keluar", "Saldo Akhir", "Status"],
                ...accounts.map((a) => [a.name, a.opening, a.masuk, a.keluar, a.balance, a.type === "Kas" ? "AUDIT FISIK" : "REKONSIL"]),
                ["TOTAL AKUMULASI LIKUIDITAS", totalOpening, totalMasuk, totalKeluar, liquidity, "BALANCE"],
              ])
            }
            onPrint={() => window.print()}
          />
        }
      />

      {/* ---------------- KPI Tier 1 : siklus penagihan & volume muatan ---------------- */}
      <section className="flex flex-col gap-space-sm">
        <SectionHeading
          icon="fact_check"
          title="Siklus Penagihan & Volume Muatan"
          subtitle={`Periode ${d(parseISO(app.period.from))} s/d ${d(parseISO(app.period.to))} · ${num(kpi.volume)} m³ terkirim`}
          right={
            <Link onClick={() => app.go("surat-jalan")} className="inline-flex items-center gap-1 font-label-sm text-label-sm font-bold text-primary hover:underline">
              Kelola Surat Jalan <Icon name="arrow_forward" size={14} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            top="bg-primary"
            label="Total Surat Jalan"
            value={num(kpi.sjCount)}
            unit="SJ"
            icon="local_shipping"
            iconClass="bg-primary-fixed text-primary"
            footLabel="Periode Berjalan"
            footValue={`${ritase.vehiclesActive} Unit Aktif`}
            delta={{ value: delta(kpi.sjCount, prevKpi.sj), label: "vs periode sebelumnya" }}
          />
          <KpiTile
            top="bg-primary-container"
            label="Sudah Diinvoice"
            value={num(kpi.sjInvoiced)}
            unit="SJ"
            icon="task_alt"
            iconClass="bg-surface-container text-primary-container"
            footLabel="Rasio Penerbitan"
            footValue={`${pct(kpi.sjInvoiced, kpi.sjCount).toFixed(1)}%`}
            dot="bg-primary-container"
            delta={{ value: delta(kpi.sjInvoiced, prevKpi.invoiced), label: "penerbitan invoice" }}
          />
          <KpiTile
            top="bg-secondary-container"
            label="Belum Invoice"
            value={num(kpi.sjPending)}
            unit="SJ"
            icon="pending_actions"
            iconClass="bg-secondary-fixed text-on-secondary-fixed"
            footLabel="Kesiapan Timbang"
            footValue={<Pill tone="amberSoft">Perlu Penagihan</Pill>}
            delta={{ value: delta(kpi.sjPending, Math.max(0, prevKpi.sj - prevKpi.invoiced)), label: "dokumen menunggu faktur", invert: true }}
          />
          <KpiTile
            top="bg-primary"
            label="Total Tagihan Invoice"
            value={rupiah(kpi.invoiceTotal)}
            valueClass="text-headline-lg"
            icon="receipt"
            iconClass="bg-primary text-on-primary"
            footLabel="Status Faktur"
            footValue={`${kpi.invoiceCount} Invoice Aktif`}
            delta={{ value: delta(kpi.invoiceTotal, prevKpi.invoiceTotal), label: "vs periode sebelumnya" }}
          />
        </div>
      </section>

      {/* ---------------- Treasury, likuiditas & neraca terbuka ---------------- */}
      <section className="flex flex-col gap-space-sm">
        <SectionHeading icon="account_balance" title="Posisi Kas, Bank & Neraca Terbuka" subtitle="Saldo diperbarui otomatis dari mutasi bank dan kas lapangan" />
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{a.name}</span>
                  <h3 className="mt-1 font-headline-md text-headline-md font-bold text-primary tabular">{rupiah(a.balance)}</h3>
                </div>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", a.type === "Kas" ? "bg-surface-container text-primary" : "bg-primary-fixed text-primary")}>
                  <Icon name={a.type === "Kas" ? "payments" : "account_balance"} size={18} />
                </div>
              </div>
              <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm">
                <span className="font-mono text-on-surface-variant">Rek: {a.accountNo}</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">{a.role}</span>
              </div>
              <div className="mt-space-sm flex items-center justify-between gap-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Mutasi {a.txCount} transaksi</span>
                <span className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-primary tabular">+{rupiahShort(a.masuk)}</span>
                  <span className="font-label-sm text-label-sm text-error tabular">-{rupiahShort(a.keluar)}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Piutang Aktif</span>
                <h3 className="mt-1 font-headline-md text-headline-md font-bold text-primary tabular">{rupiah(outstanding)}</h3>
              </div>
              <Pill tone="neutral">Outstanding</Pill>
            </div>
            <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-1.5">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Total {app.aging.reduce((s, a) => s + a.count, 0)} invoice beredar</span>
              <span className="font-label-sm text-label-sm font-bold text-primary">{new Set(app.invoices.filter((i) => app.outstandingOf(i) > 0).map((i) => i.customerId)).size} Mitra Utama</span>
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Hutang Supplier</span>
                <h3 className="mt-1 font-headline-md text-headline-md font-bold text-primary tabular">{rupiah(app.supplierDebtTotal)}</h3>
              </div>
              <Pill tone="neutral">Lancar</Pill>
            </div>
            <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-1.5">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Jatuh tempo rata-rata 14 hari</span>
              <span className="font-label-sm text-label-sm font-bold text-primary">Sparepart &amp; Solar</span>
            </div>
          </Card>
          <Card className="flex flex-col justify-between bg-secondary-fixed text-on-secondary-fixed">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Icon name="history_edu" size={16} className="text-secondary" />
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">Kewajiban Historis</span>
                </div>
                <h3 className="mt-1 font-headline-md text-headline-md font-bold text-secondary tabular">{rupiah(app.legacyTotal)}</h3>
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-secondary p-1.5 text-on-secondary shadow-sm">
                <Icon name="warning" size={18} />
              </div>
            </div>
            <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-lowest/80 px-space-sm py-1.5 backdrop-blur-sm">
              <span className="font-body-sm text-body-sm font-medium text-on-surface">Sisa outstanding {rupiahShort(app.legacyOutstandingTotal)}</span>
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">Aktif Terjadwal</span>
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------- Matriks arus kas + aging + ritase ---------------- */}
      <section className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <div className="flex flex-col gap-space-lg lg:col-span-7">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <div className="flex flex-col justify-between gap-space-xs sm:flex-row sm:items-center">
              <div>
                <h3 className="font-headline-md text-headline-md text-primary">Matriks Arus Kas Berjalan per Rekening</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Laporan mutasi debit/kredit perbankan dan kas operasional lapangan</p>
              </div>
              <Button variant="ghost" size="sm" icon="arrow_forward" onClick={() => app.go("kas-bank")} className="self-start sm:self-auto">
                Detail Mutasi
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg bg-surface-container-low">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <Th>Rekening / Akun</Th>
                    <Th align="right">Saldo Awal</Th>
                    <Th align="right">Masuk (+)</Th>
                    <Th align="right">Keluar (-)</Th>
                    <Th align="right">Saldo Akhir</Th>
                    <Th align="center">Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
                  {accounts.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-container-lowest/60">
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md font-semibold text-primary">{a.name}</span>
                          <span className="text-[11px] text-on-surface-variant">{a.role}</span>
                        </div>
                      </Td>
                      <Td align="right" className="font-mono">{rupiah(a.opening)}</Td>
                      <Td align="right" className="font-mono font-semibold text-primary">{rupiah(a.masuk)}</Td>
                      <Td align="right" className="font-mono text-error">{rupiah(a.keluar)}</Td>
                      <Td align="right" className="font-mono font-bold text-primary">{rupiah(a.balance)}</Td>
                      <Td align="center">
                        <Pill tone={a.type === "Kas" ? "amberSoft" : "neutral"}>{a.type === "Kas" ? "Audit Fisik" : "Rekonsil"}</Pill>
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                    <Td>Total Akumulasi Likuiditas</Td>
                    <Td align="right" className="font-mono">{rupiah(totalOpening)}</Td>
                    <Td align="right" className="font-mono">{rupiah(totalMasuk)}</Td>
                    <Td align="right" className="font-mono text-error">{rupiah(totalKeluar)}</Td>
                    <Td align="right" className="font-mono text-primary">{rupiah(liquidity)}</Td>
                    <Td align="center" className="font-label-sm text-label-sm">Balance</Td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low px-space-sm py-2">
              <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-primary" /> Kas masuk
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-secondary-container" /> Kas keluar
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Net arus kas periode: <b className="text-primary">{rupiah(totalMasuk - totalKeluar)}</b></span>
            </div>
            <BarPairs data={chartData} />
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="groups" title="Konsentrasi Revenue per Pelanggan" subtitle="Nilai muatan periode berjalan & piutang beredar" />
            <div className="flex flex-col gap-space-md">
              {topCustomers.map((t) => (
                <div key={t.c.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">
                        {t.c.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                      </span>
                      <span className="font-label-md text-label-md text-on-surface">{t.c.name}</span>
                      <Pill tone="outline">{t.trips} rit</Pill>
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {rupiah(t.revenue)} {t.due > 0 && <span className="font-body-sm font-normal text-secondary">• piutang {rupiahShort(t.due)}</span>}
                    </span>
                  </div>
                  <ProgressBar value={(t.revenue / maxRevenue) * 100} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => app.go("hutang-piutang")}
              className="inline-flex items-center gap-1 self-start font-label-sm text-label-sm font-bold text-primary hover:underline"
            >
              Buka modul Hutang Piutang <Icon name="chevron_right" size={14} />
            </button>
          </Card>
        </div>

        <div className="flex flex-col gap-space-lg lg:col-span-5">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md text-primary">Analisis Umur Tagihan (Aging)</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Profil jatuh tempo piutang beredar &amp; kewajiban</p>
              </div>
              <span className="rounded-lg bg-surface-container p-1.5 text-primary">
                <Icon name="donut_large" size={20} />
              </span>
            </div>
            <div className="flex flex-col items-center gap-space-md sm:flex-row">
              <Donut
                segments={app.aging.map((a) => ({ value: a.amount, color: a.key === "notdue" ? HEX.primary : a.key === "b1" ? HEX.primaryContainer : a.key === "b2" ? HEX.secondaryContainer : HEX.error, label: a.label }))}
                center={
                  <>
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Outstanding</span>
                    <span className="font-headline-sm text-headline-sm text-primary">{rupiahShort(outstanding)}</span>
                  </>
                }
              />
              <div className="flex w-full flex-col gap-space-sm">
                {app.aging.map((a) => (
                  <div key={a.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-body-sm">
                      <span className="flex items-center gap-2">
                        <span className={cn("h-3 w-3 rounded-sm", a.tone)} />
                        <span className="font-label-md text-label-md text-on-surface">{a.label}</span>
                      </span>
                      <span className={cn("font-mono font-bold", a.key === "b3" ? "text-error" : a.key === "b2" ? "text-secondary" : "text-primary")}>
                        {rupiah(a.amount)} ({pct(a.amount, agingTotal).toFixed(0)}%)
                      </span>
                    </div>
                    <ProgressBar value={pct(a.amount, agingTotal)} tone={a.tone} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-5">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="min-w-0">
                <h3 className="font-headline-md text-headline-md text-primary">Ritase Dump Truck Hari Ini</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Site Golo Mori</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-numeric-metric text-headline-lg text-primary tabular">{num(ritase.trips)} <span className="font-label-md text-label-md font-normal text-on-surface-variant">Rit</span></span>
                <div className="text-[11px] font-semibold text-secondary">Volume: {num(ritase.volume)} m³</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-space-sm pt-space-xs sm:grid-cols-3 lg:grid-cols-4">
              {ritase.byCommodity.length === 0 && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                  <EmptyState icon="local_shipping" title="Belum ada ritase hari ini" detail="Surat jalan baru akan otomatis muncul pada widget ini." />
                </div>
              )}
              {ritase.byCommodity.map((c) => (
                <div key={c.name} className="flex flex-col rounded-lg bg-surface-container-low p-space-sm">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Komoditas {c.name}</span>
                  <span className="mt-1 font-headline-sm text-headline-sm text-primary">{c.trips} Ritase</span>
                  <span className="mt-0.5 font-label-sm text-[11px] text-on-surface-variant">
                    {num(c.volume)} m³ • {c.units} Unit Dump
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-space-sm flex items-center justify-between pt-space-xs font-body-sm">
              <Link onClick={() => app.go("surat-jalan")} className="inline-flex items-center gap-0.5 font-label-sm text-label-sm font-bold text-primary hover:underline">
                Buka Surat Jalan <Icon name="chevron_right" size={14} />
              </Link>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {ritase.vehiclesActive} unit aktif • {app.vehicles[0]?.id ? vehiclePlate(app.vehicles[0].id) : "-"} sebagai lead unit
              </span>
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------- Widget operasional & CRM ---------------- */}
      <section className="grid grid-cols-1 items-stretch gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-4">
          <SectionHeading
            icon="summarize"
            title="Rekap Laba Rugi & Arus Kas"
            subtitle="Pratinjau bulanan menuju modul Rekap Keuangan"
            right={
              <Button variant="ghost" size="sm" icon="arrow_forward" onClick={() => app.go("rekap-keuangan")}>
                Detail
              </Button>
            }
          />
          <div className="flex items-center justify-between rounded-lg bg-primary p-space-sm text-on-primary">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">Pendapatan periode (DPP)</span>
              <p className="font-headline-md text-headline-md tabular">{rupiahShort(pendapatanPeriode)}</p>
            </div>
            <Icon name="account_balance" size={26} className="text-secondary-container" />
          </div>
          <div className="flex flex-col gap-space-sm">
            {monthStats.map((m) => (
              <div key={m.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-body-sm">
                  <span className="font-label-md text-label-md text-on-surface">{m.label} — beban ops. {rupiahShort(m.beban)}</span>
                  <span className={cn("font-mono font-bold", m.net >= 0 ? "text-primary" : "text-error")}>Net {rupiahShort(m.net)}</span>
                </div>
                <ProgressBar value={Math.min(100, (m.masuk / Math.max(...monthStats.map((x) => x.masuk), 1)) * 100)} height="h-1.5" />
              </div>
            ))}
          </div>
          <Button variant="secondary" icon="summarize" onClick={() => app.go("rekap-keuangan")}>
            Buka Rekap Keuangan
          </Button>
        </Card>

        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-4">
          <SectionHeading icon="local_gas_station" title="Stok Solar Site & Armada" subtitle="Konsumsi solar mengikuti ritase surat jalan" />
          <div className="flex items-end justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tersisa di tangki</span>
              <p className="font-numeric-metric text-primary tabular">{num(fuel.liter)} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">liter</span></p>
            </div>
            <Pill tone={fuel.liter < 5000 ? "error" : "success"}>{pct(fuel.liter, fuel.capacity).toFixed(0)}% kapasitas</Pill>
          </div>
          <ProgressBar value={pct(fuel.liter, fuel.capacity)} tone={fuel.liter < 6000 ? "bg-error" : "bg-secondary-container"} height="h-3" />
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Konsumsi periode</span>
              <p className="font-headline-sm text-headline-sm text-primary">{num(fuel.consumption)} L</p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Nilai stok tangki</span>
              <p className="font-headline-sm text-headline-sm text-primary">{rupiahShort(fuel.value)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-space-sm">
            <Button variant="secondary" size="sm" icon="add_circle" onClick={() => app.go("bbm")}>
              Catat Pembelian
            </Button>
            <Button variant="ghost" size="sm" icon="build_circle" onClick={() => app.go("bbm")}>
              Pemeliharaan
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2 font-body-sm text-body-sm text-on-surface-variant">
            <span>{app.vehicles.filter((v) => v.status === "Servis").length} unit masuk bengkel</span>
            <span>{app.vehicles.filter((v) => v.type === "Dump Truck").length} dump truck terdaftar</span>
          </div>
        </Card>

        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-4">
          <SectionHeading icon="history" title="Aktivitas Terbaru Sistem" subtitle="Audit trail transaksi lintas modul" />
          <div className="flex flex-col divide-y divide-surface-container">
            {feed.map((f) => (
              <button
                key={`${f.id}-${f.title}`}
                type="button"
                onClick={() => app.go(f.route)}
                className="flex items-start gap-space-sm py-space-sm text-left first:pt-0 hover:opacity-80"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <Icon name={f.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-label-md text-label-md text-on-surface">{f.title}</span>
                    <span className="shrink-0 font-mono font-semibold text-primary">{rupiahShort(f.amount)}</span>
                  </span>
                  <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{f.detail}</span>
                  <span className="font-label-sm text-[10px] uppercase text-outline">{d(parseISO(f.date))}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary-fixed px-space-sm py-2 text-on-secondary-fixed">
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">Pengingat penagihan</span>
            <StatusPill status={`${app.aging[3].count} kritis > 60 hari`} />
          </div>
        </Card>
      </section>
    </PageBody>
  );
}

function KpiTile({
  top,
  label,
  value,
  unit,
  icon,
  iconClass,
  footLabel,
  footValue,
  dot,
  valueClass = "text-numeric-metric",
  delta,
}: {
  top: string;
  label: string;
  value: string;
  unit?: string;
  icon: string;
  iconClass: string;
  footLabel: string;
  footValue: React.ReactNode;
  dot?: string;
  valueClass?: string;
  delta?: { value: number; label: string; invert?: boolean };
}) {
  return (
    <Card accentTop={top} className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
          <span className={cn("mt-1 font-bold text-primary tabular", valueClass)}>
            {value} {unit && <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">{unit}</span>}
          </span>
          {delta && (
            <span
              className={cn(
                "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 font-label-sm text-[10px]",
                (delta.invert ? delta.value <= 0 : delta.value >= 0) ? "bg-success-container text-success" : "bg-error-container text-error",
              )}
            >
              <Icon name={delta.value >= 0 ? "trending_up" : "trending_down"} size={12} />
              {Math.abs(delta.value).toFixed(1)}% {delta.label}
            </span>
          )}
        </div>
        <div className={cn("rounded-lg p-2", iconClass)}>
          <Icon name={icon} size={22} />
        </div>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-1.5">
        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
          {footLabel}
        </span>
        {typeof footValue === "string" ? <span className="font-label-sm text-label-sm font-bold text-primary">{footValue}</span> : footValue}
      </div>
    </Card>
  );
}
