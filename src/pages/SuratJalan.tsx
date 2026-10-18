import { useEffect, useMemo, useState } from "react";
import { PageBody, PageHeader, PeriodActions } from "@/components/Shell";
import { Button, Card, Drawer, Field, Icon, Input, Modal, Pill, SectionHeading, Select, StatusPill, Td, Th, Textarea } from "@/components/ui";
import { commodityName, driverName, vehiclePlate, type SJ, type SJStatus } from "@/lib/data";
import { cn, csvDownload, d, iso, num, parseISO, rupiah, rupiahShort, TODAY } from "@/lib/format";
import { printSuratJalan } from "@/lib/print";
import { useApp } from "@/lib/store";

const PAGE_SIZE = 12;

export default function SuratJalan() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | SJStatus>("all");
  const [customerId, setCustomerId] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<SJ | null>(null);
  const [editing, setEditing] = useState<SJ | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [printRow, setPrintRow] = useState<SJ | null>(null);
  const [printNote, setPrintNote] = useState("");
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"periode" | "semua">("periode");
const canCreate = app.can("surat-jalan", "create");
  const canEdit = app.can("surat-jalan", "edit");

  const filtered = useMemo(() => {
    return app.sj.filter((r) => {
      if (scope === "periode" && (r.date < app.period.from || r.date > app.period.to)) return false;
      if (status !== "all" && r.status !== status) return false;
      if (customerId !== "all" && r.customerId !== customerId) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const customer = app.customers.find((c) => c.id === r.customerId)?.name.toLowerCase() ?? "";
        if (!r.no.toLowerCase().includes(q) && !customer.includes(q) && !vehiclePlate(r.vehicleId).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [app.sj, app.customers, app.period, scope, status, customerId, query]);

  const totals = useMemo(() => {
    const rows = filtered.filter((r) => r.status !== "Batal");
    return {
      count: rows.length,
      volume: rows.reduce((s, r) => s + r.volume * r.trips, 0),
      value: rows.reduce((s, r) => s + r.volume * r.trips * r.price, 0),
      pending: rows.filter((r) => !r.invoiceId).length,
      selectedValue: rows.filter((r) => selected.includes(r.id)).reduce((s, r) => s + r.volume * r.trips * r.price, 0),
    };
  }, [filtered, selected]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const selectedRows = filtered.filter((r) => selected.includes(r.id));
  const selectedCustomers = new Set(selectedRows.map((r) => r.customerId));

  return (
    <PageBody>
      <PageHeader
        eyebrow="Operasional & Logistik"
        title="Surat Jalan, Ritase & Penagihan Muatan"
        description="Terbitkan surat jalan, pantau ritase dump truck per komoditas, lalu konversi dokumen terpilih menjadi invoice penagihan."
        actions={
          <PeriodActions
            onExport={() =>
              csvDownload("surat-jalan-lbs.csv", [
                ["No Surat Jalan", "Tanggal", "Pelanggan", "Komoditas", "Volume (m3)", "Ritase", "Unit", "Driver", "Nilai", "Status", "Invoice"],
                ...filtered.map((r) => [
                  r.no,
                  d(parseISO(r.date)),
                  app.customers.find((c) => c.id === r.customerId)?.name ?? "",
                  commodityName(r.commodityId),
                  r.volume,
                  r.trips,
                  vehiclePlate(r.vehicleId),
                  driverName(r.driverId),
                  r.volume * r.trips * r.price,
                  r.status,
                  app.invoices.find((i) => i.id === r.invoiceId)?.no ?? "-",
                ]),
              ])
            }
            onPrint={() => window.print()}
          />
        }
      />

      <section className="flex flex-wrap gap-space-md">
        <MiniStat label="Dokumen Terfilter" value={`${num(totals.count)} SJ`} icon="description" />
        <MiniStat label="Volume Muatan" value={`${num(totals.volume)} m³`} icon="scale" />
        <MiniStat label="Nilai Muatan" value={rupiahShort(totals.value)} icon="payments" />
        <MiniStat label="Belum Diinvoice" value={`${num(totals.pending)} SJ`} icon="pending_actions" accent />
      </section>

      <Card className="flex flex-col gap-space-md p-space-md sm:p-space-lg">
        <SectionHeading
          icon="local_shipping"
          title="Buku Register Surat Jalan"
          subtitle="Klik baris untuk melihat rincian, cetak dokumen, atau ubah status operasional"
          right={
            <div className="flex flex-wrap items-center gap-space-sm">
              <Button variant="secondary" size="sm" icon="print" onClick={() => window.print()}>
                Cetak Daftar
              </Button>
              <Button icon="add_road" disabled={!canCreate} onClick={() => setFormOpen(true)}>
                Terbitkan Surat Jalan
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-end gap-space-sm">
          <Field label="Pencarian" className="min-w-[220px] flex-1">
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="No SJ, pelanggan, atau plat armada…" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
              <option value="all">Semua status</option>
              {(["Draft", "Terkirim", "Diinvoice", "Batal"] as SJStatus[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pelanggan">
            <Select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}>
              <option value="all">Semua pelanggan</option>
              {app.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cakupan Data">
            <Select value={scope} onChange={(e) => { setScope(e.target.value as typeof scope); setPage(1); }}>
              <option value="periode">Periode laporan ({d(parseISO(app.period.from))} – {d(parseISO(app.period.to))})</option>
              <option value="semua">Seluruh riwayat</option>
            </Select>
          </Field>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl bg-primary p-space-sm text-on-primary">
            <div className="flex items-center gap-space-sm">
              <Icon name="checklist" size={20} className="text-secondary-container" />
              <span className="font-label-lg text-label-lg">
                {selectedRows.length} surat jalan dipilih • {rupiah(totals.selectedValue)}
              </span>
              <Pill tone="amber">{selectedCustomers.size} pelanggan</Pill>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <Button
                variant="outline"
                size="sm"
                className="border-primary-fixed/40 bg-transparent text-on-primary hover:bg-primary-container"
                onClick={() => setSelected([])}
              >
                Bersihkan Pilihan
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg bg-surface-container-low">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <Th align="center" className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua surat jalan pada halaman ini"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id))}
                    onChange={(e) => {
                      const ids = pageRows.map((r) => r.id);
                      setSelected(e.target.checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)));
                    }}
                    className="h-4 w-4 accent-[#00274e]"
                  />
                </Th>
                <Th>No Surat Jalan</Th>
                <Th>Pelanggan</Th>
                <Th>Komoditas</Th>
                <Th align="right">Volume</Th>
                <Th>Unit &amp; Driver</Th>
                <Th align="right">Nilai Muatan</Th>
                <Th align="center">Status</Th>
                <Th align="center">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
              {pageRows.length === 0 && (
                <tr>
                  <Td colSpan={9} align="center" className="py-space-xl text-on-surface-variant">
                    Tidak ada surat jalan yang sesuai filter.
                  </Td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr key={r.id} className={cn("transition-colors hover:bg-surface-container-lowest/60", !r.invoiceId && "bg-secondary-fixed/15")}>
                  <Td align="center">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${r.no}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((id) => id !== r.id))}
                      className="h-4 w-4 accent-[#00274e]"
                    />
                  </Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-semibold text-primary">{r.no}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        {r.date ? d(parseISO(r.date)) : "-"} • {r.site}
                      </span>
                    </div>
                  </Td>
                  <Td>{app.customers.find((c) => c.id === r.customerId)?.name}</Td>
                  <Td>{commodityName(r.commodityId)}</Td>
                  <Td align="right" className="font-mono">
                    {num(r.volume)} m³
                    <span className="block text-[11px] text-on-surface-variant">{r.trips} rit</span>
                  </Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-primary">{vehiclePlate(r.vehicleId)}</span>
                      <span className="text-[11px] text-on-surface-variant">{driverName(r.driverId)}</span>
                    </div>
                  </Td>
                  <Td align="right" className="font-mono font-semibold text-primary">{rupiah(r.volume * r.trips * r.price)}</Td>
                  <Td align="center">
                    <StatusPill status={r.invoiceId ? "Diinvoice" : r.status} />
                  </Td>
<Td align="center">
                       <div className="flex items-center justify-center gap-1">
                         <button type="button" title="Cetak surat jalan" onClick={() => { setPrintRow(r); setPrintNote(r.note ?? ""); }} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary">
                           <Icon name="print" size={18} />
                         </button>
                         <button type="button" title="Rincian dokumen" onClick={() => setDetail(r)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary">
                           <Icon name="visibility" size={18} />
                         </button>
                         <button
                           type="button"
                           title="Ubah surat jalan"
                           disabled={!!r.invoiceId || !canEdit}
                           onClick={() => setEditing(r)}
                           className="rounded-lg p-1.5 text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container disabled:opacity-30"
                         >
                           <Icon name="edit" size={18} />
                         </button>
                         <button
                           type="button"
                           title="Batalkan surat jalan"
                           disabled={!!r.invoiceId || !canEdit}
                           onClick={() => {
                             app.updateSJ(r.id, { status: "Batal" });
                             app.toast("Surat jalan dibatalkan", r.no, "warn");
                           }}
                           className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30"
                         >
                           <Icon name="cancel" size={18} />
                         </button>
                       </div>
                     </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container font-label-md text-label-md font-bold text-primary">
                <Td colSpan={4}>Total {num(pageRows.length)} dokumen pada halaman ini</Td>
                <Td align="right" className="font-mono">{num(pageRows.reduce((s, r) => s + r.volume * r.trips, 0))} m³</Td>
                <Td />
                <Td align="right" className="font-mono">{rupiah(pageRows.reduce((s, r) => s + r.volume * r.trips * r.price, 0))}</Td>
                <Td colSpan={2} align="center" className="font-label-sm text-label-sm">
                  Halaman {page} / {pageCount}
                </Td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Menampilkan {pageRows.length} dari {filtered.length} dokumen • {num(totals.volume)} m³ • {rupiah(totals.value)}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" icon="chevron_left" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Sebelumnya
            </Button>
            <span className="px-2 font-label-md text-label-md text-primary">
              {page} / {pageCount}
            </span>
            <Button variant="secondary" size="sm" icon="chevron_right" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              Berikutnya
            </Button>
          </div>
        </div>
      </Card>

      {/* Detail drawer */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.no ?? ""}
        subtitle={detail ? `${d(parseISO(detail.date))} • ${detail.site}` : ""}
footer={
            detail && (
              <>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Tutup
                </Button>
                <Button variant="secondary" icon="print" onClick={() => { setPrintRow(detail); setPrintNote(detail.note ?? ""); setDetail(null); }}>
                  Cetak Surat Jalan
                </Button>
                {!detail.invoiceId && (
                  <Button
                    variant="primary"
                    icon="edit"
                    disabled={!canEdit}
                    onClick={() => { setDetail(null); setEditing(detail); }}
                  >
                    Ubah Surat Jalan
                  </Button>
                )}
              </>
            )
          }
      >
        {detail && (
          <div className="flex flex-col gap-space-md">
            <div className="grid grid-cols-2 gap-space-sm">
              <Info label="Pelanggan" value={app.customers.find((c) => c.id === detail.customerId)?.name ?? "-"} icon="business" />
              <Info label="Nilai Muatan" value={rupiah(detail.volume * detail.trips * detail.price)} icon="payments" />
              <Info label="Komoditas" value={commodityName(detail.commodityId)} icon="category" />
              <Info label="Volume / Ritase" value={`${num(detail.volume)} m³ • ${detail.trips} rit`} icon="scale" />
              <Info label="Unit Armada" value={`${vehiclePlate(detail.vehicleId)}`} icon="local_shipping" />
              <Info label="Driver" value={driverName(detail.driverId)} icon="badge" />
            </div>
            <div className="rounded-xl bg-surface-container-low p-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Catatan Operasional</span>
              <p className="font-body-md text-body-md text-on-surface">{detail.note || "Tidak ada catatan khusus untuk dokumen ini."}</p>
            </div>
            {detail.invoiceId && (
              <div className="flex items-center justify-between rounded-xl bg-primary p-space-sm text-on-primary">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">Ditagihkan melalui</span>
                  <p className="font-label-lg text-label-lg">{app.invoices.find((i) => i.id === detail.invoiceId)?.no}</p>
                </div>
                <StatusPill status={app.invoices.find((i) => i.id === detail.invoiceId) ? app.computedStatus(app.invoices.find((i) => i.id === detail.invoiceId)!) : "-"} />
              </div>
            )}
            <div className="flex flex-wrap gap-space-sm">
              <Button
                variant="secondary"
                size="sm"
                icon="swap_horiz"
                disabled={!canEdit || !!detail.invoiceId}
                onClick={() => {
                  const next: SJStatus = detail.status === "Terkirim" ? "Draft" : "Terkirim";
                  app.updateSJ(detail.id, { status: next });
                  app.toast("Status surat jalan diubah", `${detail.no} → ${next}`, "info");
                  setDetail({ ...detail, status: next });
                }}
              >
                Ubah Status ({detail.status})
              </Button>
              <Button
                variant="amber"
                size="sm"
                icon="cancel"
                disabled={!canEdit || !!detail.invoiceId || detail.status === "Batal"}
                onClick={() => {
                  app.updateSJ(detail.id, { status: "Batal" });
                  app.toast("Surat jalan dibatalkan", detail.no, "warn");
                  setDetail({ ...detail, status: "Batal" });
                }}
              >
                Batalkan Surat Jalan
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {printRow && (
        <Modal open onClose={() => { setPrintRow(null); setPrintNote(""); }} width="max-w-md" title="Cetak Surat Jalan" subtitle="Isi catatan operasional sebelum mencetak dokumen">
          <Field label="Catatan Operasional" className="sm:col-span-2">
            <Textarea value={printNote} onChange={(e) => setPrintNote(e.target.value)} placeholder="Contoh: timbangan ulang, kondisi jalan, atau instruksi khusus site" />
          </Field>
          <div className="mt-space-md flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPrintRow(null); setPrintNote(""); }}>
              Batal
            </Button>
            <Button icon="print" onClick={() => {
              printSuratJalan(printRow, { site: printRow.site, note: printNote.trim() || undefined });
              setPrintRow(null);
              setPrintNote("");
            }}>
              Cetak Sekarang
            </Button>
          </div>
        </Modal>
      )}

      {formOpen && <SJForm onClose={() => setFormOpen(false)} editing={null} />}
      {editing && <SJForm onClose={() => setEditing(null)} editing={editing} />}
    </PageBody>
  );
}

function MiniStat({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <Card accentTop={accent ? "bg-secondary-container" : "bg-primary"} className="min-w-[190px] flex-1">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
          <span className="mt-1 font-headline-md text-headline-md font-bold text-primary tabular">{value}</span>
        </div>
        <span className={cn("rounded-lg p-2", accent ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-fixed text-primary")}>
          <Icon name={icon} size={20} />
        </span>
      </div>
    </Card>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className="block truncate font-label-lg text-label-lg text-primary">{value}</span>
      </span>
    </div>
  );
}

function SJForm({ onClose, editing }: { onClose: () => void; editing: SJ | null }) {
  const app = useApp();
  const [form, setForm] = useState({
    no: "",
    date: iso(TODAY()),
    customerId: app.customers[0]?.id ?? "",
    commodityId: app.commodities[0]?.id ?? "",
    volume: 5,
    trips: 1,
    price: app.commodities[0]?.price ?? 0,
    vehicleId: app.vehicles[0]?.id ?? "",
    driverId: app.drivers[0]?.id ?? "",
    site: "SITE GOLO MORI",
    note: "",
  });

  useEffect(() => {
    if (editing) {
      setForm({
        no: editing.no,
        date: editing.date,
        customerId: editing.customerId,
        commodityId: editing.commodityId,
        volume: editing.volume,
        trips: editing.trips,
        price: editing.price,
        vehicleId: editing.vehicleId,
        driverId: editing.driverId,
        site: editing.site,
        note: editing.note ?? "",
      });
    }
  }, [editing]);

  const value = form.volume * form.trips * form.price;

  const isEdit = !!editing;

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={isEdit ? `Ubah Surat Jalan ${editing.no}` : "Terbitkan Surat Jalan Baru"}
      subtitle={isEdit ? "Perbarui data surat jalan. Dokumen hanya bisa diubah selama belum diinvoice." : "Isi nomor surat jalan secara manual atau biarkan kosong untuk nomor otomatis"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            icon={isEdit ? "edit" : "add_road"}
            disabled={isEdit && !!editing.invoiceId}
            onClick={async () => {
              if (isEdit) {
                await app.updateSJ(editing.id, { ...form });
                onClose();
                app.toast("Surat jalan diperbarui", form.no, "success");
              } else {
                const row = await app.addSJ({ ...form });
                onClose();
                app.toast("Dokumen siap dicetak", row.no, "info");
              }
            }}
          >
            {isEdit ? "Simpan Perubahan" : "Terbitkan & Simpan"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <Field label="Nomor Surat Jalan" className="sm:col-span-2">
          <Input value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} placeholder="Contoh: SJ/LBS/2026/10/0001 — biarkan kosong untuk otomatis" />
        </Field>
        <Field label="Tanggal Muat">
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Lokasi Muat">
          <Select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
            {["SITE GOLO MORI", "STOCKPILE LABUAN BAJO", "QUARRY WAE KESAMBI"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pelanggan" className="sm:col-span-2">
          <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            {app.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — termin {c.term} hari
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Komoditas">
          <Select value={form.commodityId} onChange={(e) => {
            const selected = app.commodities.find((c) => c.id === e.target.value);
            setForm({ ...form, commodityId: e.target.value, price: selected?.price ?? 0 });
          }}>
            {app.commodities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {rupiah(c.price)}/{c.unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Harga Satuan (bisa diubah, default mengikuti master)">
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="font-mono" />
        </Field>
        <Field label="Volume per Ritase (m³)">
          <Input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} />
        </Field>
        <Field label="Jumlah Ritase">
          <Input type="number" value={form.trips} onChange={(e) => setForm({ ...form, trips: Number(e.target.value) })} />
        </Field>
        <Field label="Unit Armada">
          <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            {app.vehicles
              .filter((v) => v.type === "Dump Truck")
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.model} ({v.capacity} m³)
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Driver">
          <Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            {app.drivers.map((dr) => (
              <option key={dr.id} value={dr.id}>
                {dr.name} — {dr.sim}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan Operasional" className="sm:col-span-2">
          <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: timbangan ulang, kondisi jalan, atau instruksi khusus site" />
        </Field>
      </div>
      <div className="mt-space-md flex items-center justify-between rounded-xl bg-surface-container-low p-space-md">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Estimasi Nilai Muatan</span>
          <p className="font-headline-md text-headline-md text-primary tabular">{rupiah(value)}</p>
        </div>
        <div className="text-right">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Volume Total</span>
          <p className="font-headline-md text-headline-md text-primary tabular">{num(form.volume * form.trips)} m³</p>
        </div>
      </div>
    </Modal>
  );
}

