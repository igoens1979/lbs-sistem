import { useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { Button, Card, Drawer, EmptyState, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Tabs, Td, Textarea, Th } from "@/components/ui";
import { commodityName, type Invoice, vehiclePlate } from "@/lib/data";
import { cn, csvDownload, d, daysBetween, iso, num, parseISO, pct, rupiah, rupiahShort, TODAY } from "@/lib/format";
import { printInvoice } from "@/lib/print";
import { useApp } from "@/lib/store";

export default function Invoices() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "paid">("all");
  const [customerId, setCustomerId] = useState("all");
  const [scope, setScope] = useState<"periode" | "semua">("semua");
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [manualNo, setManualNo] = useState("");
  const [manualDate, setManualDate] = useState("");
  const canPay = app.can("invoice", "edit");
  const canBill = app.can("invoice", "create");
  const canRevisePerm = app.can("invoice", "edit");
  const [gabunganOpen, setGabunganOpen] = useState(false);
  const [reviseTarget, setReviseTarget] = useState<Invoice | null>(null);
  const [carryTarget, setCarryTarget] = useState<Invoice | null>(null);
  const [termByCustomer, setTermByCustomer] = useState<Record<string, number>>({});

  const rows = useMemo(() => {
    return app.invoices
      .filter((i) => {
        if (scope === "periode" && (i.date < app.period.from || i.date > app.period.to)) return false;
        if (customerId !== "all" && i.customerId !== customerId) return false;
        const due = app.outstandingOf(i);
        const late = daysBetween(new Date(i.dueDate), TODAY()) > 0;
        if (filter === "open" && due <= 0) return false;
        if (filter === "overdue" && !(due > 0 && late)) return false;
        if (filter === "paid" && due > 0) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          const customer = app.customers.find((c) => c.id === i.customerId)?.name.toLowerCase() ?? "";
          if (!i.no.toLowerCase().includes(q) && !customer.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [app, scope, customerId, filter, query]);

  const stats = useMemo(() => {
    const inPeriod = app.invoices.filter((i) => i.date >= app.period.from && i.date <= app.period.to);
    const received = app.payments.filter((p) => p.date >= app.period.from && p.date <= app.period.to).reduce((s, p) => s + p.amount, 0);
    const overdue = app.invoices.filter((i) => app.outstandingOf(i) > 0 && daysBetween(new Date(i.dueDate), TODAY()) > 0);
    return {
      issued: inPeriod.reduce((s, i) => s + i.total, 0),
      count: inPeriod.length,
      received,
      overdueValue: overdue.reduce((s, i) => s + app.outstandingOf(i), 0),
      overdueCount: overdue.length,
      dpp: inPeriod.reduce((s, i) => s + i.dpp, 0),
      ppn: inPeriod.reduce((s, i) => s + i.ppn, 0),
    };
  }, [app]);

  const unbilled = useMemo(() => {
    const pending = app.sj.filter((r) => !r.invoiceId && r.status !== "Batal");
    const groups = app.customers
      .map((c) => {
        const list = pending.filter((r) => r.customerId === c.id);
        const dpp = list.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
        return { c, list, dpp, ppn: Math.round(dpp * 0.11), total: Math.round(dpp * 1.11) };
      })
      .filter((g) => g.list.length > 0)
      .sort((a, b) => b.dpp - a.dpp);
    return groups;
  }, [app]);

  const agingTotal = app.aging.reduce((s, a) => s + a.amount, 0) || 1;

  return (
    <PageBody>
      <PageHeader
        eyebrow="Penagihan & Piutang"
        title="Manajemen Invoice & Siklus Penagihan"
        description="Terbitkan faktur dari surat jalan terverifikasi, catat pembayaran masuk, dan pantau umur piutang per mitra kerja."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("daftar-invoice-lbs.csv", [
                ["No Invoice", "Pelanggan", "Tanggal", "Jatuh Tempo", "DPP", "PPN", "Total", "Dibayar", "Sisa", "Status"],
                ...rows.map((i) => [
                  i.no,
                  app.customers.find((c) => c.id === i.customerId)?.name ?? "",
                  d(parseISO(i.date)),
                  d(parseISO(i.dueDate)),
                  i.dpp,
                  i.ppn,
                  i.total,
                  app.paidOf(i.id),
                  app.outstandingOf(i),
                  app.computedStatus(i),
                ]),
              ])
            }
            onPrint={() => window.print()}
          />
        }
      />

      <section className="flex flex-wrap gap-space-md">
        <Stat label="Tagihan Diterbitkan" value={rupiahShort(stats.issued)} foot={`${stats.count} invoice periode berjalan`} icon="receipt_long" />
        <Stat label="Dana Diterima" value={rupiahShort(stats.received)} foot={`DPP ${rupiahShort(stats.dpp)} • pajak ${rupiahShort(stats.ppn)}`} icon="savings" tone="amber" />
        <Stat label="Outstanding Piutang" value={rupiahShort(app.outstandingTotal)} foot={`${app.aging.reduce((s, a) => s + a.count, 0)} invoice beredar • ${app.invoices.filter((i) => i.kind === "Gabungan").length} invoice gabungan`} icon="request_quote" />
        <Stat label="Lewat Jatuh Tempo" value={rupiahShort(stats.overdueValue)} foot={`${stats.overdueCount} invoice perlu prioritas`} icon="event_busy" accent="error" />
      </section>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-8">
          <SectionHeading
            icon="receipt_long"
            title="Buku Besar Invoice"
            subtitle="Semua faktur penagihan beserta status pembayaran terbaru"
            right={
              <div className="flex flex-wrap items-center gap-space-sm">
                <Button variant="secondary" size="sm" icon="playlist_add" disabled={!canBill} onClick={() => setBulkOpen(true)}>
                  Tagih SJ Belum Diinvoice ({app.kpi.sjPending})
                </Button>
                <Button variant="amber" size="sm" icon="call_merge" disabled={!canBill} onClick={() => setGabunganOpen(true)}>
                  Invoice Gabungan
                </Button>
              </div>
            }
          />
          <Tabs
            value={filter}
            onChange={(t) => setFilter(t)}
            tabs={[
              { id: "all", label: "Semua", icon: "list_alt", badge: app.invoices.length },
              { id: "open", label: "Belum Lunas", icon: "pending", badge: app.aging.reduce((s, a) => s + a.count, 0) },
              { id: "overdue", label: "Terlambat", icon: "error", badge: stats.overdueCount },
              { id: "paid", label: "Lunas", icon: "task_alt" },
            ]}
          />
          <div className="flex flex-wrap items-end gap-space-sm">
            <Field label="Pencarian" className="min-w-[200px] flex-1">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="No invoice atau pelanggan…" />
            </Field>
            <Field label="Pelanggan">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="all">Semua pelanggan</option>
                {app.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cakupan">
              <Select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
                <option value="semua">Seluruh riwayat</option>
                <option value="periode">Periode laporan</option>
              </Select>
            </Field>
          </div>

          <div className="overflow-x-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>No Invoice</Th>
                  <Th>Pelanggan</Th>
                  <Th align="center">Terbit</Th>
                  <Th align="center">Jatuh Tempo</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Sisa</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {rows.slice(0, 20).map((i) => {
                  const due = app.outstandingOf(i);
                  const paid = app.paidOf(i.id);
                  const late = daysBetween(new Date(i.dueDate), TODAY());
                  const isPartiallyPaid = paid > 0 && due > 0;
                  return (
                    <tr key={i.id} className="transition-colors hover:bg-surface-container-lowest/60">
                      <Td>
                        <div className="flex flex-col gap-1">
                          <span className="font-label-md text-label-md font-semibold text-primary">{i.no}</span>
                          {i.carryFromInvoiceId && isPartiallyPaid && (
                            <span className="ml-2 rounded bg-secondary-fixed px-1.5 py-0.5 text-[9px] font-semibold text-on-secondary-fixed uppercase">Carry Forward</span>
                          )}
                          <span className="flex flex-wrap items-center gap-1 text-[9px] text-on-surface-variant">
                            {i.sjIds.length} surat jalan
                            {i.kind === "Gabungan" && <Pill tone="navy">Gabungan {i.coveredCustomerIds?.length ?? 0} pelanggan</Pill>}
                            {!i.carryFromInvoiceId && isPartiallyPaid && (i.revisions ?? []).some((r) => r.type === "Carry Forward") && (
                              <Pill tone="amberSoft" className="text-[9px]">Diteruskan ke invoice lain</Pill>
                            )}
                            {(i.revisions?.filter((r) => r.type === "Revisi").length ?? 0) > 0 && (
                              <Pill tone="outline">Revisi {i.revisions?.filter((r) => r.type === "Revisi").length}x</Pill>
                            )}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="block">{app.customers.find((c) => c.id === i.customerId)?.name}</span>
                        {i.coveredCustomerIds && i.coveredCustomerIds.length > 1 && (
                          <span className="text-[11px] text-on-surface-variant">asal muatan: {i.coveredCustomerIds.length} pelanggan</span>
                        )}
                      </Td>
                      <Td align="center">{d(parseISO(i.date))}</Td>
                      <Td align="center">
                        <div className="flex flex-col items-center">
                          <span>{d(parseISO(i.dueDate))}</span>
                          {due > 0 && (
                            <span className={cn("font-label-sm text-[10px] uppercase", late > 0 ? "text-error" : "text-secondary")}>
                              {late > 0 ? `${late} hari lewat` : `${Math.abs(late)} hari lagi`}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td align="right" className="font-mono font-semibold text-primary">{rupiah(i.total)}</Td>
                      <Td align="right" className={cn("font-mono", due > 0 ? "text-error" : "text-success")}>{rupiah(due)}</Td>
                      <Td align="center">
                        <StatusPill status={app.computedStatus(i)} />
                      </Td>
                      <Td align="center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" title="Rincian invoice" onClick={() => setDetail(i)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary">
                            <Icon name="visibility" size={18} />
                          </button>
                          <button
                            type="button"
                            title="Catat pembayaran"
                            disabled={due <= 0 || !canPay}
                            onClick={() => setPayTarget(i)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="payments" size={18} />
                          </button>
                          <button
                            type="button"
                            title={app.canRevise(i).ok ? "Revisi invoice (tambah / kurangi surat jalan)" : `Revisi tidak dapat dilakukan — ${app.canRevise(i).reason}`}
                            disabled={!canRevisePerm || !app.canRevise(i).ok}
                            onClick={() => setReviseTarget(i)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="rule" size={18} />
                          </button>
                          <button
                            type="button"
                            title={app.paidOf(i.id) > 0 && app.outstandingOf(i) > 0 ? "Carry forward sisa surat jalan ke invoice baru" : "Carry forward hanya untuk invoice dengan pembayaran bertahap"}
                            disabled={!canRevisePerm || app.paidOf(i.id) <= 0 || app.outstandingOf(i) <= 0}
                            onClick={() => setCarryTarget(i)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                          >
                            <Icon name="east" size={18} />
                          </button>
                          <button
                            type="button"
                            title={`Cetak invoice + lampiran surat jalan (${1 + new Set(app.sj.filter((r) => i.sjIds.includes(r.id)).map((r) => r.customerId)).size} halaman lampiran)`}
                            onClick={() => printInvoice(i, { paid: app.paidOf(i.id), status: app.computedStatus(i), rows: app.sj.filter((r) => i.sjIds.includes(r.id)), allInvoices: app.invoices, customers: app.customers, vehicles: app.vehicles, drivers: app.drivers })}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary"
                          >
                            <Icon name="print" size={18} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <Td colSpan={8} align="center" className="py-space-xl text-on-surface-variant">
                      Tidak ada invoice sesuai filter yang dipilih.
                    </Td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                    <Td colSpan={4}>Total {Math.min(rows.length, 20)} invoice terfilter</Td>
                    <Td align="right" className="font-mono">{rupiah(rows.slice(0, 20).reduce((s, i) => s + i.total, 0))}</Td>
                    <Td align="right" className="font-mono">{rupiah(rows.slice(0, 20).reduce((s, i) => s + app.outstandingOf(i), 0))}</Td>
                    <Td colSpan={2} align="center" className="font-label-sm text-label-sm">Menampilkan maksimal 20 baris</Td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="notifications_active" title="Prioritas Penagihan" subtitle="Invoice lewat jatuh tempo diurutkan dari yang terbesar" />
            <div className="flex flex-col gap-space-sm">
              {app.invoices
                .filter((i) => app.outstandingOf(i) > 0 && daysBetween(new Date(i.dueDate), TODAY()) > 0)
                .sort((a, b) => app.outstandingOf(b) - app.outstandingOf(a))
                .slice(0, 5)
                .map((i) => (
                  <button key={i.id} type="button" onClick={() => setDetail(i)} className="flex flex-col gap-1 rounded-lg bg-error-container/60 p-space-sm text-left hover:bg-error-container">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-label-md text-label-md text-on-error-container">{i.no}</span>
                      <span className="font-mono font-bold text-error">{rupiahShort(app.outstandingOf(i))}</span>
                    </span>
                    <span className="font-body-sm text-body-sm text-on-error-container">
                      {app.customers.find((c) => c.id === i.customerId)?.name} • lewat {daysBetween(new Date(i.dueDate), TODAY())} hari
                    </span>
                  </button>
                ))}
              {app.invoices.filter((i) => app.outstandingOf(i) > 0 && daysBetween(new Date(i.dueDate), TODAY()) > 0).length === 0 && (
                <p className="rounded-lg bg-success-container p-space-sm font-body-sm text-body-sm text-success">Tidak ada invoice lewat jatuh tempo. Kinerja penagihan sangat baik.</p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="donut_small" title="Profil Aging Piutang" subtitle="Distribusi umur tagihan beredar" />
            <div className="flex flex-col gap-space-md">
              {app.aging.map((a) => (
                <div key={a.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-sm", a.tone)} />
                      <span className="font-label-md text-label-md text-on-surface">{a.label}</span>
                    </span>
                    <span className="font-mono font-bold text-primary">{pct(a.amount, agingTotal).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pct(a.amount, agingTotal)} tone={a.tone} />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Rekomendasi Sistem</span>
              <p className="font-body-sm text-body-sm text-on-surface">
                Kirim surat penagihan otomatis ke {new Set(app.invoices.filter((i) => app.outstandingOf(i) > 0 && daysBetween(new Date(i.dueDate), TODAY()) > 0).map((i) => i.customerId)).size} pelanggan
                dengan total piutang {rupiah(stats.overdueValue)}.
              </p>
              <div className="mt-space-sm">
                <Button
                  variant="amber"
                  size="sm"
                  icon="forward_to_inbox"
                  onClick={() => app.toast("Surat penagihan dijadwalkan", `${stats.overdueCount} invoice masuk antrian email & WhatsApp`, "info")}
                >
                  Jadwalkan Penagihan Massal
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment modal */}
      {payTarget && (
        <PaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSave={(payload) => {
            app.recordPayment({ invoiceId: payTarget.id, ...payload });
            setPayTarget(null);
          }}
        />
      )}

      {/* Invoice detail */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.no ?? ""}
        subtitle={detail ? `${app.customers.find((c) => c.id === detail.customerId)?.name} • jatuh tempo ${d(parseISO(detail.dueDate))}` : ""}
        footer={
          detail && (
            <>
              <Button variant="outline" onClick={() => setDetail(null)}>
                Tutup
              </Button>
              <Button variant="secondary" icon="print" onClick={() => printInvoice(detail, { paid: app.paidOf(detail.id), status: app.computedStatus(detail), rows: app.sj.filter((r) => detail.sjIds.includes(r.id)), allInvoices: app.invoices, customers: app.customers, vehicles: app.vehicles, drivers: app.drivers })}>
                Cetak Invoice + Lampiran
              </Button>
              <Button
                variant="secondary"
                icon="rule"
                disabled={!canRevisePerm || !app.canRevise(detail).ok}
                title={app.canRevise(detail).reason}
                onClick={() => {
                  setReviseTarget(detail);
                  setDetail(null);
                }}
              >
                Revisi Invoice
              </Button>
              <Button
                variant="amber"
                icon="east"
                disabled={!canRevisePerm || app.paidOf(detail.id) <= 0 || app.outstandingOf(detail) <= 0}
                onClick={() => {
                  setCarryTarget(detail);
                  setDetail(null);
                }}
              >
                Carry Forward
              </Button>
              {app.outstandingOf(detail) > 0 && (
                <Button
                  icon="payments"
                  disabled={!canPay}
                  onClick={() => {
                    setPayTarget(detail);
                    setDetail(null);
                  }}
                >
                  Catat Pembayaran
                </Button>
              )}
            </>
          )
        }
      >
        {detail && <InvoiceDetail invoice={detail} />}
      </Drawer>

      {gabunganOpen && <ConsolidatedInvoiceModal onClose={() => setGabunganOpen(false)} />}
      {reviseTarget && <ReviseInvoiceModal invoice={reviseTarget} onClose={() => setReviseTarget(null)} />}
      {carryTarget && <CarryForwardModal invoice={carryTarget} onClose={() => setCarryTarget(null)} />}

      {/* Bulk billing modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} width="max-w-3xl" title="Penagihan Surat Jalan Belum Diinvoice" subtitle="Sistem mengelompokkan dokumen per pelanggan; satu klik menerbitkan satu invoice">
        <BulkTaxField />
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <Field label="Nomor Invoice Manual (opsional)">
            <Input value={manualNo} onChange={(e) => setManualNo(e.target.value)} placeholder="Kosongkan untuk otomatis" />
          </Field>
          <Field label="Tanggal Invoice Manual (opsional)">
            <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
          </Field>
        </div>
        {unbilled.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Semua surat jalan periode berjalan sudah diterbitkan invoice.</p>}
        <div className="flex flex-col gap-space-sm">
          {unbilled.map((g) => (
            <div key={g.c.id} className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
              <div className="min-w-0">
                <p className="font-label-lg text-label-lg text-primary">{g.c.name}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {g.list.length} surat jalan • {num(g.list.reduce((s, r) => s + r.volume * r.trips, 0))} m³ • termin {g.c.term} hari
                </p>
              </div>
                <div className="flex items-center gap-space-md">
                  <div className="flex flex-col items-end gap-1 min-w-[120px]">
                    <p className="font-mono font-bold text-primary">{rupiah(g.dpp + Math.round(g.dpp * (app.bulkTaxRate ?? app.tax.ppnRate)))}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      DPP {rupiahShort(g.dpp)} + PPN {((app.bulkTaxRate ?? app.tax.ppnRate) * 100).toFixed(2).replace(".", ",")}% {rupiahShort(Math.round(g.dpp * (app.bulkTaxRate ?? app.tax.ppnRate)))}
                    </p>
                    <input
                      type="number"
                      value={termByCustomer[g.c.id] ?? g.c.term}
                      onChange={(e) => setTermByCustomer({ ...termByCustomer, [g.c.id]: Number(e.target.value) || g.c.term })}
                      className="w-20 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-right font-mono text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  <Button
                    size="sm"
                    icon="receipt_long"
                    onClick={async () => {
                      const inv = await app.createInvoice(g.list.map((r) => r.id), { ppnRate: app.bulkTaxRate ?? app.tax.ppnRate, term: termByCustomer[g.c.id] ?? g.c.term, no: manualNo, date: manualDate || undefined });
                      if (inv && unbilled.length === 1) setBulkOpen(false);
                    }}
                  >
                    Terbitkan
                  </Button>
                </div>
            </div>
          ))}
        </div>
      </Modal>
    </PageBody>
  );
}

/** Input tarif pajak manual untuk penagihan massal (dibaca per-render oleh blok di bawah). */
function BulkTaxField() {
  const app = useApp();
  const rate = app.bulkTaxRate ?? app.tax.ppnRate;
  return (
    <div className="mb-space-md grid grid-cols-1 gap-space-sm sm:grid-cols-3">
      <Field label="Tarif Pajak PPN (%) — dapat diisi manual" hint={`Default sistem ${(app.tax.ppnRate * 100).toFixed(2).replace(".", ",")}%`}>
        <Input
          type="number"
          step="0.01"
          value={Number((rate * 100).toFixed(2))}
          onChange={(e) => app.setBulkTaxRate(Number(e.target.value) / 100)}
        />
      </Field>
      <div className="col-span-1 flex items-end gap-space-sm sm:col-span-2">
        <Button size="sm" variant="secondary" icon="bookmark" onClick={() => app.setTaxRate(rate)}>
          Jadikan Tarif Default
        </Button>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Tarif ini dipakai untuk setiap invoice yang diterbitkan dari daftar di bawah.
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, foot, icon, tone = "navy", accent }: { label: string; value: string; foot: string; icon: string; tone?: "navy" | "amber"; accent?: "error" }) {
  return (
    <Card accentTop={accent === "error" ? "bg-error" : tone === "amber" ? "bg-secondary-container" : "bg-primary"} className="min-w-[220px] flex-1">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
          <span className={cn("mt-1 font-numeric-metric tabular", accent === "error" ? "text-error" : "text-primary")}>{value}</span>
        </div>
        <span className={cn("rounded-lg p-2", accent === "error" ? "bg-error-container text-error" : tone === "amber" ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-fixed text-primary")}>
          <Icon name={icon} size={22} />
        </span>
      </div>
      <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">{foot}</p>
    </Card>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const app = useApp();
  const rows = app.sj.filter((r) => invoice.sjIds.includes(r.id));
  const payments = app.payments.filter((p) => p.invoiceId === invoice.id);
  const paid = app.paidOf(invoice.id);
  const due = app.outstandingOf(invoice);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid grid-cols-2 gap-space-sm">
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">Total Tagihan</span>
          <p className="font-headline-md text-headline-md text-primary tabular">{rupiah(invoice.total)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">Sisa Kewajiban</span>
          <p className={cn("font-headline-md text-headline-md tabular", due > 0 ? "text-error" : "text-success")}>{rupiah(due)}</p>
        </div>
      </div>
      <ProgressBar value={pct(paid, invoice.total)} tone={due > 0 ? "bg-secondary-container" : "bg-success"} height="h-3" />
      <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
        <span>Dibayar {rupiah(paid)}</span>
        <span>{pct(paid, invoice.total).toFixed(1)}% dari total</span>
      </div>

      {invoice.kind === "Gabungan" && (
        <div className="flex flex-wrap items-center gap-space-sm rounded-xl bg-primary p-space-sm text-on-primary">
          <Icon name="call_merge" size={20} className="text-secondary-container" />
          <span className="font-label-md text-label-md">
            Invoice gabungan — ditagihkan kepada <b>{app.customers.find((c) => c.id === invoice.customerId)?.name}</b>
          </span>
          <Pill tone="amber">{invoice.coveredCustomerIds?.length ?? 1} pelanggan asal muatan</Pill>
        </div>
      )}
      {invoice.carryFromInvoiceId && (
        <p className="rounded-xl bg-secondary-fixed px-space-sm py-2 font-body-sm text-body-sm text-on-secondary-fixed">
          Carry forward dari {app.invoices.find((i) => i.id === invoice.carryFromInvoiceId)?.no ?? "-"} — memuat sisa surat jalan yang belum tertutup pembayaran.
        </p>
      )}

      <SectionHeading
        icon="attach_file"
        title="Surat Jalan Terlampir & Alokasi Pembayaran"
        subtitle={`${rows.length} dokumen muatan • ${new Set(rows.map((r) => r.customerId)).size} pelanggan asal • lampiran cetak ${new Set(rows.map((r) => r.customerId)).size} halaman (per pelanggan)`}
      />
      <div className="overflow-hidden rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th>Dokumen</Th>
              <Th>Komoditas</Th>
              <Th align="right">Volume</Th>
              <Th align="right">Nilai</Th>
              <Th align="right">Status Alokasi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {app.invoiceCoverage(invoice.id).map((x) => (
              <tr key={x.sj.id}>
                <Td>
                  <span className="font-label-md text-label-md text-primary">{x.sj.no}</span>
                  <span className="block text-[11px] text-on-surface-variant">
                    {d(parseISO(x.sj.date))} • asal {app.customers.find((c) => c.id === x.sj.customerId)?.name}
                  </span>
                </Td>
                <Td>{commodityName(x.sj.commodityId)}</Td>
                <Td align="right" className="font-mono">{num(x.sj.volume * x.sj.trips)} m³</Td>
                <Td align="right" className="font-mono">{rupiah(x.value)}</Td>
                <Td align="right">
                  {x.covered <= 0 ? (
                    <Pill tone="error">Belum terbayar</Pill>
                  ) : x.remaining > 0 ? (
                    <Pill tone="amberSoft">Sebagian {rupiahShort(x.covered)}</Pill>
                  ) : (
                    <Pill tone="success">Tertutup</Pill>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-space-sm">
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">DPP</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(invoice.dpp)}</p>
        </div>
        <div className="rounded-lg bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
            {app.taxRateLabel(invoice.ppnRate)}
            {invoice.ppnRate !== undefined && Math.abs(invoice.ppnRate - 0.11) > 0.0001 ? " · tarif manual" : " · tarif default"}
          </span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(invoice.ppn)}</p>
        </div>
      </div>

      <SectionHeading icon="account_balance_wallet" title="Riwayat Pembayaran" subtitle={`${payments.length} transaksi tercatat`} />
      <div className="flex flex-col divide-y divide-surface-container">
        {payments.length === 0 && <p className="rounded-lg bg-secondary-fixed/40 p-space-sm font-body-sm text-body-sm text-on-secondary-fixed">Belum ada pembayaran diterima untuk invoice ini.</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-space-sm first:pt-0">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-primary">
                {p.method} · {d(parseISO(p.date))}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {app.accountsWithBalance.find((a) => a.id === p.accountId)?.name} • ref {p.ref}
              </span>
            </div>
            <span className="font-mono font-semibold text-success">{rupiah(p.amount)}</span>
          </div>
        ))}
      </div>

      <SectionHeading icon="history" title="Audit Trail Invoice" subtitle="Riwayat penerbitan, revisi, carry forward & pembayaran" />
      <div className="flex flex-col divide-y divide-surface-container">
        {[...(invoice.revisions ?? [])].reverse().map((r) => (
          <div key={r.id} className="flex items-start gap-space-sm py-2 first:pt-0">
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                r.type === "Terbit" ? "bg-primary-fixed text-primary" : r.type === "Revisi" ? "bg-secondary-fixed text-on-secondary-fixed" : r.type === "Carry Forward" ? "bg-secondary-container text-on-secondary-fixed" : "bg-success-container text-success",
              )}
            >
              <Icon name={r.type === "Terbit" ? "receipt_long" : r.type === "Revisi" ? "rule" : r.type === "Carry Forward" ? "east" : "payments"} size={15} />
            </span>
            <span className="min-w-0">
              <span className="block font-label-md text-label-md text-on-surface">
                {r.type} · {d(parseISO(r.date))}
              </span>
              <span className="block font-body-sm text-body-sm text-on-surface-variant">{r.detail}</span>
              <span className="font-label-sm text-[10px] uppercase text-outline">{r.by}</span>
            </span>
          </div>
        ))}
        {(invoice.revisions ?? []).length === 0 && <p className="py-2 font-body-sm text-body-sm text-on-surface-variant">Belum ada riwayat perubahan.</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-space-sm py-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Kelayakan revisi</span>
        {app.canRevise(invoice).ok ? <Pill tone="success">Invoice terbit &amp; belum dibayar — dapat direvisi</Pill> : <Pill tone="error">{app.canRevise(invoice).reason}</Pill>}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Status sistem</span>
        <StatusPill status={app.computedStatus(invoice)} />
      </div>
      <div className="flex items-center gap-2">
        <Pill tone="outline">Termin {app.customers.find((c) => c.id === invoice.customerId)?.term} hari</Pill>
        <Pill tone="outline">Terbit {d(parseISO(invoice.date))}</Pill>
        <Pill tone={daysBetween(new Date(invoice.dueDate), TODAY()) > 0 && due > 0 ? "error" : "neutral"}>
          {daysBetween(new Date(invoice.dueDate), TODAY()) > 0 ? `${daysBetween(new Date(invoice.dueDate), TODAY())} hari lewat tempo` : `Jatuh tempo ${d(parseISO(invoice.dueDate))}`}
        </Pill>
      </div>
    </div>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSave: (p: { amount: number; accountId: string; method: "Transfer" | "Tunai" | "Giro"; date: string; ref: string }) => void;
}) {
  const app = useApp();
  const due = app.outstandingOf(invoice);
  const [amount, setAmount] = useState(due);
  const [accountId, setAccountId] = useState("A-001");
  const [method, setMethod] = useState<"Transfer" | "Tunai" | "Giro">("Transfer");
  const [date, setDate] = useState(iso(TODAY()));
  const [ref, setRef] = useState(`TRF/${invoice.no}/PT`);

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat Pembayaran Invoice"
      subtitle={`${invoice.no} • sisa kewajiban ${rupiah(due)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="secondary" onClick={() => setAmount(due)}>
            Isi Sisa Penuh
          </Button>
          <Button
            icon="save"
            disabled={!app.can("invoice", "edit")}
            onClick={() => {
              if (amount <= 0) {
                app.toast("Nominal pembayaran tidak valid", undefined, "warn");
                return;
              }
              if (amount > due) {
                app.toast("Nominal melebihi sisa kewajiban", `Maksimal ${rupiah(due)}`, "error");
                return;
              }
              onSave({ amount, accountId, method, date, ref });
            }}
          >
            Simpan Pembayaran
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Nominal Pembayaran (Rp)" className="sm:col-span-2">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Rekening Penerima">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — saldo {rupiahShort(a.balance)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Metode Pembayaran">
          <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            {["Transfer", "Tunai", "Giro"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tanggal Terima">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Referensi Transfer">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-xl bg-surface-container-low p-space-md">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Status setelah pembayaran</span>
        <StatusPill status={amount >= due ? "Lunas" : "Sebagian"} />
      </div>
    </Modal>
  );
}


/* ============================================================
   Modal 1 — Penerbitan Invoice Gabungan
   ============================================================ */
function ConsolidatedInvoiceModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const unbilled = app.sj.filter((r) => !r.invoiceId && r.status !== "Batal");
  const groups = app.customers
    .map((c) => ({ c, list: unbilled.filter((r) => r.customerId === c.id) }))
    .filter((g) => g.list.length > 0)
    .sort((a, b) => b.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0) - a.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0));

  const [billTo, setBillTo] = useState(groups[0]?.c.id ?? app.customers[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyBillTo, setOnlyBillTo] = useState(false);
  const [term, setTerm] = useState(app.customers.find((c) => c.id === (groups[0]?.c.id ?? app.customers[0].id))?.term ?? 30);
  const [note, setNote] = useState("");
  const [ppnPct, setPpnPct] = useState(Number((app.tax.ppnRate * 100).toFixed(2)));
  const [saveDefault, setSaveDefault] = useState(false);
  const ppnRate = Math.max(0, Math.min(100, ppnPct)) / 100;

  const visibleGroups = onlyBillTo ? groups.filter((g) => g.c.id === billTo) : groups;
  const rows = unbilled.filter((r) => selected.includes(r.id));
  const dpp = rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const ppn = Math.round(dpp * ppnRate);
  const asal = [...new Set(rows.map((r) => r.customerId))];
  const billToCustomer = app.customers.find((c) => c.id === billTo)!;
  const billToHasSj = rows.some((r) => r.customerId === billTo);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-5xl"
      title="Penerbitan Invoice Gabungan"
      subtitle="Satu invoice ditagihkan kepada satu pelanggan penagih (bill to), dapat mencakup surat jalan dari beberapa pelanggan/kontraktor yang berbeda."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="secondary" icon="checklist" onClick={() => setSelected(visibleGroups.flatMap((g) => g.list.map((r) => r.id)))}>
            Pilih Semua Tampil
          </Button>
          <Button
            icon="call_merge"
            disabled={!rows.length}
            onClick={async () => {
              const inv = await app.createInvoice(rows.map((r) => r.id), { billTo, term, note: note || undefined, kind: asal.length > 1 ? "Gabungan" : "Reguler", ppnRate, saveRateAsDefault: saveDefault });
              if (inv) onClose();
            }}
          >
            Terbitkan Invoice ({rows.length} SJ)
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-3">
        <Field label="Ditagihkan Kepada (Bill To)" hint={`${billToCustomer.city} • ${billToCustomer.contact}`}>
          <Select value={billTo} onChange={(e) => { setBillTo(e.target.value); setTerm(app.customers.find((c) => c.id === e.target.value)?.term ?? 30); }}>
            {app.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Termin Pembayaran (hari)">
          <Input type="number" value={term} onChange={(e) => setTerm(Number(e.target.value))} />
        </Field>
        <Field label="Tarif Pajak PPN (%) — dapat diisi manual" hint={`Default sistem ${(app.tax.ppnRate * 100).toFixed(2).replace(".", ",")}% • contoh: 11, 1.5, 0`}>
          <Input type="number" step="0.01" value={ppnPct} onChange={(e) => setPpnPct(Number(e.target.value))} />
        </Field>
        <Field label="Catatan Invoice" className="sm:col-span-1">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. penagihan gabungan periode 01–15 Okt" />
        </Field>
      </div>

      <label className="mt-space-sm flex items-center gap-2 rounded-lg bg-surface-container-low px-space-sm py-2">
        <input type="checkbox" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} className="h-4 w-4 accent-[#00274e]" />
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Simpan {ppnPct}% sebagai tarif pajak default sistem untuk penerbitan invoice berikutnya
        </span>
      </label>

      <label className="mt-space-sm flex items-center gap-2 rounded-lg bg-surface-container-low px-space-sm py-2">
        <input type="checkbox" checked={onlyBillTo} onChange={(e) => setOnlyBillTo(e.target.checked)} className="h-4 w-4 accent-[#00274e]" />
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Tampilkan hanya surat jalan milik {billToCustomer.name}
        </span>
      </label>

      <div className="mt-space-md flex flex-col gap-space-sm">
        {visibleGroups.map((g) => (
          <div key={g.c.id} className="overflow-hidden rounded-xl bg-surface-container-low">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high px-space-sm py-2">
              <span className="flex items-center gap-2">
                <Icon name="business" size={16} className="text-primary" />
                <span className="font-label-md text-label-md text-primary">{g.c.name}</span>
                {g.c.id === billTo ? <Pill tone="navy">Penagih</Pill> : <Pill tone="outline">Asal muatan</Pill>}
                <span className="font-body-sm text-body-sm text-on-surface-variant">{g.list.length} surat jalan • termin {g.c.term} hari</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-semibold text-primary">{rupiah(g.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0))}</span>
                <button
                  type="button"
                  onClick={() => {
                    const ids = g.list.map((r) => r.id);
                    const all = ids.every((id) => selected.includes(id));
                    setSelected(all ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
                  }}
                  className="rounded-lg bg-surface-container-lowest px-2 py-1 font-label-sm text-[10px] uppercase text-primary hover:bg-surface-container-high"
                >
                  pilih grup
                </button>
              </span>
            </div>
            <table className="w-full border-collapse text-left">
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {g.list.map((r) => (
                  <tr key={r.id} className={cn("cursor-pointer hover:bg-surface-container-lowest/60", selected.includes(r.id) && "bg-secondary-fixed/30")} onClick={() => toggle(r.id)}>
                    <Td align="center" className="w-10">
                      <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[#00274e]" />
                    </Td>
                    <Td>
                      <span className="font-label-md text-label-md text-primary">{r.no}</span>
                      <span className="block text-[11px] text-on-surface-variant">{d(parseISO(r.date))} • {commodityName(r.commodityId)}</span>
                    </Td>
                    <Td align="right" className="font-mono">{num(r.volume * r.trips)} m³</Td>
                    <Td align="right" className="font-mono font-semibold text-primary">{rupiah(r.volume * r.trips * r.price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {visibleGroups.length === 0 && <EmptyState icon="inbox" title="Tidak ada surat jalan belum diinvoice" detail="Semua dokumen pada pelanggan ini sudah diterbitkan invoice." />}
      </div>

      <div className="mt-space-md grid grid-cols-1 gap-space-sm sm:grid-cols-4">
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Surat jalan terpilih</span>
          <p className="font-headline-md text-headline-md text-primary">{rows.length}</p>
          <span className="font-label-sm text-[10px] text-on-surface-variant">{asal.length} pelanggan asal • {num(rows.reduce((s, r) => s + r.volume * r.trips, 0))} m³</span>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">DPP (belum PPN)</span>
          <p className="font-headline-md text-headline-md text-primary tabular">{rupiah(dpp)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Pajak PPN {ppnPct}%</span>
          <p className="font-headline-md text-headline-md text-primary tabular">{rupiah(ppn)}</p>
        </div>
        <div className="rounded-xl bg-primary p-space-sm text-on-primary">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary-fixed-dim">Total ditagihkan</span>
          <p className="font-headline-md text-headline-md tabular">{rupiah(dpp + ppn)}</p>
          <span className="font-label-sm text-[10px] text-primary-fixed-dim">Jatuh tempo {term} hari dari terbit</span>
        </div>
      </div>
      {rows.length > 0 && !billToHasSj && (
        <p className="mt-space-sm rounded-xl bg-secondary-fixed px-space-sm py-2 font-body-sm text-body-sm text-on-secondary-fixed">
          Perhatian: tidak ada surat jalan atas nama <b>{billToCustomer.name}</b> pada pilihan ini — seluruh dokumen akan ditagihkan kepada pelanggan penagih tersebut (invoice gabungan antar pelanggan).
        </p>
      )}
    </Modal>
  );
}

/* ============================================================
   Modal 2 — Revisi Invoice (tambah / kurangi surat jalan)
   ============================================================ */
function ReviseInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const app = useApp();
  const check = app.canRevise(invoice);
  const current = app.sj.filter((r) => invoice.sjIds.includes(r.id));
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [note, setNote] = useState(invoice.note ?? "");
  const [allCustomers, setAllCustomers] = useState(invoice.kind === "Gabungan");
  const [ppnPct, setPpnPct] = useState(Number(((invoice.ppnRate ?? app.tax.ppnRate) * 100).toFixed(2)));
  const ppnRate = Math.max(0, Math.min(100, ppnPct)) / 100;

  const available = app.sj.filter(
    (r) => !r.invoiceId && r.status !== "Batal" && (allCustomers || r.customerId === invoice.customerId),
  );
  const availableByCustomer = app.customers
    .map((c) => ({ c, list: available.filter((r) => r.customerId === c.id) }))
    .filter((g) => g.list.length > 0)
    .sort((a, b) => b.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0) - a.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0));
  const kept = current.filter((r) => !removeIds.includes(r.id));
  const added = available.filter((r) => addIds.includes(r.id));
  const finalRows = [...kept, ...added];
  const dpp = finalRows.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
  const ppn = Math.round(dpp * ppnRate);
  const total = dpp + ppn;
  const delta = total - invoice.total;

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-5xl"
      title={`Revisi Invoice — ${invoice.no}`}
      subtitle="Tambah atau kurangi surat jalan pada invoice yang sudah terbit namun belum dibayar; nilai, PPN, dan total dihitung ulang otomatis."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="rule"
            disabled={!check.ok || finalRows.length === 0 || (!removeIds.length && !added.length)}
            onClick={async () => {
              const inv = await app.reviseInvoice(invoice.id, { addSjIds: addIds, removeSjIds: removeIds, note, ppnRate });
              if (inv) onClose();
            }}
          >
            Simpan Revisi
          </Button>
        </>
      }
    >
      {!check.ok && (
        <p className="mb-3 rounded-xl bg-error-container px-space-sm py-2 font-body-sm text-body-sm text-on-error-container">
          <b>Revisi tidak tersedia.</b> {check.reason}
        </p>
      )}

      <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
        {/* kurangi */}
        <div className="flex flex-col gap-space-sm">
          <SectionHeading icon="remove_circle" title="Surat Jalan dalam Invoice Ini" subtitle="Centang dokumen yang ingin dikeluarkan (kembali menjadi belum diinvoice)" />
          <div className="overflow-hidden rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {current.map((r) => (
                  <tr key={r.id} className={cn("cursor-pointer hover:bg-surface-container-lowest/60", removeIds.includes(r.id) && "bg-error-container/30 line-through")} onClick={() => setRemoveIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}>
                    <Td align="center" className="w-10">
                      <input type="checkbox" checked={removeIds.includes(r.id)} onChange={() => setRemoveIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="h-4 w-4 accent-[#ba1a1a]" />
                    </Td>
                    <Td>
                      <span className="font-label-md text-label-md text-primary">{r.no}</span>
                      <span className="block text-[11px] text-on-surface-variant">
                        {d(parseISO(r.date))} • {app.customers.find((c) => c.id === r.customerId)?.name}
                      </span>
                    </Td>
                    <Td align="right" className="font-mono">{rupiah(r.volume * r.trips * r.price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sisa setelah revisi: <b className="text-primary">{finalRows.length} surat jalan</b> ({rupiah(kept.reduce((s, r) => s + r.volume * r.trips * r.price, 0))})
          </p>
        </div>

        {/* tambah */}
        <div className="flex flex-col gap-space-sm">
          <SectionHeading icon="add_circle" title="Surat Jalan Tersedia" subtitle="Dokumen belum diinvoice yang dapat ditambahkan ke invoice ini" />
          <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-space-sm py-2">
            <input type="checkbox" checked={allCustomers} onChange={(e) => setAllCustomers(e.target.checked)} className="h-4 w-4 accent-[#00274e]" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Tampilkan surat jalan seluruh pelanggan (jadikan invoice gabungan)</span>
          </label>
          <div className="max-h-72 overflow-y-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {allCustomers ? availableByCustomer.map((g) => (
                  <div key={g.c.id}>
                    <tr className="bg-surface-container-lowest font-label-md text-label-md font-bold text-primary">
                      <Td colSpan={4}>{g.c.name} • {g.list.length} SJ • {rupiah(g.list.reduce((s, r) => s + r.volume * r.trips * r.price, 0))}</Td>
                    </tr>
                    {g.list.map((r) => (
                      <tr key={r.id} className={cn("cursor-pointer hover:bg-surface-container-lowest/60", addIds.includes(r.id) && "bg-secondary-fixed/40")} onClick={() => setAddIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}>
                        <Td align="center" className="w-10">
                          <input type="checkbox" checked={addIds.includes(r.id)} onChange={() => setAddIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="h-4 w-4 accent-[#00274e]" />
                        </Td>
                        <Td>
                          <span className="font-label-md text-label-md text-primary">{r.no}</span>
                          <span className="block text-[11px] text-on-surface-variant">
                            {d(parseISO(r.date))} • {num(r.volume * r.trips)} m³
                          </span>
                        </Td>
                        <Td align="right" className="font-mono">{rupiah(r.volume * r.trips * r.price)}</Td>
                        <Td align="right" className="font-mono text-on-surface-variant">{vehiclePlate(r.vehicleId)}</Td>
                      </tr>
                    ))}
                  </div>
                )) : available.map((r) => (
                  <tr key={r.id} className={cn("cursor-pointer hover:bg-surface-container-lowest/60", addIds.includes(r.id) && "bg-secondary-fixed/40")} onClick={() => setAddIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}>
                    <Td align="center" className="w-10">
                      <input type="checkbox" checked={addIds.includes(r.id)} onChange={() => setAddIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="h-4 w-4 accent-[#00274e]" />
                    </Td>
                    <Td>
                      <span className="font-label-md text-label-md text-primary">{r.no}</span>
                      <span className="block text-[11px] text-on-surface-variant">
                        {d(parseISO(r.date))} • {app.customers.find((c) => c.id === r.customerId)?.name} • {num(r.volume * r.trips)} m³
                      </span>
                    </Td>
                    <Td align="right" className="font-mono">{rupiah(r.volume * r.trips * r.price)}</Td>
                  </tr>
                ))}
                {available.length === 0 && <tr><Td colSpan={4} className="p-space-sm font-body-sm text-body-sm text-on-surface-variant">Tidak ada surat jalan tersedia untuk ditambahkan.</Td></tr>}
              </tbody>
            </table>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Ditambahkan: <b className="text-primary">{added.length} surat jalan</b> ({rupiah(added.reduce((s, r) => s + r.volume * r.trips * r.price, 0))})
          </p>
        </div>
      </div>

      {/* rekapitulasi */}
      <div className="mt-space-md grid grid-cols-2 gap-space-sm lg:grid-cols-5">
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Total sebelum</span>
          <p className="font-label-lg text-label-lg text-on-surface-variant tabular">{rupiah(invoice.total)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">DPP baru</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(dpp)}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Pajak PPN {ppnPct}% baru</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(ppn)}</p>
        </div>
        <div className="rounded-xl bg-primary p-space-sm text-on-primary">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary-fixed-dim">Total baru</span>
          <p className="font-headline-sm text-headline-sm tabular">{rupiah(total)}</p>
        </div>
        <div className={cn("rounded-xl p-space-sm", delta >= 0 ? "bg-success-container" : "bg-error-container")}>
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Selisih</span>
          <p className={cn("font-label-lg text-label-lg tabular", delta >= 0 ? "text-success" : "text-error")}>
            {delta >= 0 ? "+" : "-"} {rupiah(Math.abs(delta))}
          </p>
        </div>
      </div>

      <div className="mt-space-md grid grid-cols-1 gap-space-md sm:grid-cols-3">
        <Field label="Tarif Pajak PPN (%) — dapat diisi manual" hint={`Tarif invoice saat ini ${((invoice.ppnRate ?? 0.11) * 100).toFixed(2).replace(".", ",")}%`}>
          <Input type="number" step="0.01" value={ppnPct} onChange={(e) => setPpnPct(Number(e.target.value))} />
        </Field>
        <Field label="Catatan Revisi (opsional)" className="sm:col-span-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. SJ/BL-1145 salah pelanggan, diganti SJ/BL-1190" />
        </Field>
      </div>

      <div className="mt-space-sm flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
        <Icon name="fact_check" size={18} className="text-secondary" />
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Revisi dicatat pada audit trail invoice ({invoice.revisions?.length ?? 0} riwayat) dan hanya dapat dilakukan selama invoice <b>belum menerima pembayaran</b>.
        </span>
      </div>
    </Modal>
  );
}

/* ============================================================
   Modal 3 — Carry Forward sisa surat jalan
   ============================================================ */
function CarryForwardModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const app = useApp();
  const coverage = app.invoiceCoverage(invoice.id);
  const paid = app.paidOf(invoice.id);
  const outstanding = app.outstandingOf(invoice);
  const [ids, setIds] = useState<string[]>([]);
  const [date, setDate] = useState(iso(TODAY()));
  const [term, setTerm] = useState(app.customers.find((c) => c.id === invoice.customerId)?.term ?? 30);
  const [note, setNote] = useState("");
  const [ppnPct, setPpnPct] = useState(Number(((invoice.ppnRate ?? app.tax.ppnRate) * 100).toFixed(2)));
  const ppnRate = Math.max(0, Math.min(100, ppnPct)) / 100;

  const carried = coverage.filter((x) => ids.includes(x.sj.id));
  const kept = coverage.filter((x) => !ids.includes(x.sj.id));
  const carriedDpp = carried.reduce((s, x) => s + x.value, 0);
  const carriedPpn = Math.round(carriedDpp * ppnRate);
  const carriedTotal = carriedDpp + carriedPpn;
  const keptDpp = kept.reduce((s, x) => s + x.value, 0);
  const keptTotal = keptDpp + Math.round(keptDpp * ppnRate);
  const overLimit = carriedDpp > outstanding;
  const noKept = kept.length === 0;
  const valid = carried.length > 0 && !overLimit && !noKept;

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-5xl"
      title={`Carry Forward Sisa Surat Jalan — ${invoice.no}`}
      subtitle="Untuk invoice dengan pembayaran bertahap: pindahkan surat jalan yang belum tertutup pembayaran ke invoice baru agar tetap dapat ditagihkan."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="secondary" icon="checklist" onClick={() => setIds(coverage.filter((x) => x.covered === 0).map((x) => x.sj.id))}>
            Pilih Semua Belum Tertutup
          </Button>
          <Button
            variant="amber"
            icon="east"
            disabled={!valid}
            onClick={async () => {
              const inv = await app.carryForward(invoice.id, ids, { date, term, note: note || undefined, ppnRate });
              if (inv) onClose();
            }}
          >
            Buat Invoice Carry Forward
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4">
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Total invoice</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(invoice.total)}</p>
        </div>
        <div className="rounded-xl bg-success-container p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Sudah dibayar</span>
          <p className="font-label-lg text-label-lg text-success tabular">{rupiah(paid)}</p>
        </div>
        <div className="rounded-xl bg-error-container p-space-sm">
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Sisa belum dibayar</span>
          <p className="font-label-lg text-label-lg text-error tabular">{rupiah(outstanding)}</p>
        </div>
        <div className="rounded-xl bg-secondary-fixed p-space-sm text-on-secondary-fixed">
          <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary">Nilai carry forward</span>
          <p className="font-label-lg text-label-lg text-secondary tabular">{rupiah(carriedTotal)}</p>
          <span className="font-label-sm text-[10px]">Maks. DPP {rupiah(outstanding)}</span>
        </div>
      </div>

      <div className="mt-space-md overflow-hidden rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th align="center">Pilih</Th>
              <Th>Surat Jalan</Th>
              <Th align="center">Asal Muatan</Th>
              <Th align="right">Nilai</Th>
              <Th align="right">Tertutup Pembayaran</Th>
              <Th align="right">Belum Tertutup</Th>
              <Th align="center">Alokasi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {coverage.map((x) => {
              const locked = x.covered > 0;
              return (
                <tr key={x.sj.id} className={cn("hover:bg-surface-container-lowest/60", ids.includes(x.sj.id) && "bg-secondary-fixed/30", locked && "opacity-70")}>
                  <Td align="center">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${x.sj.no}`}
                      checked={ids.includes(x.sj.id)}
                      disabled={locked}
                      onChange={() => setIds((p) => (p.includes(x.sj.id) ? p.filter((r) => r !== x.sj.id) : [...p, x.sj.id]))}
                      className="h-4 w-4 accent-[#00274e]"
                    />
                  </Td>
                  <Td>
                    <span className="font-label-md text-label-md text-primary">{x.sj.no}</span>
                    <span className="block text-[11px] text-on-surface-variant">
                      {d(parseISO(x.sj.date))} • {commodityName(x.sj.commodityId)} • {num(x.sj.volume * x.sj.trips)} m³
                    </span>
                  </Td>
                  <Td align="center" className="text-[11px]">{app.customers.find((c) => c.id === x.sj.customerId)?.name}</Td>
                  <Td align="right" className="font-mono">{rupiah(x.value)}</Td>
                  <Td align="right" className="font-mono text-success">{x.covered > 0 ? rupiah(x.covered) : "—"}</Td>
                  <Td align="right" className={cn("font-mono", x.remaining > 0 ? "text-error" : "text-on-surface-variant")}>{x.remaining > 0 ? rupiah(x.remaining) : "—"}</Td>
                  <Td align="center">
                    {locked ? <Pill tone="outline">Terkunci — sudah dibayar</Pill> : <Pill tone="amberSoft">Dapat diteruskan</Pill>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
              <Td colSpan={3}>Ringkasan</Td>
              <Td align="right" className="font-mono">{rupiah(coverage.reduce((s, x) => s + x.value, 0))}</Td>
              <Td align="right" className="font-mono text-success">{rupiah(paid)}</Td>
              <Td align="right" className="font-mono text-error">{rupiah(outstanding)}</Td>
              <Td align="center" className="font-label-sm text-label-sm">{carried.length} SJ dipilih</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-space-md grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Tanggal Invoice Baru">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Termin Invoice Baru (hari)">
          <Input type="number" value={term} onChange={(e) => setTerm(Number(e.target.value))} />
        </Field>
        <Field label="Tarif Pajak PPN (%) — dapat diisi manual" hint={`Mewarisi tarif invoice asal ${((invoice.ppnRate ?? 0.11) * 100).toFixed(2).replace(".", ",")}%`}>
          <Input type="number" step="0.01" value={ppnPct} onChange={(e) => setPpnPct(Number(e.target.value))} />
        </Field>
        <Field label="Catatan (opsional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. penagihan tahap kedua" />
        </Field>
      </div>

      {overLimit && (
        <p className="mt-space-sm rounded-xl bg-error-container px-space-sm py-2 font-body-sm text-body-sm text-on-error-container">
          Nilai DPP carry forward {rupiah(carriedDpp)} melebihi sisa tagihan {rupiah(outstanding)}. Turunkan pilihan surat jalan (pembayaran yang sudah diterima harus tetap tertutup).
        </p>
      )}
      {noKept && carried.length > 0 && (
        <p className="mt-space-sm rounded-xl bg-secondary-fixed px-space-sm py-2 font-body-sm text-body-sm text-on-secondary-fixed">
          Invoice asal harus menyisakan minimal satu surat jalan sebagai dasar pembayaran yang sudah diterima. Minimal sisakan satu dokumen (mis. surat jalan tertua yang sudah tertutup pembayaran).
        </p>
      )}

      <div className="mt-space-md grid grid-cols-1 gap-space-sm lg:grid-cols-2">
        <div className="rounded-xl bg-surface-container-low p-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Invoice asal {invoice.no} setelah carry forward</span>
          <p className="font-label-lg text-label-lg text-primary tabular">{rupiah(keptTotal)}</p>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {kept.length} surat jalan • dibayar {rupiah(paid)} → status{" "}
            {paid >= keptTotal - 1 ? <b className="text-success">Lunas</b> : <b className="text-secondary">Tetap Sebagian</b>}
          </span>
        </div>
        <div className="rounded-xl bg-secondary-fixed p-space-sm text-on-secondary-fixed">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Invoice baru (carry forward)</span>
          <p className="font-label-lg text-label-lg font-bold text-secondary tabular">{rupiah(carriedTotal)}</p>
          <span className="font-body-sm text-body-sm text-on-secondary-fixed-variant">
            {carried.length} surat jalan • DPP {rupiah(carriedDpp)} • PPN {ppnPct}% = {rupiah(carriedPpn)} • jatuh tempo {term} hari dari {d(parseISO(date))} • status Belum Jatuh Tempo
          </span>
        </div>
      </div>
    </Modal>
  );
}

