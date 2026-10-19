import { useEffect, useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { BarPairs, Button, Card, Field, Icon, Input, Modal, Pill, ProgressBar, SectionHeading, Select, Td, Th } from "@/components/ui";
import { legacyOutstanding, type OpeningLogEntry, type OpeningSource } from "@/lib/data";
import { cn, csvDownload, d, iso, monthKey, nextYm, num, parseISO, pct, prevYm, rupiah, rupiahPlain, rupiahShort, TODAY, ymLabel } from "@/lib/format";
import { printCashReport, printOpeningBalance } from "@/lib/print";
import { useApp } from "@/lib/store";
import type { Ctx } from "@/lib/store";

export default function KasBank() {
  const app = useApp();
  const [accountId, setAccountId] = useState("all");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"periode" | "semua">("semua");
const [txOpen, setTxOpen] = useState(false);
const [transferOpen, setTransferOpen] = useState(false);
const [openBalOpen, setOpenBalOpen] = useState(false);
const [firstTimeOpen, setFirstTimeOpen] = useState(false);
const [exportOpen, setExportOpen] = useState(false);
const [exportAccountId, setExportAccountId] = useState<"all" | string>("all");
const [saldoYm, setSaldoYm] = useState(monthKey(iso(TODAY())));
const canCreate = app.can("kas-bank", "create");
const canEdit = app.can("kas-bank", "edit");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const accounts = app.accountsWithBalance;
  const liquidity = accounts.reduce((s, a) => s + a.balance, 0);

  const ledger = useMemo(
    () =>
      app.bankTx
        .filter((tx) => {
          if (scope === "periode" && (tx.date < app.period.from || tx.date > app.period.to)) return false;
          if (accountId !== "all" && tx.accountId !== accountId) return false;
          if (direction !== "all" && tx.direction !== direction) return false;
          if (query.trim() && !(tx.desc ?? "").toLowerCase().includes(query.toLowerCase()) && !(tx.category ?? "").toLowerCase().includes(query.toLowerCase())) return false;
          return true;
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [app.bankTx, app.period, accountId, direction, query, scope],
  );

  const totalPages = Math.max(1, Math.ceil(ledger.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLedger = ledger.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [accountId, direction, query, scope, app.period.from, app.period.to]);

  const chart = app.cashFlowDaily.slice(-12).map((c) => ({ label: c.date.slice(8), a: c.in, b: c.out }));
  const legacyOut = app.legacyOutstandingTotal;

  return (
    <PageBody>
      <PageHeader
        eyebrow="Treasury & Kewajiban"
        title="Kas, Bank & Posisi Kewajiban Berjalan"
        description="Kelola mutasi rekas koran bank dan kas lapangan, transfer antar rekening, pelunasan supplier, serta jadwal kewajiban historis LBS."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("mutasi-kas-bank-lbs.csv", [
                ["Tanggal", "Rekening", "Uraian", "Kategori", "Alokasi", "Arah", "Nominal"],
                ...ledger.map((tx) => [
                  d(parseISO(tx.date)),
                  accounts.find((a) => a.id === tx.accountId)?.name ?? "",
                  tx.desc,
                  tx.category,
                  tx.allocation ?? "-",
                  tx.direction === "in" ? "Masuk" : "Keluar",
                  tx.amount,
                ]),
              ])
            }
            onPrint={() => printCashReport(accounts, app.period)}
          />
        }
      />

      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((a) => (
          <Card key={a.id} accentTop={a.type === "Kas" ? "bg-secondary-container" : "bg-primary"}>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{a.name}</span>
                <span className="mt-1 font-numeric-metric text-primary tabular">{rupiah(a.balance)}</span>
              </div>
              <span className={cn("rounded-lg p-2", a.type === "Kas" ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-fixed text-primary")}>
                <Icon name={a.type === "Kas" ? "payments" : "account_balance"} size={22} />
              </span>
            </div>
            <div className="mt-space-md flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm">
              <span className="font-mono text-on-surface-variant">{a.accountNo}</span>
              <span className="font-label-sm text-label-sm text-primary">{pct(a.balance, liquidity).toFixed(1)}% likuiditas</span>
            </div>
            <div className="mt-space-sm flex items-center justify-between font-body-sm text-body-sm">
              <span className="text-on-surface-variant">{a.txCount} mutasi</span>
              <span className="flex gap-2">
                <span className="font-mono text-primary">+{rupiahShort(a.masuk)}</span>
                <span className="font-mono text-error">-{rupiahShort(a.keluar)}</span>
              </span>
            </div>
          </Card>
        ))}
        <Card className="bg-primary text-on-primary">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">Total Likuiditas Konsolidasi</span>
              <span className="mt-1 font-numeric-metric tabular">{rupiah(liquidity)}</span>
            </div>
            <Icon name="savings" size={26} className="text-secondary-container" />
          </div>
          <div className="mt-space-md flex items-center justify-between rounded-lg bg-primary-container px-space-sm py-1.5 font-body-sm text-body-sm">
            <span>Rasio kas vs hutang</span>
            <span className="font-label-sm text-label-sm font-bold text-secondary-fixed">
              {pct(liquidity, app.supplierDebtTotal + legacyOut || 1).toFixed(0)}% tertutup
            </span>
          </div>
          <div className="mt-space-sm">
            <Button
              variant="amber"
              size="sm"
              icon="swap_horiz"
              disabled={!canCreate}
              onClick={() => setTransferOpen(true)}
              className="w-full"
            >
              Transfer Antar Rekening
            </Button>
          </div>
        </Card>
      </section>

      <SaldoAwalSection
        ym={saldoYm}
        onYm={setSaldoYm}
        onInput={() => setOpenBalOpen(true)}
        onFirstTime={() => setFirstTimeOpen(true)}
      />

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg lg:col-span-7">
          <SectionHeading
            icon="receipt"
            title="Buku Mutasi Kas & Bank"
            subtitle={`${ledger.length} transaksi sesuai filter`}
            right={
              <div className="flex items-center gap-1">
                <Button size="sm" icon="add_card" disabled={!canCreate} onClick={() => setTxOpen(true)}>
                  Mutasi Baru
                </Button>
                <Button size="sm" icon="download" variant="outline" onClick={() => setExportOpen(true)}>
                  Export
                </Button>
              </div>
            }
          />
          <div className="flex flex-wrap items-end gap-space-sm">
            <Field label="Pencarian" className="min-w-[180px] flex-1">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Uraian atau kategori…" />
            </Field>
            <Field label="Rekening">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="all">Semua rekening</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Arah">
              <Select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                <option value="all">Masuk &amp; keluar</option>
                <option value="in">Kas masuk</option>
                <option value="out">Kas keluar</option>
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
                  <Th>Tanggal</Th>
                  <Th>Uraian</Th>
                  <Th>Rekening</Th>
                  <Th align="center">Kategori</Th>
                  <Th align="center">Alokasi</Th>
                  <Th align="right">Nominal</Th>
                  <Th align="center">Aksi</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {pagedLedger.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-surface-container-lowest/60">
                    <Td className="whitespace-nowrap font-mono">{d(parseISO(tx.date))}</Td>
                    <Td>
                      <span className="font-label-md text-label-md text-primary">{tx.desc}</span>
                      {tx.ref && <span className="block text-[11px] text-on-surface-variant">ref {tx.ref}</span>}
                    </Td>
                    <Td>{accounts.find((a) => a.id === tx.accountId)?.name}</Td>
                    <Td align="center">
                      <Pill tone="outline">{tx.category}</Pill>
                    </Td>
                    <Td align="center" className="font-mono text-label-sm">
                      {tx.allocation ?? "-"}
                    </Td>
<Td align="right" className={cn("font-mono font-semibold", tx.direction === "in" ? "text-primary" : "text-error")}>
                       {tx.direction === "in" ? "+" : "-"} {rupiahPlain(tx.amount)}
                     </Td>
                    <Td align="center">
                      <button
                        type="button"
                        title="Batalkan mutasi"
                        onClick={() => {
                          app.toast("Mutasi ditandai untuk review", `${tx.desc} — menunggu persetujuan supervisor`, "warn");
                        }}
                        className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error"
                      >
                        <Icon name="undo" size={18} />
                      </button>
                    </Td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <Td colSpan={6} align="center" className="py-space-xl text-on-surface-variant">
                      Tidak ada mutasi sesuai filter.
                    </Td>
                  </tr>
                )}
              </tbody>
              {ledger.length > 0 && (
                <tfoot>
                  <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
<Td colSpan={5}>Total {pagedLedger.length} baris halaman ini (dari {ledger.length} terfilter)</Td>
                     <Td align="right" className="font-mono">
                       {rupiahPlain(pagedLedger.reduce((s, tx) => s + (tx.direction === "in" ? tx.amount : -tx.amount), 0))}
                     </Td>
                    <Td align="center" className="font-label-sm text-label-sm">Net posisi</Td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {ledger.length > pageSize && (
            <div className="mt-space-sm flex items-center justify-between gap-space-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-space-xs">
                <Button variant="ghost" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Sebelumnya
                </Button>
                <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
          <BarPairs data={chart} />
        </Card>

        <div className="flex flex-col gap-space-lg lg:col-span-5">
          <Card className="flex flex-col gap-space-md bg-secondary-fixed p-space-md text-on-secondary-fixed sm:p-space-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <Icon name="history_edu" size={16} className="text-secondary" />
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">Kewajiban Historis LBS</span>
                </div>
                <h3 className="mt-1 font-headline-lg text-headline-lg font-bold text-secondary tabular">{rupiah(app.legacyTotal)}</h3>
                <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant">Sisa outstanding {rupiah(legacyOut)} • 3 skema penjadwalan</p>
              </div>
              <span className="flex items-center justify-center rounded-lg bg-secondary p-1.5 text-on-secondary shadow-sm">
                <Icon name="warning" size={18} />
              </span>
            </div>
            <ProgressBar value={pct(app.legacyTotal - legacyOut, app.legacyTotal)} tone="bg-secondary" height="h-3" />
            <div className="flex flex-col gap-space-sm">
              {app.legacyDebts.map((l) => {
                const sisa = legacyOutstanding(l);
                return (
                  <div key={l.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest/85 p-space-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-label-lg text-label-lg text-primary">{l.tahap}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {l.kreditur} • {l.paidCount}/{l.tenor} angsuran • {rupiah(l.cicilan)}/bulan
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-primary">{rupiah(sisa)}</p>
                        <p className="font-label-sm text-[10px] uppercase text-on-surface-variant">Jatuh tempo berikutnya {d(parseISO(l.nextDue))}</p>
                      </div>
                    </div>
                    <ProgressBar value={pct(l.paidCount, l.tenor)} tone={sisa <= 0 ? "bg-success" : "bg-secondary"} height="h-1.5" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone={sisa <= 0 ? "success" : "amberSoft"}>{sisa <= 0 ? "Lunas" : "Aktif Terjadwal"}</Pill>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="payments"
                          disabled={sisa <= 0 || !canEdit}
                          onClick={() => app.payLegacy(l.id, "A-001", 1)}
                        >
                          Bayar 1 Angsuran
                        </Button>
                        <Button
                          size="sm"
                          disabled={sisa <= 0 || !canEdit}
                          onClick={() => {
                            const pinjaman = Math.min(3, Math.ceil(sisa / l.cicilan));
                            app.payLegacy(l.id, "A-001", pinjaman);
                          }}
                        >
                          Bayar {Math.min(3, Math.ceil(sisa / l.cicilan))}x
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="storefront" title="Hutang Supplier Jatuh Tempo" subtitle="Pelunasan langsung mengurangi saldo rekening operasional" />
            <div className="flex flex-col divide-y divide-surface-container">
              {app.suppliers.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-space-sm py-space-sm first:pt-0">
                  <div className="min-w-0">
                    <p className="font-label-md text-label-md text-primary">{s.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {s.category} • termin {s.dueDays} hari • {s.contact}
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <span className={cn("font-mono font-semibold", s.hutang > 0 ? "text-error" : "text-success")}>{rupiah(s.hutang)}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="price_check"
                      disabled={s.hutang <= 0 || !canEdit}
                      onClick={() => app.paySupplier(s.id, s.hutang, "A-002")}
                    >
                      Lunasi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total Hutang Supplier</span>
              <span className="font-label-lg text-label-lg text-primary tabular">{rupiah(app.supplierDebtTotal)}</span>
            </div>
          </Card>

          <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
            <SectionHeading icon="insights" title="Ringkasan Arus Kas Periode" subtitle={`${d(parseISO(app.period.from))} – ${d(parseISO(app.period.to))}`} />
            {(() => {
              const rows = app.bankTx.filter((tx) => tx.date >= app.period.from && tx.date <= app.period.to);
              const masuk = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0);
              const keluar = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0);
              return (
                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="rounded-xl bg-surface-container-low p-space-sm">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Kas Masuk</span>
                    <p className="font-headline-md text-headline-md text-primary tabular">{rupiah(masuk)}</p>
                    <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">{rows.filter((r) => r.direction === "in").length} transaksi</span>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-space-sm">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Kas Keluar</span>
                    <p className="font-headline-md text-headline-md text-error tabular">{rupiah(keluar)}</p>
                    <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">{rows.filter((r) => r.direction === "out").length} transaksi</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-primary p-space-sm text-on-primary">
                    <span className="font-label-md text-label-md">Net Arus Kas</span>
                    <span className="font-headline-md text-headline-md tabular">{rupiah(masuk - keluar)}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Rasio likuiditas terhadap total kewajiban</span>
                    <span className="font-label-lg text-label-lg text-primary">
                      {pct(liquidity, app.supplierDebtTotal + legacyOut || 1).toFixed(1)}%
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Tgl sistem & jumlah hari transaksi</span>
                    <span className="font-label-md text-label-md text-primary">{d(TODAY())} • {num(new Set(rows.map((r) => r.date)).size)} hari</span>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      </div>

      {openBalOpen && <OpeningBalanceModal ym={saldoYm} onClose={() => setOpenBalOpen(false)} />}
      {firstTimeOpen && <OpeningBalanceModal ym={saldoYm} firstTime onClose={() => setFirstTimeOpen(false)} />}
      {txOpen && <TxModal onClose={() => setTxOpen(false)} />}
      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} />}
      {exportOpen && <ExportModal exportAccountId={exportAccountId} setExportAccountId={setExportAccountId} onClose={() => setExportOpen(false)} />}
    </PageBody>
  );
}

function TxModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [form, setForm] = useState({ accountId: "A-002", direction: "out" as "in" | "out", amount: 5_000_000, date: iso(TODAY()), desc: "", category: "Operasional Site", allocation: "LBS" as "LBS" | "KMS" | undefined });

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat Mutasi Kas / Bank"
      subtitle="Mutasi langsung memperbarui saldo rekening terkait"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="save"
            onClick={() => {
              if (!form.desc.trim()) {
                app.toast("Uraian mutasi wajib diisi", undefined, "warn");
                return;
              }
              app.addBankTx({ ...form, ref: undefined });
              onClose();
            }}
          >
            Simpan Mutasi
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Rekening">
          <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {rupiahShort(a.balance)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Arah Mutasi">
          <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as "in" | "out" })}>
            <option value="out">Kas Keluar (-)</option>
            <option value="in">Kas Masuk (+)</option>
          </Select>
        </Field>
        <Field label="Alokasi">
          <Select value={form.allocation ?? "LBS"} onChange={(e) => setForm({ ...form, allocation: e.target.value as "LBS" | "KMS" })}>
            <option value="LBS">LBS (Logam Bumi Santosa)</option>
            <option value="KMS">KMS</option>
          </Select>
        </Field>
        <Field label="Nominal (Rp)">
          <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </Field>
        <Field label="Tanggal">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Kategori">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["Operasional Site", "BBM & Solar", "Sparepart", "Pemeliharaan", "Payroll", "Penerimaan Piutang", "Pendapatan Lain", "Kewajiban Historis", "Bank Charge"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Uraian" className="sm:col-span-2">
          <Input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Contoh: pembelian oli & filter armada" />
        </Field>
      </div>
    </Modal>
  );
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [from, setFrom] = useState("A-001");
  const [to, setTo] = useState("A-002");
  const [amount, setAmount] = useState(25_000_000);
  const [note, setNote] = useState("Dana operasional BBM lapangan");
  const balance = app.accountBalance(from);

  return (
    <Modal
      open
      onClose={onClose}
      title="Transfer Antar Rekening"
      subtitle="Membuat dua mutasi berpasangan (keluar & masuk) secara otomatis"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="swap_horiz"
            onClick={() => {
              if (from === to) {
                app.toast("Rekening asal & tujuan sama", "Pilih rekening yang berbeda", "warn");
                return;
              }
              if (amount > balance) {
                app.toast("Saldo tidak mencukupi", `Saldo tersedia ${rupiah(balance)}`, "error");
                return;
              }
              app.transfer(from, to, amount, note);
              onClose();
            }}
          >
            Proses Transfer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Dari Rekening">
          <Select value={from} onChange={(e) => setFrom(e.target.value)}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ke Rekening">
          <Select value={to} onChange={(e) => setTo(e.target.value)}>
            {app.accountsWithBalance.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nominal (Rp)" hint={`Saldo tersedia ${rupiah(balance)}`}>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Keterangan">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-xl bg-surface-container-low p-space-md">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Posisi setelah transfer</span>
        <span className="font-mono font-bold text-primary">
          {rupiah(balance - amount)} → {rupiah(app.accountBalance(to) + amount)}
        </span>
      </div>
    </Modal>
  );
}

function ledgerExport(app: Ctx, accountId: "all" | string) {
  const txs = app.bankTx.filter((tx) => {
    if (accountId !== "all" && tx.accountId !== accountId) return false;
    return true;
  });
  return txs
    .map((tx) => ({
      ...tx,
      accountName: app.accountsWithBalance.find((a) => a.id === tx.accountId)?.name ?? "-",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function ExportModal({ onClose, exportAccountId, setExportAccountId }: { onClose: () => void; exportAccountId: "all" | string; setExportAccountId: (v: "all" | string) => void }) {
  const app = useApp();
  const accounts = app.accountsWithBalance;
  const rows = ledgerExport(app, exportAccountId);
  const filename = `mutasi-kas-bank-lbs-${exportAccountId === "all" ? "semua-rekening" : accounts.find((a) => a.id === exportAccountId)?.name}.csv`;

  return (
    <Modal
      open
      onClose={onClose}
      title="Export Mutasi Kas & Bank"
      subtitle="Pilih rekening yang akan diexport atau pilih semua rekening"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon="download"
            onClick={() => {
              csvDownload(
                filename,
                [
                  ["Tanggal", "Uraian", "Rekening", "Kategori", "Alokasi", "Masuk", "Keluar"],
                  ...rows.map((r) => [
                    d(parseISO(r.date)),
                    r.desc,
                    r.accountName,
                    r.category,
                    r.allocation ?? "-",
                    r.direction === "in" ? rupiah(r.amount) : "-",
                    r.direction === "out" ? rupiah(r.amount) : "-",
                  ]),
                ],
              );
              onClose();
            }}
          >
            Export CSV
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Rekening">
          <Select value={exportAccountId} onChange={(e) => setExportAccountId(e.target.value as "all" | string)}>
            <option value="all">Semua Rekening</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {rupiahShort(a.balance)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jumlah Data">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{rows.length} transaksi akan diexport</span>
        </Field>
      </div>
    </Modal>
  );
}


/* ============================================================
   Saldo Awal Bulanan & Roll Forward
   — input saldo awal BUKAN pemasukan; bulan berikutnya otomatis
     membaca saldo akhir bulan sebelumnya.
   ============================================================ */
const SOURCE_META: Record<OpeningSource | "koreksi", { label: string; tone: string; icon: string; desc: string }> = {
  sistem: { label: "Saldo Awal Sistem", tone: "navy", icon: "flag", desc: "Diinput saat aplikasi pertama digunakan" },
  manual: { label: "Input Manual", tone: "amber", icon: "edit_note", desc: "Diinput manual (koreksi / rekening baru)" },
  rollforward: { label: "Otomatis Roll Forward", tone: "neutral", icon: "autorenew", desc: "Membaca saldo akhir bulan sebelumnya" },
  koreksi: { label: "Koreksi", tone: "error", icon: "history", desc: "Penghapusan / penyesuaian saldo awal" },
};

function SaldoAwalSection({ ym, onYm, onInput, onFirstTime }: { ym: string; onYm: (v: string) => void; onInput: () => void; onFirstTime: () => void }) {
  const SHOW_SALDO_AWAL_DETAIL = false;
  const app = useApp();
  const rows = app.monthSummary(ym);
  const prev = prevYm(ym);
  const next = nextYm(ym);
  const totalOpening = rows.reduce((s, r) => s + r.opening, 0);
  const totalClosing = rows.reduce((s, r) => s + r.closing, 0);
  const autoCount = rows.filter((r) => r.source === "rollforward" && !r.explicit).length;
  const manualCount = rows.filter((r) => r.explicit).length;
  const canEdit = app.can("kas-bank", "edit");
  const log: OpeningLogEntry[] = app.openingLog.filter((l) => l.ym === ym).slice(0, 6);

  return (
    <section className="flex flex-col gap-space-md">
      <SectionHeading
        icon="event_available"
        title="Saldo Awal Bulan & Roll Forward"
        subtitle="Saldo awal adalah posisi kas/bank di awal periode — bukan pemasukan, sehingga tidak dihitung pada kas masuk atau pendapatan."
        right={
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5">
              <Icon name="calendar_month" size={18} className="text-outline" />
              <input type="month" value={ym} onChange={(e) => onYm(e.target.value || ym)} className="w-[132px] bg-transparent font-label-md text-label-md font-semibold text-on-surface outline-none" aria-label="Bulan saldo awal" />
            </div>
            <Button size="sm" variant="secondary" icon="chevron_left" onClick={() => onYm(prevYm(ym))} title={`Bulan sebelumnya (${ymLabel(prevYm(ym))})`}>
              {ymLabel(prev).split(" ")[0].slice(0, 3)}
            </Button>
            <Button size="sm" variant="secondary" icon="chevron_right" onClick={() => onYm(nextYm(ym))} title={`Bulan berikutnya (${ymLabel(nextYm(ym))})`}>
              {ymLabel(next).split(" ")[0].slice(0, 3)}
            </Button>
            <Button size="sm" variant="secondary" icon="print" onClick={() => printOpeningBalance(rows, ym, prev, app.openingLog.filter((l) => l.ym === ym || l.ym === prev))}>
              Cetak
            </Button>
            <Button size="sm" variant="secondary" icon="flag" disabled={!canEdit} onClick={onFirstTime}>
              Inisialisasi Pertama Kali
            </Button>
            <Button size="sm" icon="edit_note" disabled={!canEdit} onClick={onInput}>
              Input Saldo Awal {ymLabel(ym).split(" ")[1]}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        <Card accentTop="bg-primary">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Saldo Awal {ymLabel(ym)}</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{rupiah(totalOpening)}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            {manualCount} akun bernilai tersimpan • {autoCount} akun otomatis dari {ymLabel(prev)}
          </p>
        </Card>
        <Card accentTop="bg-primary-container">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Saldo Akhir {ymLabel(ym)}</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{rupiah(totalClosing)}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Menjadi saldo awal {ymLabel(next)} secara otomatis
          </p>
        </Card>
        <Card accentTop="bg-secondary-container">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Selisih Bulan Lalu → Bulan Ini</span>
          <p className="mt-1 font-numeric-metric text-primary tabular">{rupiah(totalOpening - (app.accountsWithBalance[0] ? app.closingOf(app.accountsWithBalance[0].id, prev) : 0))}</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Saldo akhir {ymLabel(prev)} = {rupiah(rows.reduce((s, r) => s + app.closingOf(r.account.id, prev), 0))} (seluruh akun)
          </p>
        </Card>
        <Card accentTop="bg-success">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Perlakuan Akuntansi</span>
          <p className="mt-1 font-headline-md text-headline-md font-bold text-primary">Bukan Pemasukan</p>
          <p className="mt-space-md rounded-lg bg-surface-container-low px-space-sm py-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Tidak membuat mutasi kas masuk &amp; tidak muncul pada pendapatan / piutang
          </p>
        </Card>
      </div>

      {SHOW_SALDO_AWAL_DETAIL && (
        <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
          <SectionHeading
            icon="table_rows"
            title={`Kartu Saldo Awal per Rekening — ${ymLabel(ym)}`}
            subtitle="Satu rekening satu baris; sumber nilai ditandai pada kolom Sumber"
          />
        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th>Rekening / Akun</Th>
                <Th align="right">Saldo Awal</Th>
                <Th align="center">Sumber Saldo Awal</Th>
                <Th align="right">Mutasi Masuk</Th>
                <Th align="right">Mutasi Keluar</Th>
                <Th align="right">Saldo Akhir</Th>
                <Th align="center">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {rows.map((r) => {
                const meta = SOURCE_META[(r.explicit ? (r.source === "rollforward" ? "rollforward" : (r.source || "manual")) : "rollforward") as keyof typeof SOURCE_META] ?? SOURCE_META.rollforward;
                return (
                  <tr key={r.account.id} className="transition-colors hover:bg-surface-container-lowest/60">
                    <Td>
                      <span className="font-label-md text-label-md font-semibold text-primary">{r.account.name}</span>
                      <span className="block text-[11px] text-on-surface-variant">{r.account.code} • {r.account.role}</span>
                    </Td>
<Td align="right" className="font-mono font-semibold text-primary">{rupiahPlain(r.opening)}</Td>
                     <Td align="center">
                       <Pill tone={meta.tone}>{meta.label}</Pill>
                       <span className="mt-1 block font-label-sm text-[10px] text-on-surface-variant">
                         {r.explicit
                           ? r.source === "rollforward"
                             ? `dikunci dari ${ymLabel(r.fromMonth ?? prev)}`
                             : `disimpan manual`
                           : `= saldo akhir ${ymLabel(r.fromMonth ?? prev)}`}
                       </span>
                     </Td>
                     <Td align="right" className="font-mono text-primary">+ {rupiahPlain(r.masuk)}</Td>
                     <Td align="right" className="font-mono text-error">- {rupiahPlain(r.keluar)}</Td>
                     <Td align="right" className="font-mono font-bold text-primary">{rupiahPlain(r.closing)}</Td>
                    <Td align="center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Kunci nilai otomatis menjadi saldo awal tersimpan (roll forward)"
                          disabled={!canEdit || r.explicit}
                          onClick={() => app.rollForwardMonth(ym)}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
                        >
                          <Icon name="autorenew" size={18} />
                        </button>
                        <button
                          type="button"
                          title="Koreksi: hapus saldo awal tersimpan agar kembali otomatis"
                          disabled={!canEdit || !r.explicit}
                          onClick={() => app.clearOpening(r.account.id, ym)}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30"
                        >
                          <Icon name="undo" size={18} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                <Td>Total {rows.length} rekening</Td>
<Td align="right" className="font-mono">{rupiahPlain(totalOpening)}</Td>
                 <Td align="center" className="font-label-sm text-label-sm">
                   {manualCount} nilai tersimpan
                 </Td>
                 <Td align="right" className="font-mono">{rupiahPlain(rows.reduce((s, r) => s + r.masuk, 0))}</Td>
                 <Td align="right" className="font-mono text-error">{rupiahPlain(rows.reduce((s, r) => s + r.keluar, 0))}</Td>
                 <Td align="right" className="font-mono text-primary">{rupiahPlain(totalClosing)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-space-sm lg:grid-cols-3">
          <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
            <Icon name="looks_one" size={18} className="mt-0.5 text-secondary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              <b className="text-primary">Penggunaan pertama kali:</b> tekan <b>Inisialisasi Pertama Kali</b> untuk mengisi saldo awal seluruh rekening sekaligus (dicatat sebagai <i>Saldo Awal Sistem</i>, bukan pemasukan).
            </span>
          </div>
          <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
            <Icon name="looks_two" size={18} className="mt-0.5 text-secondary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              <b className="text-primary">Bulan berikutnya:</b> saldo awal otomatis = <b>saldo akhir bulan sebelumnya</b>. Kolom Sumber menandai nilai sebagai <i>Otomatis Roll Forward</i>.
            </span>
          </div>
          <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
            <Icon name="looks_3" size={18} className="mt-0.5 text-secondary" />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              <b className="text-primary">Input manual hanya bila perlu:</b> rekening baru, koreksi/audit, atau pemisahan saldo. Nilai manual selalu menang atas perhitungan otomatis.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-space-sm">
          <SectionHeading icon="history" title="Audit Saldo Awal" subtitle={`Riwayat input ${ymLabel(ym)}${log.length === 0 ? " — belum ada input manual bulan ini" : ""}`} />
          {log.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low p-space-sm font-body-sm text-body-sm text-on-surface-variant">
              {ymLabel(ym)} memakai perhitungan otomatis dari {ymLabel(prev)}. Tekan <b>Kunci Roll Forward</b> (ikon ⟳) bila ingin menyimpan nilainya sebagai saldo awal permanen beserta bukti audit.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-container">
              {log.map((l) => {
                const meta = SOURCE_META[(l.type || "manual") as keyof typeof SOURCE_META] ?? SOURCE_META.manual;
                return (
                  <div key={l.id} className="flex items-start justify-between gap-2 py-2 first:pt-0">
                    <div className="flex items-start gap-space-sm">
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", l.type === "koreksi" ? "bg-error-container text-error" : l.type === "manual" ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-fixed text-primary")}>
                        <Icon name={meta.icon} size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-label-md text-label-md text-on-surface">
                          {app.accountsWithBalance.find((a) => a.id === l.accountId)?.name ?? l.accountId} • {meta.label}
                        </span>
                        <span className="block font-body-sm text-body-sm text-on-surface-variant">{l.note}</span>
                        <span className="font-label-sm text-[10px] uppercase text-outline">{l.by} • {d(parseISO(l.at))}</span>
                      </span>
                    </div>
                    <span className={cn("font-mono font-semibold", l.type === "koreksi" ? "text-error" : "text-primary")}>{rupiahPlain(l.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
      )}
    </section>
  );
}

function OpeningBalanceModal({ ym, firstTime = false, onClose }: { ym: string; firstTime?: boolean; onClose: () => void }) {
  const app = useApp();
  const prev = prevYm(ym);
  const rows = app.monthSummary(ym);
  const [values, setValues] = useState<Record<string, number>>(() =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.account.id] = r.explicit ? r.opening : r.opening;
      return acc;
    }, {}),
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [globalNote, setGlobalNote] = useState("");
  const total = Object.values(values).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  const prevTotal = rows.reduce((s, r) => s + app.closingOf(r.account.id, prev), 0);

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-4xl"
      title={firstTime ? "Inisialisasi Saldo Awal (Penggunaan Pertama)" : `Input Saldo Awal Bulan — ${ymLabel(ym)}`}
      subtitle={`${ymLabel(ym)} • saldo awal BUKAN pemasukan: nilai ini hanya posisi awal periode, tidak membuat mutasi kas masuk maupun pendapatan.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="secondary"
            icon="autorenew"
            onClick={() => setValues(rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.account.id]: app.closingOf(r.account.id, prev) }), {}))}
          >
            Isi dari Saldo Akhir {ymLabel(prev).split(" ")[0]}
          </Button>
          <Button
            icon="save"
            onClick={() => {
              app.setOpeningBalance(
                ym,
                rows.map((r) => ({ accountId: r.account.id, amount: Number(values[r.account.id] ?? 0), note: notes[r.account.id] })),
                { firstTime, globalNote },
              );
              onClose();
            }}
          >
            {firstTime ? "Simpan Saldo Awal Sistem" : "Simpan Saldo Awal"}
          </Button>
        </>
      }
    >
      <div className="note mb-space-md rounded-xl bg-secondary-fixed px-space-sm py-2 font-body-sm text-body-sm text-on-secondary-fixed">
        <b>Perlakuan:</b> saldo awal disimpan terpisah dari mutasi. Pada bulan berikutnya sistem otomatis memakai <b>saldo akhir bulan sebelumnya</b> sebagai saldo awal — input manual hanya diperlukan saat pertama kali memakai aplikasi, membuka rekening baru, atau koreksi.
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-container-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <Th>Rekening</Th>
              <Th align="right">Saldo Akhir {ymLabel(prev).split(" ")[0]} (acuan)</Th>
              <Th align="right">Saldo Awal {ymLabel(ym).split(" ")[0]} (input)</Th>
              <Th>Catatan</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
            {rows.map((r) => (
              <tr key={r.account.id}>
                <Td>
                  <span className="font-label-md text-label-md font-semibold text-primary">{r.account.name}</span>
                  <span className="block text-[11px] text-on-surface-variant">{r.account.code} • {r.account.role}</span>
                </Td>
                <Td align="right" className="font-mono text-on-surface-variant">{rupiahPlain(app.closingOf(r.account.id, prev))}</Td>
                <Td align="right">
                  <input
                    type="number"
                    value={values[r.account.id] ?? 0}
                    onChange={(e) => setValues({ ...values, [r.account.id]: Number(e.target.value) })}
                    className="w-40 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-right font-mono text-body-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Td>
                <Td>
                  <input
                    value={notes[r.account.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.account.id]: e.target.value })}
                    placeholder="mis. saldo rekening koran 30/09"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-body-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
              <Td>Total saldo awal yang diinput</Td>
<Td align="right" className="font-mono">{rupiahPlain(prevTotal)}</Td>
               <Td align="right" className="font-mono">{rupiahPlain(total)}</Td>
               <Td className="font-label-sm text-label-sm">Selisih {rupiahPlain(total - prevTotal)}</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-space-md">
        <Field label={firstTime ? "Catatan inisialisasi (opsional)" : "Catatan umum input (opsional)"}>
          <Input value={globalNote} onChange={(e) => setGlobalNote(e.target.value)} placeholder={firstTime ? "mis. migrasi dari Excel per 01/10/2026" : "mis. penyesuaian setelah rekonsiliasi bank"} />
        </Field>
      </div>

      <div className="mt-space-sm flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
        <Icon name="account_balance_wallet" size={18} className="text-primary" />
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Nilai tersimpan di tabel <b>openingBalances</b> dengan tipe <b>{firstTime ? "Saldo Awal Sistem" : "Input Manual"}</b> — tercatat pada audit saldo awal, tidak menambah <i>mutasi masuk</i>, dan tidak memengaruhi laporan pendapatan.
        </span>
      </div>
    </Modal>
  );
}

