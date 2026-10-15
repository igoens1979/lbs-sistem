import { useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { Button, Card, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Td, Th } from "@/components/ui";
import { FUEL_STATE, commodityName, driverName } from "@/lib/data";
import { cn, csvDownload, d, iso, num, parseISO, pct, rupiah, rupiahShort, TODAY } from "@/lib/format";
import { printServiceSchedule } from "@/lib/print";
import { useApp } from "@/lib/store";

export default function Bbm() {
  const app = useApp();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [tab, setTab] = useState<"konsumsi" | "ritase" | "pemeliharaan">("konsumsi");
  const canCreate = app.can("bbm", "create");
  const canEdit = app.can("bbm", "edit");
  const [svcTarget, setSvcTarget] = useState<string | null>(null);
  const [odoTarget, setOdoTarget] = useState<string | null>(null);
  const [paramOpen, setParamOpen] = useState(false);
  const plan = app.maintenancePlan;
  const dueCount = plan.filter((x) => x.overdue).length;
  const soonCount = plan.filter((x) => x.dueSoon).length;

  const periodSJ = useMemo(
    () => app.sj.filter((r) => r.date >= app.period.from && r.date <= app.period.to && r.status !== "Batal"),
    [app.sj, app.period],
  );

  const perVehicle = useMemo(
    () =>
      app.vehicles
        .filter((v) => v.type === "Dump Truck")
        .map((v) => {
          const rows = periodSJ.filter((r) => r.vehicleId === v.id);
          const trips = rows.reduce((s, r) => s + r.trips, 0);
          const volume = rows.reduce((s, r) => s + r.volume * r.trips, 0);
          const revenue = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
          const liter = trips * FUEL_STATE.literPerRit;
          const fuelCost = liter * FUEL_STATE.pricePerLiter;
          return { v, trips, volume, revenue, liter, fuelCost, driver: app.drivers.find((x) => x.id === v.driverId)?.name ?? "-", margin: revenue - fuelCost };
        })
        .sort((a, b) => b.trips - a.trips),
    [app.vehicles, app.drivers, periodSJ],
  );

  const perDriver = useMemo(
    () =>
      app.drivers
        .map((dr) => {
          const rows = periodSJ.filter((r) => r.driverId === dr.id);
          return { dr, trips: rows.reduce((s, r) => s + r.trips, 0), volume: rows.reduce((s, r) => s + r.volume * r.trips, 0) };
        })
        .filter((x) => x.trips > 0)
        .sort((a, b) => b.trips - a.trips),
    [app.drivers, periodSJ],
  );

  const ritaseToday = app.ritaseToday;
  const fuel = app.fuelStock;
  const maxTrips = Math.max(...perVehicle.map((p) => p.trips), 1);
  const periodLiter = periodSJ.reduce((s, r) => s + r.trips * FUEL_STATE.literPerRit, 0);
  const periodFuelCost = periodLiter * FUEL_STATE.pricePerLiter;

  return (
    <PageBody>
      <PageHeader
        eyebrow="Operasional Armada & Energi"
        title="Operasional Dump Truck, BBM & Pemeliharaan"
        description="Monitor ritase per unit dan per komoditas, konsumsi solar site Golo Mori, nilai stok tangki, serta jadwal pemeliharaan armada."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("operasional-bbm-lbs.csv", [
                ["Unit", "Model", "Driver", "Ritase", "Volume (m3)", "Solar (L)", "Biaya Solar", "Revenue", "Margin"],
                ...perVehicle.map((p) => [p.v.plate, p.v.model, p.driver, p.trips, p.volume, p.liter, p.fuelCost, p.revenue, p.margin]),
              ])
            }
            onPrint={() => window.print()}
          />
        }
      />

      <section className="flex flex-wrap gap-space-md">
        <Card accentTop="bg-primary" className="min-w-[210px] flex-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ritase Hari Ini</span>
              <p className="mt-1 font-numeric-metric text-primary tabular">{num(ritaseToday.trips)} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">Rit</span></p>
            </div>
            <span className="rounded-lg bg-primary-fixed p-2 text-primary">
              <Icon name="play_apps" size={22} />
            </span>
          </div>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Volume {num(ritaseToday.volume)} m³ • {ritaseToday.vehiclesActive} unit aktif
          </p>
        </Card>
        <Card accentTop="bg-primary" className="min-w-[210px] flex-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ritase Periode</span>
              <p className="mt-1 font-numeric-metric text-primary tabular">{num(periodSJ.reduce((s, r) => s + r.trips, 0))} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">Rit</span></p>
            </div>
            <span className="rounded-lg bg-primary-fixed p-2 text-primary">
              <Icon name="route" size={22} />
            </span>
          </div>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {num(periodSJ.reduce((s, r) => s + r.volume * r.trips, 0))} m³ terkirim
          </p>
        </Card>
        <Card accentTop="bg-secondary-container" className="min-w-[210px] flex-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Konsumsi Solar</span>
              <p className="mt-1 font-numeric-metric text-secondary tabular">{num(periodLiter)} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">L</span></p>
            </div>
            <span className="rounded-lg bg-secondary-fixed p-2 text-on-secondary-fixed">
              <Icon name="local_gas_station" size={22} />
            </span>
          </div>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Biaya solar {rupiahShort(periodFuelCost)} • {FUEL_STATE.literPerRit} L/rit
          </p>
        </Card>
        <Card accentTop={fuel.liter < 6000 ? "bg-error" : "bg-primary"} className="min-w-[210px] flex-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Stok Solar Site</span>
              <p className="mt-1 font-numeric-metric text-primary tabular">{num(fuel.liter)} <span className="font-label-lg text-label-lg font-normal text-on-surface-variant">L</span></p>
            </div>
            <span className={cn("rounded-lg p-2", fuel.liter < 6000 ? "bg-error-container text-error" : "bg-primary-fixed text-primary")}>
              <Icon name="oil_barrel" size={22} />
            </span>
          </div>
          <div className="mt-space-sm">
            <ProgressBar value={pct(fuel.liter, fuel.capacity)} tone={fuel.liter < 6000 ? "bg-error" : "bg-secondary-container"} />
          </div>
          <p className="mt-space-sm rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Kapasitas {num(fuel.capacity)} L • nilai {rupiahShort(fuel.value)}
          </p>
        </Card>
      </section>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-8">
          <SectionHeading
            icon="view_list"
            title="Kinerja Armada & Konsumsi Solar"
            subtitle="Ritase, volume, biaya solar, dan margin kontribusi per unit dump truck"
            right={
              <div className="flex flex-wrap items-center gap-1">
                {(["konsumsi", "ritase", "pemeliharaan"] as const).map((t) => (
                  <Button key={t} size="sm" variant={tab === t ? "primary" : "secondary"} onClick={() => setTab(t)} className="capitalize">
                    {t}
                  </Button>
                ))}
              </div>
            }
          />

          {tab === "konsumsi" && (
            <div className="overflow-x-auto rounded-lg bg-surface-container-low">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <Th>Unit &amp; Driver</Th>
                    <Th align="center">Status</Th>
                    <Th align="right">Ritase</Th>
                    <Th align="right">Volume</Th>
                    <Th align="right">Solar</Th>
                    <Th align="right">Biaya Solar</Th>
                    <Th align="right">Revenue</Th>
                    <Th align="right">Margin</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                  {perVehicle.map((p) => (
                    <tr key={p.v.id} className="transition-colors hover:bg-surface-container-lowest/60">
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md font-semibold text-primary">{p.v.plate}</span>
                          <span className="text-[11px] text-on-surface-variant">
                            {p.v.model} • {p.driver}
                          </span>
                        </div>
                        <div className="mt-1 w-24">
                          <ProgressBar value={(p.trips / maxTrips) * 100} height="h-1" />
                        </div>
                      </Td>
                      <Td align="center">
                        <StatusPill status={p.v.status} />
                      </Td>
                      <Td align="right" className="font-mono">{num(p.trips)}</Td>
                      <Td align="right" className="font-mono">{num(p.volume)} m³</Td>
                      <Td align="right" className="font-mono">{num(p.liter)} L</Td>
                      <Td align="right" className="font-mono text-error">{rupiah(p.fuelCost)}</Td>
                      <Td align="right" className="font-mono text-primary">{rupiah(p.revenue)}</Td>
                      <Td align="right" className="font-mono font-semibold text-success">{rupiah(p.margin)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                    <Td colSpan={2}>Total {perVehicle.length} unit dump truck</Td>
                    <Td align="right" className="font-mono">{num(perVehicle.reduce((s, p) => s + p.trips, 0))}</Td>
                    <Td align="right" className="font-mono">{num(perVehicle.reduce((s, p) => s + p.volume, 0))} m³</Td>
                    <Td align="right" className="font-mono">{num(periodLiter)} L</Td>
                    <Td align="right" className="font-mono text-error">{rupiah(periodFuelCost)}</Td>
                    <Td align="right" className="font-mono">{rupiah(perVehicle.reduce((s, p) => s + p.revenue, 0))}</Td>
                    <Td align="right" className="font-mono">{rupiah(perVehicle.reduce((s, p) => s + p.margin, 0))}</Td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === "ritase" && (
            <div className="flex flex-col gap-space-md">
              <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-space-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Ritase Hari Ini per Komoditas</span>
                  <div className="mt-space-sm flex flex-col gap-space-sm">
                    {ritaseToday.byCommodity.map((c) => (
                      <div key={c.name} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between font-body-sm">
                          <span className="font-label-md text-label-md text-on-surface">{c.name}</span>
                          <span className="font-mono text-primary">
                            {c.trips} rit • {num(c.volume)} m³
                          </span>
                        </div>
                        <ProgressBar value={(c.trips / Math.max(ritaseToday.trips, 1)) * 100} height="h-1.5" />
                      </div>
                    ))}
                    {ritaseToday.byCommodity.length === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">Belum ada ritase hari ini.</p>}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-container-low p-space-md">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Peringkat Ritase Periode</span>
                  <div className="mt-space-sm flex flex-col divide-y divide-surface-container-highest">
                    {perDriver.slice(0, 8).map((p, idx) => (
                      <div key={p.dr.id} className="flex items-center justify-between py-2 first:pt-0">
                        <span className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-[10px] text-primary">{idx + 1}</span>
                          <span className="font-label-md text-label-md text-on-surface">{p.dr.name}</span>
                          <Pill tone="outline">★ {p.dr.rating}</Pill>
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {p.trips} rit • {num(p.volume)} m³
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg bg-surface-container-low">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <Th>Komoditas</Th>
                      <Th align="right">Stok Stockpile</Th>
                      <Th align="right">Harga Jual</Th>
                      <Th align="right">Ritase Periode</Th>
                      <Th align="right">Volume Terkirim</Th>
                      <Th align="right">Nilai Muatan</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                    {app.commodities.map((c) => {
                      const rows = periodSJ.filter((r) => r.commodityId === c.id);
                      return (
                        <tr key={c.id}>
                          <Td>{c.name}</Td>
                          <Td align="right" className="font-mono">{num(c.stock)} {c.unit}</Td>
                          <Td align="right" className="font-mono">{rupiah(c.price)}</Td>
                          <Td align="right" className="font-mono">{num(rows.reduce((s, r) => s + r.trips, 0))}</Td>
                          <Td align="right" className="font-mono">{num(rows.reduce((s, r) => s + r.volume * r.trips, 0))} m³</Td>
                          <Td align="right" className="font-mono font-semibold text-primary">{rupiah(rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0))}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "pemeliharaan" && (
            <div className="flex flex-col gap-space-md">
              {/* Alert ringkas */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <Pill tone="error">{dueCount} unit terlambat servis</Pill>
                  <Pill tone="amber">{soonCount} unit mendekati jadwal</Pill>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Peringatan dihitung otomatis saat sisa km ≤ {num(app.maintenance.warnKm)} km
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button size="sm" variant="secondary" icon="tune" disabled={!canEdit} onClick={() => setParamOpen(true)}>
                    Atur Parameter Servis
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="print"
                    onClick={() =>
                      printServiceSchedule(
                        plan.map((x) => ({
                          plate: x.v.plate,
                          model: x.v.model,
                          driver: driverName(x.v.driverId ?? ""),
                          odometer: x.v.odometer,
                          lastService: x.v.lastServiceOdometer,
                          lastServiceDate: x.v.lastServiceDate,
                          interval: x.v.serviceIntervalKm,
                          next: x.nextKm,
                          remaining: x.remainingKm,
                          status: x.overdue ? "Terlambat" : x.dueSoon ? "Mendekati jadwal" : "Terjadwal",
                        })),
                        app.maintenance,
                      )
                    }
                  >
                    Cetak Jadwal Servis
                  </Button>
                </div>
              </div>

              {/* Kartu servis per unit */}
              <div className="overflow-x-auto rounded-lg bg-surface-container-low">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <Th>Unit &amp; Driver</Th>
                      <Th align="right">Odometer Kini</Th>
                      <Th align="right">Servis Terakhir</Th>
                      <Th align="right">Interval</Th>
                      <Th align="right">Servis Berikutnya</Th>
                      <Th align="right">Sisa Km</Th>
                      <Th align="center">Status Jadwal</Th>
                      <Th align="center">Aksi</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                    {plan.map(({ v, nextKm, remainingKm, overdue, dueSoon }) => (
                      <tr key={v.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", overdue && "bg-error-container/25", !overdue && dueSoon && "bg-secondary-fixed/20")}>
                        <Td>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md font-semibold text-primary">{v.plate} · {v.model}</span>
                            <span className="text-[11px] text-on-surface-variant">
                              {v.type} • {driverName(v.driverId ?? "")}
                              {v.serviceNote ? ` • ${v.serviceNote}` : ""}
                            </span>
                          </div>
                        </Td>
                        <Td align="right" className="font-mono">{num(v.odometer)} km</Td>
                        <Td align="right">
                          <span className="block font-mono">{num(v.lastServiceOdometer)} km</span>
                          <span className="text-[11px] text-on-surface-variant">{d(parseISO(v.lastServiceDate))}</span>
                        </Td>
                        <Td align="right" className="font-mono">{num(v.serviceIntervalKm)} km</Td>
                        <Td align="right" className="font-mono font-semibold text-primary">{num(nextKm)} km</Td>
                        <Td align="right">
                          <span className={cn("font-mono font-bold", overdue ? "text-error" : dueSoon ? "text-secondary" : "text-primary")}>
                            {remainingKm <= 0 ? `-${num(Math.abs(remainingKm))} km` : `${num(remainingKm)} km`}
                          </span>
                          <div className="mt-1 w-24">
                            <ProgressBar
                              value={Math.max(0, Math.min(100, (remainingKm / Math.max(v.serviceIntervalKm, 1)) * 100))}
                              tone={overdue ? "bg-error" : dueSoon ? "bg-secondary-container" : "bg-success"}
                              height="h-1"
                            />
                          </div>
                        </Td>
                        <Td align="center">
                          <div className="flex flex-col items-center gap-1">
                            <Pill tone={overdue ? "error" : dueSoon ? "amberSoft" : "success"}>
                              {overdue ? "Terlambat" : dueSoon ? "Mendekati" : "Terjadwal"}
                            </Pill>
                            <StatusPill status={v.status} />
                          </div>
                        </Td>
                        <Td align="center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <Button size="sm" variant="secondary" icon="speed" disabled={!canEdit} onClick={() => setOdoTarget(v.id)}>
                              Odometer
                            </Button>
                            <Button size="sm" icon="build_circle" disabled={!canEdit} onClick={() => setSvcTarget(v.id)}>
                              Catat Servis
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                      <Td colSpan={4}>Total {plan.length} unit terdaftar</Td>
                      <Td align="right" className="font-mono">{dueCount} terlambat</Td>
                      <Td align="right" className="font-mono">{soonCount} mendekati</Td>
                      <Td colSpan={2} align="center" className="font-label-sm text-label-sm">
                        Interval default {num(app.maintenance.defaultIntervalKm)} km
                      </Td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Panduan pengaturan */}
              <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
                {[
                  { icon: "1", title: "Parameter global", detail: `Buka “Atur Parameter Servis” untuk menetapkan interval default (kini ${num(app.maintenance.defaultIntervalKm)} km) dan ambang peringatan (${num(app.maintenance.warnKm)} km).` },
                  { icon: "2", title: "Per unit", detail: "Tombol “Odometer” memperbarui km berjalan; “Catat Servis” mengunci odometer servis, mengganti interval, dan membebankan biaya ke kas/bank." },
                  { icon: "3", title: "Master data", detail: "Nilai Odometer, Servis Terakhir, Interval, dan Tanggal servis juga dapat disunting langsung di Master Data → Armada." },
                ].map((x) => (
                  <div key={x.title} className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-label-sm text-[10px] text-on-primary">{x.icon}</span>
                    <span>
                      <span className="block font-label-md text-label-md text-primary">{x.title}</span>
                      <span className="block font-body-sm text-body-sm text-on-surface-variant">{x.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading
              icon="oil_barrel"
              title="Kartu Stok Solar Site"
              subtitle={`Pembelian terakhir & mutasi tangki (${FUEL_STATE.pricePerLiter.toLocaleString("id-ID")}/L)`}
              right={
                <Button size="sm" icon="add_circle" disabled={!canCreate} onClick={() => setPurchaseOpen(true)}>
                  Pembelian
                </Button>
              }
            />
            <div className="flex flex-col divide-y divide-surface-container">
              {app.fuelLogs.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-space-sm first:pt-0">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-primary">
                      {num(f.liter)} L @ {rupiah(f.pricePerLiter)}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {d(parseISO(f.date))} • {app.suppliers.find((s) => s.id === f.supplierId)?.name ?? "Pemasok lokal"}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-error">{rupiah(f.liter * f.pricePerLiter)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Total pembelian periode</span>
              <span className="font-label-lg text-label-lg text-primary">
                {num(app.fuelLogs.reduce((s, f) => s + f.liter, 0))} L
              </span>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="calendar_month" title="Jadwal & Alert Operasional" subtitle="Diperbarui otomatis dari data armada dan surat jalan" />
            <div className="flex flex-col gap-space-sm">
              <AlertRow icon="water_drop" tone={fuel.liter < 6000 ? "error" : "info"} title="Stok solar site" detail={`${num(fuel.liter)} L dari kapasitas ${num(fuel.capacity)} L`} />
              <AlertRow icon="build_circle" tone="warn" title={`${app.vehicles.filter((v) => v.status === "Servis").length} unit di bengkel`} detail="Armada masuk pemeliharaan berkala" />
              <AlertRow icon="speed" tone="info" title="Rata-rata ritase harian" detail={`${(periodSJ.reduce((s, r) => s + r.trips, 0) / 15).toFixed(1)} rit/hari periode ini`} />
              <AlertRow icon="person_alert" tone="warn" title={`${app.drivers.filter((x) => x.status === "Cuti").length} driver cuti`} detail="Perlu penyesuaian jadwal ritase" />
              <AlertRow icon="verified" tone="info" title="SLA pengiriman" detail="Tidak ada komplain keterlambatan periode ini" />
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md bg-secondary-fixed p-space-md text-on-secondary-fixed sm:p-space-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">Efisiensi Solar</span>
                <p className="mt-1 font-headline-md text-headline-md font-bold text-secondary">
                  {pct(periodFuelCost, perVehicle.reduce((s, p) => s + p.revenue, 0) || 1).toFixed(1)}% dari revenue
                </p>
                <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant">
                  Biaya solar {rupiahShort(periodFuelCost)} terhadap revenue hauling {rupiahShort(perVehicle.reduce((s, p) => s + p.revenue, 0))}
                </p>
              </div>
              <Icon name="eco" size={26} className="text-secondary" />
            </div>
            <ProgressBar value={pct(periodFuelCost, perVehicle.reduce((s, p) => s + p.revenue, 0) || 1)} tone="bg-secondary" height="h-3" />
          </Card>
        </div>
      </div>

      {purchaseOpen && <PurchaseModal onClose={() => setPurchaseOpen(false)} />}
      {paramOpen && <MaintenanceParamsModal onClose={() => setParamOpen(false)} />}
      {odoTarget && <OdometerModal vehicleId={odoTarget} onClose={() => setOdoTarget(null)} />}
      {svcTarget && <ServiceModal vehicleId={svcTarget} onClose={() => setSvcTarget(null)} />}
    </PageBody>
  );
}

function AlertRow({ icon, tone, title, detail }: { icon: string; tone: "info" | "warn" | "error"; title: string; detail: string }) {
  const map = {
    info: "bg-primary-fixed text-primary",
    warn: "bg-secondary-fixed text-on-secondary-fixed",
    error: "bg-error-container text-error",
  } as const;
  return (
    <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", map[tone])}>
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-label-md text-label-md text-on-surface">{title}</span>
        <span className="block font-body-sm text-body-sm text-on-surface-variant">{detail}</span>
      </span>
    </div>
  );
}

function PurchaseModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [form, setForm] = useState({ liter: 8_000, pricePerLiter: FUEL_STATE.pricePerLiter, accountId: "A-002", supplierId: "S-002", date: iso(TODAY), note: "Pembelian solar industrial batch" });
  const total = form.liter * form.pricePerLiter;
  const balance = app.accountBalance(form.accountId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat Pembelian Solar"
      subtitle={`Stok tangki saat ini ${num(app.fuelStock.liter)} L dari ${num(app.fuelStock.capacity)} L`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="save"
            onClick={() => {
              if (total > balance) {
                app.toast("Saldo rekening tidak mencukupi", `Tersedia ${rupiah(balance)}`, "error");
                return;
              }
              app.addFuelPurchase(form);
              onClose();
            }}
          >
            Simpan Pembelian
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Volume (liter)">
          <Input type="number" value={form.liter} onChange={(e) => setForm({ ...form, liter: Number(e.target.value) })} />
        </Field>
        <Field label="Harga per Liter (Rp)">
          <Input type="number" value={form.pricePerLiter} onChange={(e) => setForm({ ...form, pricePerLiter: Number(e.target.value) })} />
        </Field>
        <Field label="Rekening Pembayaran" hint={`Saldo ${rupiahShort(balance)}`}>
          <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pemasok">
          <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            {app.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tanggal Terima">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Catatan">
          <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-xl bg-surface-container-low p-space-md">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Total nilai pembelian</span>
        <span className="font-headline-md text-headline-md text-primary tabular">{rupiah(total)}</span>
      </div>
      <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
        Stok setelah penerimaan: {num(app.fuelStock.liter + form.liter)} L • nilai {rupiahShort((app.fuelStock.liter + form.liter) * form.pricePerLiter)} • komoditas terkait {commodityName("K-001")} hauling
      </p>
    </Modal>
  );
}


/* ------------------------- Modal: parameter servis ------------------------- */
function MaintenanceParamsModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [interval, setInterval] = useState(app.maintenance.defaultIntervalKm);
  const [warn, setWarn] = useState(app.maintenance.warnKm);
  const [applyAll, setApplyAll] = useState(true);

  const affected = applyAll ? app.vehicles.length : app.vehicles.filter((v) => v.serviceIntervalKm === app.maintenance.defaultIntervalKm).length;

  return (
    <Modal
      open
      onClose={onClose}
      title="Parameter Pemeliharaan & Servis Berkala"
      subtitle="Menentukan target km servis berikutnya untuk seluruh unit armada"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="save"
            onClick={() => {
              if (interval <= 0) {
                app.toast("Interval servis tidak valid", "Masukkan interval lebih besar dari 0 km", "warn");
                return;
              }
              if (warn >= interval) {
                app.toast("Ambang peringatan terlalu besar", "Peringatan harus lebih kecil dari interval servis", "error");
                return;
              }
              app.setMaintenanceParams({ defaultIntervalKm: interval, warnKm: warn }, applyAll);
              onClose();
            }}
          >
            Simpan Parameter
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Interval Servis Default (km)" hint="Jarak antar servis berkala, mis. 10.000 km">
          <Input type="number" value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
        </Field>
        <Field label="Ambang Peringatan (km)" hint="Notifikasi muncul saat sisa km ≤ nilai ini">
          <Input type="number" value={warn} onChange={(e) => setWarn(Number(e.target.value))} />
        </Field>
      </div>

      <label className="mt-space-md flex items-start gap-2 rounded-xl bg-surface-container-low p-space-sm">
        <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00274e]" />
        <span>
          <span className="block font-label-md text-label-md text-primary">Terapkan interval ke seluruh unit ({app.vehicles.length} armada)</span>
          <span className="block font-body-sm text-body-sm text-on-surface-variant">
            Bila tidak dicentang, hanya parameter default yang berubah dan interval per unit tetap seperti pengaturan masing-masing (dapat diatur di Master Data → Armada).
          </span>
        </span>
      </label>

      <div className="mt-space-md overflow-x-auto rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th>Unit</Th>
              <Th align="right">Odometer</Th>
              <Th align="right">Interval Kini</Th>
              <Th align="right">Interval Setelah Simpan</Th>
              <Th align="right">Target Berikutnya</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {app.vehicles.slice(0, 6).map((v) => {
              const newInterval = applyAll ? interval : v.serviceIntervalKm;
              const target = v.lastServiceOdometer + newInterval;
              return (
                <tr key={v.id}>
                  <Td>{v.plate}</Td>
                  <Td align="right" className="font-mono">{num(v.odometer)}</Td>
                  <Td align="right" className="font-mono text-on-surface-variant">{num(v.serviceIntervalKm)}</Td>
                  <Td align="right" className="font-mono font-semibold text-primary">{num(newInterval)}</Td>
                  <Td align="right" className="font-mono">{num(target)} km</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
        {affected} unit akan memakai interval {num(interval)} km • peringatan otomatis muncul pada sisa {num(warn)} km (juga tampil di lonceng notifikasi header).
      </p>
    </Modal>
  );
}

/* ------------------------- Modal: update odometer ------------------------- */
function OdometerModal({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const app = useApp();
  const v = app.vehicles.find((x) => x.id === vehicleId)!;
  const [km, setKm] = useState(v.odometer);
  const [note, setNote] = useState(v.serviceNote ?? "");
  const nextKm = v.lastServiceOdometer + v.serviceIntervalKm;
  const remaining = nextKm - km;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Perbarui Odometer — ${v.plate}`}
      subtitle={`${v.model} • driver ${driverName(v.driverId ?? "")}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="speed"
            onClick={() => {
              if (km < v.odometer) {
                app.toast("Odometer tidak boleh mundur", `Nilai saat ini ${num(v.odometer)} km`, "error");
                return;
              }
              app.updateOdometer(v.id, km, note);
              onClose();
            }}
          >
            Simpan Odometer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Odometer Saat Ini (km)">
          <Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} />
        </Field>
        <Field label="Catatan Unit">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. kondisi ban, keluhan driver" />
        </Field>
      </div>
      <div className="mt-space-md grid grid-cols-3 gap-space-sm">
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Servis terakhir</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{num(v.lastServiceOdometer)} km</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Target servis</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{num(nextKm)} km</p>
        </div>
        <div className={cn("rounded-lg p-space-sm", remaining <= 0 ? "bg-error-container" : remaining <= app.maintenance.warnKm ? "bg-secondary-fixed" : "bg-success-container")}>
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Sisa</span>
          <p className={cn("font-label-lg text-label-lg tabular", remaining <= 0 ? "text-error" : "text-primary")}>
            {remaining <= 0 ? `-${num(Math.abs(remaining))} km` : `${num(remaining)} km`}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------- Modal: catat servis ------------------------- */
function ServiceModal({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const app = useApp();
  const v = app.vehicles.find((x) => x.id === vehicleId)!;
  const [date, setDate] = useState(iso(TODAY));
  const [odo, setOdo] = useState(v.odometer);
  const [interval, setInterval] = useState(v.serviceIntervalKm || app.maintenance.defaultIntervalKm);
  const [cost, setCost] = useState(0);
  const [accountId, setAccountId] = useState("A-002");
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<"Aktif" | "Servis">("Aktif");

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      title={`Catat Servis Berkala — ${v.plate}`}
      subtitle="Saat disimpan, odometer servis terakhir & interval diperbarui sehingga target servis berikutnya otomatis bergeser"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="build_circle"
            onClick={() => {
              if (odo < v.lastServiceOdometer) {
                app.toast("Odometer servis tidak valid", `Tidak boleh lebih kecil dari servis terakhir (${num(v.lastServiceOdometer)} km)`, "warn");
                return;
              }
              if (interval <= 0) {
                app.toast("Interval servis tidak valid", undefined, "warn");
                return;
              }
              app.recordService(v.id, { date, odometerAtService: odo, intervalKm: interval, cost, accountId, note, nextStatus });
              onClose();
            }}
          >
            Simpan &amp; Geser Jadwal Servis
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Tanggal Servis">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Odometer Saat Servis (km)" hint={`Odometer kini ${num(v.odometer)} km • servis terakhir ${num(v.lastServiceOdometer)} km`}>
          <Input type="number" value={odo} onChange={(e) => setOdo(Number(e.target.value))} />
        </Field>
        <Field label="Interval Servis Berikutnya (km)" hint="Ubah untuk unit dengan kondisi medan khusus">
          <Input type="number" value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
        </Field>
        <Field label="Status Unit Setelah Servis">
          <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as "Aktif" | "Servis")}>
            <option value="Aktif">Aktif (kembali beroperasi)</option>
            <option value="Servis">Servis (masih di bengkel)</option>
          </Select>
        </Field>
        <Field label="Biaya Servis (Rp)" hint="0 = tanpa biaya / garansi">
          <Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </Field>
        <Field label="Rekening Beban Biaya" hint={cost > 0 ? `Saldo ${rupiahShort(app.accountBalance(accountId))}` : "Hanya dipakai bila biaya > 0"}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan Pekerjaan" className="sm:col-span-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. ganti oli mesin, filter solar, penyetelan rem" />
        </Field>
      </div>

      <div className="mt-space-md grid grid-cols-1 gap-space-sm sm:grid-cols-3">
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Target berikutnya</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{num(odo + interval)} km</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Sisa jarak unit</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{num(Math.max(0, odo + interval - v.odometer))} km</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Biaya tercatat</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(cost)}</p>
        </div>
      </div>
      {cost > 0 && (
        <p className="mt-space-sm rounded-lg bg-secondary-fixed px-space-sm py-2 font-body-sm text-body-sm text-on-secondary-fixed">
          Biaya {rupiah(cost)} akan tercatat sebagai kas keluar kategori <b>Pemeliharaan</b> pada rekening {app.accountsWithBalance.find((a) => a.id === accountId)?.name} — otomatis memengaruhi Rekap Keuangan.
        </p>
      )}
    </Modal>
  );
}
