import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { BarPairs, Button, Card, Icon, Pill, ProgressBar, SectionHeading, Td, Th } from "@/components/ui";
import { commodityName } from "@/lib/data";
import { cn, csvDownload, d, monthLabel, num, parseISO, pct, rupiah, rupiahPlain, rupiahShort, TODAY } from "@/lib/format";
import { printRekapKeuangan } from "@/lib/print";
import { useApp } from "@/lib/store";

const BULAN = 6;

export default function RekapKeuangan() {
  const app = useApp();
  const { from, to } = app.period;

  /* ---------- Rekap per bulan (6 bulan terakhir s.d. periode berjalan) ---------- */
  const start = new Date(2026, 8, 1);
  const now = new Date(TODAY().getFullYear(), TODAY().getMonth(), 1);
  const monthCount = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  const months = Array.from({ length: Math.max(1, monthCount) }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
  const monthly = months.map((m) => {
    const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const invoices = app.invoices.filter((i) => i.date.startsWith(ym));
    const tx = app.bankTx.filter((t) => t.date.startsWith(ym));
    const payroll = 0;
    const bbm = app.fuelLogs.filter((f) => f.date.startsWith(ym)).reduce((s, f) => s + f.liter * f.pricePerLiter, 0);
    const masuk = tx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const keluar = tx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    const dpp = invoices.reduce((s, i) => s + i.dpp, 0);
    return {
      label: m.toLocaleDateString("id-ID", { month: "short" }).replace(".", ""),
      full: monthLabel(m),
      ym,
      invoiceCount: invoices.length,
      dpp,
      ppn: invoices.reduce((s, i) => s + i.ppn, 0),
      masuk,
      keluar,
      payroll,
      bbm,
      net: masuk - keluar,
      margin: dpp - payroll - bbm,
    };
  }).filter((m) => m.invoiceCount > 0 || m.masuk > 0 || m.keluar > 0).slice(-5);

  /* ---------- Periode berjalan ---------- */
  const periodInvoices = app.invoices.filter((i) => i.date >= from && i.date <= to);
  const periodTx = app.bankTx.filter((t) => t.date >= from && t.date <= to);
  const masuk = periodTx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const keluar = periodTx.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
  const pendapatan = periodInvoices.reduce((s, i) => s + i.dpp, 0);
  const ppnKeluaran = periodInvoices.reduce((s, i) => s + i.ppn, 0);
  const payrollPeriod = 0;
  const bbmPeriod = app.fuelLogs.filter((f) => f.date >= from && f.date <= to).reduce((s, f) => s + f.liter * f.pricePerLiter, 0);
  const operasionalPeriod = app.bankTx.filter((t) => t.date >= from && t.date <= to && t.direction === "out" && t.category !== "Internal Transfer").reduce((s, t) => s + t.amount, 0);
  const laba = pendapatan - (payrollPeriod + bbmPeriod + operasionalPeriod);

  /* ---------- Rincian kas keluar & masuk per kategori ---------- */
  const byCategory = (dir: "in" | "out") => {
    const map = new Map<string, number>();
    periodTx.filter((t) => t.direction === dir).forEach((t) => map.set(t.category ?? "Lainnya", (map.get(t.category ?? "Lainnya") ?? 0) + t.amount));
    return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };
  const biaya = byCategory("out");
  const penerimaan = byCategory("in");
  const biayaTotal = biaya.reduce((s, b) => s + b.amount, 0) || 1;

  /* ---------- Kontribusi revenue ---------- */
  const perKomoditasRaw = app.commodities
    .map((c) => {
      const rows = app.sj.filter((r) => r.commodityId === c.id && r.date >= from && r.date <= to && r.status !== "Batal");
      return { name: /free/i.test(c.name) ? "Material Free" : c.name, unit: c.unit, trips: rows.reduce((s, r) => s + r.trips, 0), volume: rows.reduce((s, r) => s + r.volume * r.trips, 0), revenue: rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0) };
    })
    .filter((k) => k.revenue > 0 || k.trips > 0);
  const perKomoditasMap = new Map<string, { name: string; unit: string; trips: number; volume: number; revenue: number }>();
  perKomoditasRaw.forEach((k) => {
    const cur = perKomoditasMap.get(k.name) ?? { name: k.name, unit: k.unit, trips: 0, volume: 0, revenue: 0 };
    cur.trips += k.trips;
    cur.volume += k.volume;
    cur.revenue += k.revenue;
    perKomoditasMap.set(k.name, cur);
  });
  const perKomoditas = [...perKomoditasMap.values()].filter((k) => k.revenue > 0 && !/free/i.test(k.name)).sort((a, b) => b.revenue - a.revenue);
  const perPelanggan = app.customers
    .map((c) => {
      const rows = app.sj.filter((r) => r.customerId === c.id && r.date >= from && r.date <= to && r.status !== "Batal");
      return { c, revenue: rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0), trips: rows.reduce((s, r) => s + r.trips, 0) };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const chart = monthly.map((m) => ({ label: m.label, a: m.masuk, b: m.keluar }));
  const totalMasuk6 = monthly.reduce((s, m) => s + m.masuk, 0);
  const totalKeluar6 = monthly.reduce((s, m) => s + m.keluar, 0);
  const best = [...monthly].sort((a, b) => b.net - a.net)[0];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Rekapitulasi Finansial"
        title="Rekap Keuangan: Laba Rugi & Arus Kas"
        description="Rekapitulasi pendapatan hauling, pendapatan jasa, biaya operasional armada, payroll, serta posisi laba dan arus kas per bulan."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("rekap-keuangan-lbs.csv", [
                ["Bulan", "Jumlah Invoice", "Pendapatan (DPP)", "PPN Keluaran", "Kas Masuk", "Kas Keluar", "Payroll", "BBM & Solar", "Net Kas", "Laba Operasional"],
                ...monthly.map((m) => [m.full, m.invoiceCount, m.dpp, m.ppn, m.masuk, m.keluar, m.payroll, m.bbm, m.net, m.margin]),
                ["TOTAL", monthly.reduce((s, m) => s + m.invoiceCount, 0), monthly.reduce((s, m) => s + m.dpp, 0), monthly.reduce((s, m) => s + m.ppn, 0), totalMasuk6, totalKeluar6, monthly.reduce((s, m) => s + m.payroll, 0), monthly.reduce((s, m) => s + m.bbm, 0), totalMasuk6 - totalKeluar6, monthly.reduce((s, m) => s + m.margin, 0)],
              ])
            }
            onPrint={() =>
              printRekapKeuangan(
                monthly.map((m) => ({ label: m.full, dpp: m.dpp, ppn: m.ppn, masuk: m.masuk, keluar: m.keluar, net: m.net, payroll: m.payroll, bbm: m.bbm, laba: m.margin })),
                { pendapatan, ppnKeluaran, payroll: payrollPeriod, bbm: bbmPeriod, laba, masuk, keluar },
                app.period,
              )
            }
          />
        }
      />

      {/* Ringkasan periode berjalan */}
      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <RecapTile top="bg-primary" label="Pendapatan Periode" value={rupiah(pendapatan)} foot={`${periodInvoices.length} invoice • DPP tidak termasuk PPN`} icon="trending_up" />
        <RecapTile top="bg-primary-container" label="PPN Keluaran" value={rupiah(ppnKeluaran)} foot="11% dari dasar pengenaan pajak" icon="receipt" />
        <RecapTile top="bg-secondary-container" label="Biaya Operasional + Payroll" value={rupiah(payrollPeriod + bbmPeriod + operasionalPeriod)} foot={`Payroll ${rupiahShort(payrollPeriod)} • BBM ${rupiahShort(bbmPeriod)} • Operasional ${rupiahShort(operasionalPeriod)}`} icon="payments" />
        <RecapTile top="bg-primary" label="Laba Operasional" value={rupiah(laba)} foot={`Margin ${pct(laba, pendapatan || 1).toFixed(1)}% dari pendapatan`} icon="savings" />
        <RecapTile top="bg-secondary-fixed-dim" label="Arus Kas Bersih" value={rupiah(masuk - keluar)} foot={`Masuk ${rupiahShort(masuk)} • keluar ${rupiahShort(keluar)}`} icon="swap_vert" />
      </section>

<div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-7">
          <SectionHeading
            icon="table_chart"
            title="Rekap Bulanan Konsolidasi"
            subtitle={`${BULAN} bulan terakhir — pendapatan, kas, biaya, dan laba operasional`}
            right={<Pill tone="amberSoft">Bulan terbaik: {best?.full}</Pill>}
          />
          <div className="max-h-72 overflow-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>Bulan</Th>
                  <Th align="right">Invoice</Th>
                  <Th align="right">Pendapatan (DPP)</Th>
                  <Th align="right">PPN</Th>
                  <Th align="right">Kas Masuk</Th>
                  <Th align="right">Kas Keluar</Th>
                  <Th align="right">Payroll</Th>
                  <Th align="right">BBM</Th>
                  <Th align="right">Net Kas</Th>
                  <Th align="right">Laba Ops.</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {monthly.map((m) => (
                  <tr key={m.ym} className={cn("transition-colors hover:bg-surface-container-lowest/60", m.ym === `${TODAY().getFullYear()}-${String(TODAY().getMonth() + 1).padStart(2, "0")}` && "bg-secondary-fixed/20")}>
                    <Td>
                      <span className="font-label-md text-label-md font-semibold text-primary">{m.full}</span>
                      <span className="block text-[11px] text-on-surface-variant">{m.invoiceCount} faktur terbit</span>
                    </Td>
                    <Td align="right" className="font-mono">{num(m.invoiceCount)}</Td>
<Td align="right" className="font-mono font-semibold text-primary">{rupiahPlain(m.dpp)}</Td>
                     <Td align="right" className="font-mono text-on-surface-variant">{rupiahPlain(m.ppn)}</Td>
                     <Td align="right" className="font-mono text-primary">{rupiahPlain(m.masuk)}</Td>
                     <Td align="right" className="font-mono text-error">{rupiahPlain(m.keluar)}</Td>
                     <Td align="right" className="font-mono">{rupiahPlain(m.payroll)}</Td>
                     <Td align="right" className="font-mono">{rupiahPlain(m.bbm)}</Td>
                     <Td align="right" className={cn("font-mono font-semibold", m.net >= 0 ? "text-primary" : "text-error")}>{rupiahPlain(m.net)}</Td>
                     <Td align="right" className={cn("font-mono font-semibold", m.margin >= 0 ? "text-success" : "text-error")}>{rupiahPlain(m.margin)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                  <Td>Total {BULAN} bulan</Td>
                  <Td align="right" className="font-mono">{num(monthly.reduce((s, m) => s + m.invoiceCount, 0))}</Td>
<Td align="right" className="font-mono">{rupiahPlain(monthly.reduce((s, m) => s + m.dpp, 0))}</Td>
                   <Td align="right" className="font-mono">{rupiahPlain(monthly.reduce((s, m) => s + m.ppn, 0))}</Td>
                   <Td align="right" className="font-mono">{rupiahPlain(totalMasuk6)}</Td>
                   <Td align="right" className="font-mono text-error">{rupiahPlain(totalKeluar6)}</Td>
                   <Td align="right" className="font-mono">{rupiahPlain(monthly.reduce((s, m) => s + m.payroll, 0))}</Td>
                   <Td align="right" className="font-mono">{rupiahPlain(monthly.reduce((s, m) => s + m.bbm, 0))}</Td>
                   <Td align="right" className="font-mono text-primary">{rupiahPlain(totalMasuk6 - totalKeluar6)}</Td>
                   <Td align="right" className="font-mono text-primary">{rupiahPlain(monthly.reduce((s, m) => s + m.margin, 0))}</Td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low px-space-sm py-2">
            <span className="flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary" /> Kas masuk</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-secondary-container" /> Kas keluar</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Rata-rata net kas bulanan <b className="text-primary">{rupiahShort((totalMasuk6 - totalKeluar6) / BULAN)}</b>
            </span>
          </div>
          <BarPairs data={chart} />
        </Card>

        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="trending_down" title="Rincian Kas Keluar per Kategori" subtitle={`Periode ${d(parseISO(from))} – ${d(parseISO(to))}`} />
            <div className="flex flex-col gap-space-md">
              {biaya.map((b) => (
                <div key={b.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-label-md text-label-md text-on-surface">{b.category}</span>
                    <span className="font-mono font-bold text-primary">
                      {rupiahShort(b.amount)} <span className="font-body-sm font-normal text-on-surface-variant">({pct(b.amount, biayaTotal).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <ProgressBar value={pct(b.amount, biayaTotal)} tone="bg-secondary-container" height="h-1.5" />
                </div>
              ))}
              {biaya.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Tidak ada pengeluaran pada periode ini.</p>}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total biaya</span>
              <span className="font-label-lg text-label-lg text-error tabular">{rupiah(keluar)}</span>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="trending_up" title="Rincian Penerimaan per Kategori" subtitle="Sumber dana masuk ke rekening & kas" />
            <div className="flex flex-col gap-space-md">
              {penerimaan.map((p) => (
                <div key={p.category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-label-md text-label-md text-on-surface">{p.category}</span>
                    <span className="font-mono font-bold text-primary">
                      {rupiahShort(p.amount)} <span className="font-body-sm font-normal text-on-surface-variant">({pct(p.amount, masuk || 1).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <ProgressBar value={pct(p.amount, masuk || 1)} height="h-1.5" />
                </div>
              ))}
              {penerimaan.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Tidak ada penerimaan pada periode ini.</p>}
            </div>
<div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total penerimaan</span>
              <span className="font-label-lg text-label-lg text-primary tabular">{rupiah(masuk)}</span>
            </div>
          </Card>
        </div>
      </div>

      <section className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-7">
          <SectionHeading icon="category" title="Kontribusi Pendapatan per Komoditas" subtitle="Volume, ritase, dan nilai muatan periode berjalan" />
          <div className="overflow-x-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>Komoditas</Th>
                  <Th align="right">Ritase</Th>
                  <Th align="right">Volume</Th>
                  <Th align="right">Nilai Muatan</Th>
                  <Th align="right">Porsi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {perKomoditas.map((k) => (
                  <tr key={k.name} className="transition-colors hover:bg-surface-container-lowest/60">
                    <Td>
                      <span className="font-label-md text-label-md font-semibold text-primary">{k.name}</span>
                      <div className="mt-1 w-28">
                        <ProgressBar value={pct(k.revenue, perKomoditas.reduce((s, x) => s + x.revenue, 0) || 1)} height="h-1" />
                      </div>
                    </Td>
                    <Td align="right" className="font-mono">{num(k.trips)}</Td>
                    <Td align="right" className="font-mono">{num(k.volume)} {k.unit}</Td>
                    <Td align="right" className="font-mono font-semibold text-primary">{rupiah(k.revenue)}</Td>
                    <Td align="right" className="font-mono text-on-surface-variant">{pct(k.revenue, perKomoditas.reduce((s, x) => s + x.revenue, 0) || 1).toFixed(1)}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-5">
          <SectionHeading
            icon="groups"
            title="Pendapatan Terbesar per Mitra"
            subtitle="Lima pelanggan dengan kontribusi tertinggi"
            right={
              <Button variant="ghost" size="sm" icon="balance" onClick={() => app.go("hutang-piutang")}>
                Hutang Piutang
              </Button>
            }
          />
          <div className="flex flex-col gap-space-md">
            {perPelanggan.map((p) => (
              <div key={p.c.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">
                      {p.c.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">{p.c.name}</span>
                    <Pill tone="outline">{p.trips} rit</Pill>
                  </span>
                  <span className="font-mono font-bold text-primary">{rupiah(p.revenue)}</span>
                </div>
                <ProgressBar value={(p.revenue / (perPelanggan[0]?.revenue || 1)) * 100} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low px-space-sm py-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Rasio biaya terhadap pendapatan</span>
            <span className="font-label-md text-label-md text-primary">{pct(payrollPeriod + bbmPeriod, pendapatan || 1).toFixed(1)}%</span>
          </div>
        </Card>
      </section>

      <Card className="flex flex-col gap-space-sm p-space-md sm:p-space-lg">
        <SectionHeading icon="info" title="Catatan Penyusunan Rekap" subtitle="Asumsi & sumber data yang dipakai modul ini" />
        <div className="grid grid-cols-1 gap-space-sm text-body-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "receipt_long", title: "Pendapatan", detail: "Nilai DPP seluruh invoice yang diterbitkan pada periode (PPN dikeluarkan terpisah)." },
            { icon: "account_balance_wallet", title: "Kas masuk & keluar", detail: "Agregasi mutasi rekening BCA, Mandiri, dan kas operasional lapangan." },
            { icon: "badge", title: "Beban payroll", detail: "Batch payroll yang telah dieksekusi (netto transfer ke karyawan)." },
            { icon: "local_gas_station", title: "Beban BBM", detail: "Pembelian solar site × harga per liter saat pencatatan tangki." },
          ].map((n) => (
            <div key={n.title} className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
              <Icon name={n.icon} size={20} className="mt-0.5 text-secondary" />
              <span>
                <span className="block font-label-md text-label-md text-primary">{n.title}</span>
                <span className="block text-on-surface-variant">{n.detail}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          * Estimasi PPh bersifat indikatif untuk pratinjau manajemen; perhitungan final mengikuti laporan pajak resmi. Modul ini membaca komoditas {commodityName("K-001")} dan seterusnya dari Master Data.
        </p>
      </Card>
    </PageBody>
  );
}

function RecapTile({ top, label, value, foot, icon }: { top: string; label: string; value: string; foot: string; icon: string }) {
  return (
    <Card accentTop={top} className="flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
          <span className="mt-1 font-headline-md text-headline-md font-bold text-primary tabular">{value}</span>
        </div>
        <span className="rounded-lg bg-surface-container p-2 text-primary">
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">{foot}</p>
    </Card>
  );
}

