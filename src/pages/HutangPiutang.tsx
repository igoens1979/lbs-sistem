import { useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { Button, Card, EmptyState, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, StatusPill, Td, Th } from "@/components/ui";
import { legacyOutstanding, type Invoice } from "@/lib/data";
import { cn, csvDownload, d, daysBetween, iso, num, parseISO, pct, rupiah, rupiahPlain, rupiahShort, TODAY } from "@/lib/format";
import { printStatement } from "@/lib/print";
import { useApp } from "@/lib/store";

export default function HutangPiutang() {
  const app = useApp();
  const [payCustomer, setPayCustomer] = useState<string | null>(null);
  const [detail, setDetail] = useState<"piutang" | "supplier" | "legacy" | "aging">("piutang");
  const canCreate = app.can("hutang-piutang", "create");
  const canSettle = app.can("hutang-piutang", "edit");

  /* ---------- PIUTANG (kartu per mitra) ---------- */
  const receivables = useMemo(
    () =>
      app.customers
        .map((c) => {
          const invoices = app.invoices.filter((i) => i.customerId === c.id);
          const open = invoices
            .map((i) => ({ inv: i, due: app.outstandingOf(i), late: daysBetween(new Date(i.dueDate), TODAY()) }))
            .filter((x) => x.due > 0)
            .sort((a, b) => b.late - a.late);
          const outstanding = open.reduce((s, x) => s + x.due, 0);
          const overdue = open.filter((x) => x.late > 0).reduce((s, x) => s + x.due, 0);
          const billed = invoices.reduce((s, i) => s + i.total, 0);
          const paid = invoices.reduce((s, i) => s + app.paidOf(i.id), 0);
          return { c, open, outstanding, overdue, billed, paid, maxLate: open[0]?.late ?? 0, count: open.length };
        })
        .filter((r) => r.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding),
    [app],
  );

  const totalPiutang = receivables.reduce((s, r) => s + r.outstanding, 0);
  const totalOverdue = receivables.reduce((s, r) => s + r.overdue, 0);
  const totalPiutangBilled = receivables.reduce((s, r) => s + r.billed, 0);
  const totalPiutangPaid = receivables.reduce((s, r) => s + r.paid, 0);

  /* ---------- HUTANG ---------- */
  const supplierTotal = app.supplierDebtTotal;
  const legacyTotal = app.legacyTotal;
  const legacyOut = app.legacyOutstandingTotal;
  const netto = totalPiutang - (supplierTotal + legacyOut);

  const agingTotal = app.aging.reduce((s, a) => s + a.amount, 0) || 1;
  const selectedCustomer = receivables.find((r) => r.c.id === payCustomer);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Kartu Hutang & Piutang"
        title="Buku Hutang Piutang Perusahaan"
        description="Posisi piutang penagihan per mitra kerja, hutang kepada supplier, serta jadwal kewajiban historis LBS beserta aksi pelunasan."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("hutang-piutang-lbs.csv", [
                ["Kategori", "Nama", "Keterangan", "Total Tagihan", "Sudah Dibayar", "Sisa", "Hari Lewat Tempo"],
                ...receivables.map((r) => [
                  "Piutang",
                  r.c.name,
                  `${r.count} invoice aktif • termin ${r.c.term} hari`,
                  r.billed,
                  r.paid,
                  r.outstanding,
                  Math.max(0, r.maxLate),
                ]),
                ...app.suppliers.map((s) => ["Hutang Supplier", s.name, `${s.category} • termin ${s.dueDays} hari`, s.hutang, 0, s.hutang, 0]),
                ...app.legacyDebts.map((l) => ["Hutang Lama LBS", l.tahap, `${l.kreditur} • ${l.paidCount}/${l.tenor} angsuran`, l.pokok, l.cicilan * l.paidCount, legacyOutstanding(l), 0]),
              ])
            }
            onPrint={() =>
              printStatement(
                receivables.map((r) => ({ name: r.c.name, note: `${r.count} invoice • termin ${r.c.term} hari`, billed: r.billed, paid: r.paid, due: r.outstanding, late: Math.max(0, r.maxLate) })),
                app.suppliers.map((s) => ({ name: s.name, note: `${s.category} • termin ${s.dueDays} hari`, due: s.hutang })),
                app.legacyDebts.map((l) => ({ name: l.tahap, note: `${l.kreditur} • ${l.paidCount}/${l.tenor} angsuran`, due: legacyOutstanding(l) })),
                app.period,
              )
            }
          />
        }
      />

      {/* Posisi ringkas */}
<section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <PosTile top="bg-primary" label="Total Piutang Beredar" value={rupiahShort(totalPiutang)} foot={`${receivables.reduce((s, r) => s + r.count, 0)} invoice aktif • ${receivables.filter((r) => r.outstanding > 0).length} mitra`} icon="request_quote" />
        <PosTile top="bg-error" label="Piutang Lewat Tempo" value={rupiahShort(totalOverdue)} foot={`${pct(totalOverdue, totalPiutang || 1).toFixed(1)}% dari total piutang`} icon="event_busy" tone="error" />
        <PosTile top="bg-secondary-container" label="Hutang Supplier" value={rupiahShort(supplierTotal)} foot={`${app.suppliers.filter((s) => s.hutang > 0).length} supplier dengan saldo`} icon="storefront" />
        <PosTile top="bg-secondary-fixed-dim" label="Hutang Lama LBS" value={rupiahShort(legacyTotal)} foot={`Sisa outstanding ${rupiahShort(legacyOut)}`} icon="history_edu" />
        <Card accentTop={netto >= 0 ? "bg-success" : "bg-error"} className="flex flex-col justify-between">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", netto >= 0 ? "bg-success-container text-success" : "bg-error-container text-error")}>
              <Icon name={netto >= 0 ? "verified" : "warning"} size={20} />
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Posisi Neto</span>
            <span className={cn("font-headline-md text-headline-md font-bold tabular", netto >= 0 ? "text-success" : "text-error")}>{rupiahShort(netto)}</span>
          </div>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Piutang − (hutang supplier + kewajiban historis)
          </p>
        </Card>
      </section>

      {/* Tab navigasi modul */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1">
        {([
          { id: "piutang", label: "Kartu Piutang per Mitra", icon: "groups" },
          { id: "supplier", label: "Hutang Supplier", icon: "storefront" },
          { id: "legacy", label: "Hutang Lama LBS", icon: "history_edu" },
          { id: "aging", label: "Analisis Umur Tagihan", icon: "donut_large" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDetail(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md transition-all",
              detail === t.id ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {detail === "piutang" && (
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
          <SectionHeading
            icon="request_quote"
            title="Kartu Piutang per Mitra Kerja"
            subtitle={`Terbayar ${rupiahShort(totalPiutangPaid)} dari total tagihan ${rupiahShort(totalPiutangBilled)} (${pct(totalPiutangPaid, totalPiutangBilled || 1).toFixed(1)}% collection rate)`}
            right={
              <Button
                variant="amber"
                size="sm"
                icon="forward_to_inbox"
                disabled={!canCreate}
                onClick={() => app.toast("Penagihan massal dijadwalkan", `${receivables.filter((r) => r.overdue > 0).length} mitra dengan piutang lewat tempo`, "info")}
              >
                Jadwalkan Penagihan
              </Button>
            }
          />
          <div className="overflow-x-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>Mitra Kerja</Th>
                  <Th align="center">Termin</Th>
                  <Th align="right">Total Ditagihkan</Th>
                  <Th align="right">Sudah Dibayar</Th>
                  <Th align="right">Piutang Beredar</Th>
                  <Th align="right">Lewat Tempo</Th>
                  <Th align="center">Umur Tertua</Th>
                  <Th align="center">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {receivables.map((r) => (
                  <tr key={r.c.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", r.overdue > 0 && "bg-error-container/20")}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-primary">{r.c.name}</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {r.c.code} • {r.c.city} • {r.count} invoice aktif
                        </span>
                        <div className="mt-1 w-32">
                          <ProgressBar value={pct(r.paid, r.billed || 1)} tone="bg-success" height="h-1" />
                        </div>
                      </div>
                    </Td>
                    <Td align="center">{r.c.term} hari</Td>
<Td align="right" className="font-mono">{rupiahPlain(r.billed)}</Td>
                     <Td align="right" className="font-mono text-success">{rupiahPlain(r.paid)}</Td>
                     <Td align="right" className="font-mono font-semibold text-primary">{rupiahPlain(r.outstanding)}</Td>
                     <Td align="right" className={cn("font-mono", r.overdue > 0 ? "text-error" : "text-on-surface-variant")}>{r.overdue > 0 ? rupiahPlain(r.overdue) : "—"}</Td>
                    <Td align="center">
                      {r.maxLate > 0 ? <Pill tone="error">{r.maxLate} hari</Pill> : <Pill tone="success">Dalam termin</Pill>}
                    </Td>
                    <Td align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="secondary" icon="payments" disabled={r.outstanding <= 0 || !canSettle} onClick={() => setPayCustomer(r.c.id)}>
                          Terima Bayar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="campaign"
                          disabled={r.outstanding <= 0}
                          onClick={() => app.toast("Pengingat penagihan terkirim", `${r.c.name} • sisa ${rupiah(r.outstanding)}`, "info")}
                        >
                          Tagih
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {receivables.length === 0 && (
                  <tr>
                    <Td colSpan={8}>
                      <EmptyState icon="request_quote" title="Belum ada piutang tercatat" detail="Piutang akan muncul otomatis setelah invoice diterbitkan pada modul Manajemen Invoice." />
                    </Td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                  <Td colSpan={2}>Total {receivables.length} mitra</Td>
<Td align="right" className="font-mono">{rupiahPlain(totalPiutangBilled)}</Td>
                   <Td align="right" className="font-mono">{rupiahPlain(totalPiutangPaid)}</Td>
                   <Td align="right" className="font-mono text-primary">{rupiahPlain(totalPiutang)}</Td>
                   <Td align="right" className="font-mono text-error">{rupiahPlain(totalOverdue)}</Td>
                  <Td colSpan={2} align="center" className="font-label-sm text-label-sm">Collection rate {pct(totalPiutangPaid, totalPiutangBilled || 1).toFixed(1)}%</Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {detail === "supplier" && (
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
          <SectionHeading
            icon="storefront"
            title="Hutang kepada Supplier"
            subtitle="Pelunasan langsung mengurangi saldo rekening operasional yang dipilih"
            right={
              <Button size="sm" icon="price_check" disabled={!canSettle} onClick={() => app.suppliers.filter((s) => s.hutang > 0).forEach((s) => app.paySupplier(s.id, s.hutang, "A-002"))}>
                Lunasi Semua
              </Button>
            }
          />
          <div className="overflow-x-auto rounded-lg bg-surface-container-low">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>Supplier</Th>
                  <Th align="center">Kategori</Th>
                  <Th>Kontak</Th>
                  <Th align="center">Termin</Th>
                  <Th align="right">Sisa Hutang</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Aksi Pelunasan</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {app.suppliers.map((s) => (
                  <tr key={s.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", s.hutang > 0 && "bg-secondary-fixed/15")}>
                    <Td>
                      <span className="font-label-md text-label-md font-semibold text-primary">{s.name}</span>
                      <span className="block text-[11px] text-on-surface-variant">{s.code}</span>
                    </Td>
                    <Td align="center"><Pill tone="outline">{s.category}</Pill></Td>
                    <Td>
                      <span className="block">{s.contact}</span>
                      <span className="text-[11px] text-on-surface-variant">{s.phone}</span>
                    </Td>
                    <Td align="center">{s.dueDays} hari</Td>
                    <Td align="right" className={cn("font-mono font-semibold", s.hutang > 0 ? "text-error" : "text-success")}>{rupiahPlain(s.hutang)}</Td>
                    <Td align="center"><StatusPill status={s.hutang > 0 ? "Jatuh Tempo" : "Lunas"} /></Td>
                    <Td align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="secondary" icon="payments" disabled={s.hutang <= 0 || !canSettle} onClick={() => app.paySupplier(s.id, Math.round(s.hutang / 2), "A-002")}>
                          Bayar 50%
                        </Button>
                        <Button size="sm" icon="price_check" disabled={s.hutang <= 0 || !canSettle} onClick={() => app.paySupplier(s.id, s.hutang, "A-002")}>
                          Lunasi
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                  <Td colSpan={4}>Total hutang supplier</Td>
                  <Td align="right" className="font-mono text-error">{rupiahPlain(supplierTotal)}</Td>
                  <Td colSpan={2} align="center" className="font-label-sm text-label-sm">
                    {pct(supplierTotal, totalPiutang || 1).toFixed(1)}% dari piutang beredar
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {detail === "legacy" && (
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-8">
            <SectionHeading icon="history_edu" title="Jadwal Kewajiban Historis LBS" subtitle="Skema penjadwalan lama yang masih berjalan beserta realisasi angsuran" />
            <div className="flex flex-col gap-space-sm">
              {app.legacyDebts.map((l) => {
                const sisa = legacyOutstanding(l);
                const bayarMax = Math.max(1, Math.min(3, Math.ceil(sisa / l.cicilan)));
                return (
                  <div key={l.id} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-label-lg text-label-lg text-primary">{l.tahap}</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">
                           Kreditur {l.kreditur} • angsuran {rupiahShort(l.cicilan)}/bulan • {l.paidCount}/{l.tenor} terlaksana
                         </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-primary">{rupiahPlain(sisa)}</p>
                        <p className="font-label-sm text-[10px] uppercase text-on-surface-variant">Jatuh tempo berikutnya {d(parseISO(l.nextDue))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-space-sm">
                      <div className="rounded-lg bg-surface-container-lowest p-space-sm">
                        <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Pokok</span>
                        <p className="font-label-lg text-label-lg text-primary tabular">{rupiahShort(l.pokok)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-container-lowest p-space-sm">
                        <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Terbayar</span>
                        <p className="font-label-lg text-label-lg text-success tabular">{rupiahShort(l.cicilan * l.paidCount)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-container-lowest p-space-sm">
                        <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">Sisa</span>
                        <p className="font-label-lg text-label-lg text-error tabular">{rupiahShort(sisa)}</p>
                      </div>
                    </div>
                    <ProgressBar value={pct(l.paidCount, l.tenor)} tone={sisa <= 0 ? "bg-success" : "bg-secondary"} height="h-2" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone={sisa <= 0 ? "success" : "amberSoft"}>{sisa <= 0 ? "Lunas" : `${pct(l.paidCount, l.tenor).toFixed(0)}% terlaksana`}</Pill>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" icon="payments" disabled={sisa <= 0 || !canSettle} onClick={() => {
                          const amt = Number(window.prompt("Nominal pembayaran hutang lama LBS:", String(l.cicilan)) || 0);
                          if (amt > 0) app.payLegacy(l.id, "A-001", amt);
                        }}>
                          Bayar Angsuran
                        </Button>
                        <Button size="sm" disabled={sisa <= 0 || !canSettle} onClick={() => {
                          const amt = Number(window.prompt("Nominal pembayaran hutang lama LBS:", String(l.cicilan)) || 0);
                          if (amt > 0) app.payLegacy(l.id, "A-001", amt);
                        }}>
                          Bayar Angsuran
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-4">
            <SectionHeading icon="insights" title="Ringkasan Kewajiban" subtitle="Posisi hutang lama terhadap likuiditas & piutang" />
            <div className="flex flex-col gap-space-sm">
<div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
                 <span className="font-body-sm text-body-sm text-on-surface-variant">Pokok kewajiban</span>
                 <span className="font-mono font-semibold text-primary">{rupiahShort(legacyTotal)}</span>
               </div>
               <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
                 <span className="font-body-sm text-body-sm text-on-surface-variant">Sudah terbayar</span>
                 <span className="font-mono font-semibold text-success">{rupiahShort(legacyTotal - legacyOut)}</span>
               </div>
               <div className="flex items-center justify-between rounded-lg bg-secondary-fixed px-space-sm py-2 text-on-secondary-fixed">
                 <span className="font-body-sm text-body-sm font-semibold">Sisa outstanding</span>
                 <span className="font-mono font-bold text-secondary">{rupiahShort(legacyOut)}</span>
               </div>
               <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
                 <span className="font-body-sm text-body-sm text-on-surface-variant">Coverage piutang terhadap kewajiban</span>
                 <span className="font-label-lg text-label-lg text-primary">{pct(totalPiutang, legacyOut || 1).toFixed(0)}%</span>
               </div>
               <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
                 <span className="font-body-sm text-body-sm text-on-surface-variant">Total angsuran berikutnya</span>
                 <span className="font-mono font-semibold text-primary">
                   {rupiahShort(app.legacyDebts.filter((l) => legacyOutstanding(l) > 0).reduce((s, l) => s + Math.min(l.cicilan, legacyOutstanding(l)), 0))}
                 </span>
               </div>
            </div>
            <Button variant="secondary" icon="account_balance_wallet" onClick={() => app.go("kas-bank")}>
              Buka Mutasi & Transfer Bank
            </Button>
          </Card>
        </div>
      )}

{detail === "aging" && (
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-6">
            <SectionHeading icon="donut_large" title="Profil Umur Piutang Beredar" subtitle={`Total outstanding ${rupiah(totalPiutang)} dari ${receivables.reduce((s, r) => s + r.count, 0)} invoice`} />
            <div className="flex flex-col gap-space-md">
              {app.aging.map((a) => (
                <div key={a.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-sm", a.tone)} />
                      <span className="font-label-md text-label-md text-on-surface">{a.label}</span>
                      <Pill tone="outline">{a.count} invoice</Pill>
                    </span>
<span className={cn("font-mono font-bold", a.key === "b3" ? "text-error" : a.key === "b2" ? "text-secondary" : "text-primary")}>
                       {rupiahPlain(a.amount)} ({pct(a.amount, agingTotal).toFixed(0)}%)
                     </span>
                  </div>
                  <ProgressBar value={pct(a.amount, agingTotal)} tone={a.tone} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata umur piutang</span>
              <span className="font-label-md text-label-md text-primary">
                {(() => {
                  const open = app.invoices.filter((i) => app.outstandingOf(i) > 0);
                  if (!open.length) return "0 hari";
                  const avg = open.reduce((s, i) => s + Math.max(0, daysBetween(parseISO(i.date), TODAY())), 0) / open.length;
                  return `${avg.toFixed(0)} hari dari tanggal invoice`;
                })()}
              </span>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-5">
            <SectionHeading icon="priority_high" title="Invoice Prioritas Penagihan" subtitle="Terlama & terbesar lebih dahulu" />
            <div className="flex flex-col gap-space-sm">
              {app.invoices
                .filter((i) => app.outstandingOf(i) > 0)
                .map((i) => ({ i, late: daysBetween(new Date(i.dueDate), TODAY()), due: app.outstandingOf(i) }))
                .sort((a, b) => b.late - a.late || b.due - a.due)
                .slice(0, 6)
                .map(({ i, late, due }) => (
                  <div key={i.id} className={cn("flex items-center justify-between gap-2 rounded-lg p-space-sm", late > 0 ? "bg-error-container/50" : "bg-surface-container-low")}>
                    <div className="min-w-0">
                      <p className="truncate font-label-md text-label-md text-primary">{i.no}</p>
                      <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                        {app.customers.find((c) => c.id === i.customerId)?.name} • {late > 0 ? `lewat ${late} hari` : `jatuh tempo ${d(parseISO(i.dueDate))}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary">{rupiahShort(due)}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="payments"
                        onClick={() => setPayCustomer(i.customerId)}
                      >
                        Bayar
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary px-space-sm py-2 text-on-primary">
              <span className="font-body-sm text-body-sm">Potensi kas masuk dari penagihan prioritas</span>
              <span className="font-label-lg text-label-lg text-secondary-fixed">
                {rupiahShort(
                  app.invoices
                    .filter((i) => app.outstandingOf(i) > 0)
                    .map((i) => app.outstandingOf(i))
                    .sort((a, b) => b - a)
                    .slice(0, 6)
                    .reduce((s, v) => s + v, 0),
                )}
              </span>
            </div>
          </Card>
        </div>
      )}

      {selectedCustomer && (
        <ReceivePaymentModal
          customerId={selectedCustomer.c.id}
          invoices={selectedCustomer.open.map((o) => o.inv)}
          onClose={() => setPayCustomer(null)}
        />
      )}
    </PageBody>
  );
}

function PosTile({ top, label, value, foot, icon, tone = "primary" }: { top: string; label: string; value: string; foot: string; icon: string; tone?: "primary" | "error" }) {
  return (
    <Card accentTop={top} className="flex flex-col justify-between">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone === "error" ? "bg-error-container text-error" : "bg-surface-container text-primary")}>
          <Icon name={icon} size={20} />
        </span>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className={cn("font-headline-md text-headline-md font-bold tabular", tone === "error" ? "text-error" : "text-primary")}>{value}</span>
      </div>
      <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">{foot}</p>
    </Card>
  );
}

function ReceivePaymentModal({ customerId, invoices, onClose }: { customerId: string; invoices: Invoice[]; onClose: () => void }) {
  const app = useApp();
  const customer = app.customers.find((c) => c.id === customerId)!;
  const sorted = [...invoices].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const [invoiceId, setInvoiceId] = useState(sorted[0]?.id ?? "");
  const target = sorted.find((i) => i.id === invoiceId) ?? sorted[0];
  const due = target ? app.outstandingOf(target) : 0;
  const [amount, setAmount] = useState(due);
  const [accountId, setAccountId] = useState("A-001");
  const [method, setMethod] = useState<"Transfer" | "Tunai" | "Giro">("Transfer");
  const [date, setDate] = useState(iso(TODAY()));
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={`Penerimaan Pembayaran — ${customer.name}`}
      subtitle={`${sorted.length} invoice aktif • total piutang ${rupiah(sorted.reduce((s, i) => s + app.outstandingOf(i), 0))}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="secondary" onClick={() => setAmount(app.outstandingOf(sorted.find((i) => i.id === invoiceId) ?? sorted[0]))}>
            Isi Sisa Penuh
          </Button>
          <Button
            icon="save"
            disabled={!app.can("hutang-piutang", "edit") || saving}
            onClick={async () => {
              if (!target) return;
              if (amount <= 0) {
                app.toast("Nominal pembayaran tidak valid", undefined, "warn");
                return;
              }
              if (amount > due) {
                app.toast("Nominal melebihi sisa kewajiban", `Maksimal ${rupiah(due)}`, "error");
                return;
              }
              setSaving(true);
              try {
                const saved = await app.recordPayment({ invoiceId: target.id, amount, accountId, method, date, ref: `TRF/${target.no}/PT` });
                if (saved) onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Menyimpan…" : "Simpan Pembayaran"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        <div className="overflow-hidden rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th align="center">Pilih</Th>
                <Th>Invoice</Th>
                <Th align="center">Jatuh Tempo</Th>
                <Th align="right">Sisa</Th>
                <Th align="center">Umur</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {sorted.map((i) => {
                const late = daysBetween(new Date(i.dueDate), TODAY());
                return (
                  <tr key={i.id} className={cn("cursor-pointer", invoiceId === i.id && "bg-secondary-fixed/40")} onClick={() => { setInvoiceId(i.id); setAmount(app.outstandingOf(i)); }}>
                    <Td align="center">
                      <input type="radio" name="invoice" checked={invoiceId === i.id} onChange={() => setInvoiceId(i.id)} className="h-4 w-4 accent-[#00274e]" />
                    </Td>
                    <Td>
                      <span className="font-label-md text-label-md font-semibold text-primary">{i.no}</span>
                      <span className="block text-[11px] text-on-surface-variant">
                        {num(i.sjIds.length)} surat jalan • diterbitkan {d(parseISO(i.date))}
                      </span>
                    </Td>
                    <Td align="center">{d(parseISO(i.dueDate))}</Td>
                    <Td align="right" className="font-mono font-semibold text-error">{rupiahShort(app.outstandingOf(i))}</Td>
                    <Td align="center">{late > 0 ? <Pill tone="error">lewat {late}h</Pill> : <Pill tone="success">{Math.abs(late)}h lagi</Pill>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <Field label="Nominal Diterima (Rp)" hint={target ? `Sisa invoice terpilih ${rupiah(due)}` : undefined}>
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-primary p-space-sm text-on-primary">
          <span className="font-body-sm text-body-sm">
            Status setelah pembayaran: {amount >= due ? "Lunas" : "Sebagian"} • saldo bank bertambah {rupiah(amount)}
          </span>
          <StatusPill status={amount >= due ? "Lunas" : "Sebagian"} />
        </div>
      </div>
    </Modal>
  );
}
