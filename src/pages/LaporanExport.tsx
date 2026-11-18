import { useMemo } from "react";
import * as XLSX from "xlsx";
import { PageBody, PageHeader } from "@/components/Shell";
import { Button, Card, Pill, SectionHeading, Td, Th } from "@/components/ui";
import { d, num, parseISO, rupiah } from "@/lib/format";
import { useApp } from "@/lib/store";

const COMPANY = "PT LOGAM BUMI SANTOSA — Site Golo Mori";

let appPeriod: { from: string; to: string } = { from: "", to: "" };

function buildSheet(
  title: string,
  headers: string[],
  rows: any[][],
  moneyCols: number[],
  dateCols: number[],
) {
  const wsData: any[][] = [
    [COMPANY],
    [title],
    [`Periode: ${d(parseISO(appPeriod.from))} s/d ${d(parseISO(appPeriod.to))}`],
    [],
    headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const headerRow = 5;
  const firstDataRow = headerRow + 1;
  const lastRow = wsData.length;
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(10, h.length + 4) }));
  ws["!cols"][0] = { wch: 16 };

  for (let c = 0; c < headers.length; c++) {
    const cell = ws[`${String.fromCharCode(65 + c)}${headerRow}`];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "00274E" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "00274E" } },
          bottom: { style: "thin", color: { rgb: "00274E" } },
          left: { style: "thin", color: { rgb: "00274E" } },
          right: { style: "thin", color: { rgb: "00274E" } },
        },
      };
    }
  }

  for (let r = firstDataRow; r <= lastRow; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cell = ws[`${String.fromCharCode(65 + c)}${r}`];
      if (!cell) continue;
      cell.s = {
        font: { sz: 10 },
        alignment: { vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "BFBFBF" } },
          bottom: { style: "thin", color: { rgb: "BFBFBF" } },
          left: { style: "thin", color: { rgb: "BFBFBF" } },
          right: { style: "thin", color: { rgb: "BFBFBF" } },
        },
      };
      if (moneyCols.includes(c)) {
        cell.s!.alignment = { ...cell.s!.alignment, horizontal: "right" };
        if (cell.t === "n") {
          cell.z = '"Rp "#,##0';
        }
      }
      if (dateCols.includes(c)) {
        cell.s!.alignment = { ...cell.s!.alignment, horizontal: "center" };
      }
      if (c === 0) {
        cell.s!.alignment = { ...cell.s!.alignment, horizontal: "left" };
      }
    }
  }

  for (let r = 1; r <= 3; r++) {
    const cell = ws[`A${r}`];
    if (cell) {
      cell.s = {
        font: { bold: true, sz: r === 1 ? 14 : 11, color: { rgb: "00274E" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }
  }
  ws["!freeze"] = `A${firstDataRow}`;
  return ws;
}

export default function LaporanExport() {
  const app = useApp();
  appPeriod = app.period;
  const { from, to } = app.period;

  /* Lookup master data dari store (sinkron dengan data transaksi), bukan array statis */
  const cName = (id: string) => app.customers.find((c) => c.id === id)?.name ?? "-";
  const cMod = (id: string) => app.commodities.find((c) => c.id === id)?.name ?? "-";
  const vPlate = (id: string) => app.vehicles.find((v) => v.id === id)?.plate ?? "-";
  const dName = (id: string) => app.drivers.find((d) => d.id === id)?.name ?? "-";


  const sjList = useMemo(
    () =>
      app.sj.filter((s) => s.date >= from && s.date <= to && s.status !== "Batal"),
    [app.sj, from, to],
  );
  const invoiceList = useMemo(
    () => app.invoices.filter((i) => i.date >= from && i.date <= to),
    [app.invoices, from, to],
  );
  const bankTxList = useMemo(
    () => app.bankTx.filter((t) => t.date >= from && t.date <= to),
    [app.bankTx, from, to],
  );

  const sjStats = useMemo(() => {
    const count = sjList.length;
    const value = sjList.reduce((s, r) => s + r.volume * r.trips * r.price, 0);
    const pending = sjList.filter((r) => !r.invoiceId && !r.receiptId).length;
    return { count, value, pending };
  }, [sjList]);

  const invStats = useMemo(() => {
    const count = invoiceList.length;
    const total = invoiceList.reduce((s, i) => s + i.total, 0);
    const dpp = invoiceList.reduce((s, i) => s + i.dpp, 0);
    const ppn = invoiceList.reduce((s, i) => s + i.ppn, 0);
    const lunas = invoiceList.filter((i) => i.status === "Lunas").length;
    return { count, total, dpp, ppn, lunas };
  }, [invoiceList]);

  const kasStats = useMemo(() => {
    const masuk = bankTxList.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const keluar = bankTxList.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    return { masuk, keluar, saldo: masuk - keluar, count: bankTxList.length };
  }, [bankTxList]);

  const sjPreview = sjList.slice(0, 10).map((r) => ({
    no: r.no,
    tanggal: d(parseISO(r.date)),
    pelanggan: cName(r.customerId),
    komoditas: cMod(r.commodityId),
    volume: num(r.volume * r.trips),
    nilai: rupiah(r.volume * r.trips * r.price),
    status: r.status,
    kendaraan: vPlate(r.vehicleId),
    sopir: dName(r.driverId),
  }));
  const invPreview = invoiceList.slice(0, 10).map((i) => ({
    no: i.no,
    tanggal: d(parseISO(i.date)),
    jatuhTempo: d(parseISO(i.dueDate)),
    pelanggan: cName(i.customerId),
    dpp: rupiah(i.dpp),
    ppn: rupiah(i.ppn),
    total: rupiah(i.total),
    status: i.status,
  }));
  const kasPreview = bankTxList.slice(0, 10).map((t) => {
    const acc = app.accounts.find((a) => a.id === t.accountId);
    return {
      tanggal: d(parseISO(t.date)),
      rekening: acc ? `${acc.code} — ${acc.name}` : "-",
      deskripsi: t.desc,
      kategori: t.category,
      masuk: t.direction === "in" ? rupiah(t.amount) : "-",
      keluar: t.direction === "out" ? rupiah(t.amount) : "-",
    };
  });

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      Draft: "default",
      Terkirim: "default",
      Diinvoice: "default",
      Batal: "danger",
      "Belum Jatuh Tempo": "default",
      "Jatuh Tempo": "warn",
      Terlambat: "danger",
      Sebagian: "warn",
      Lunas: "success",
    };
    return map[status] ?? "default";
  };

  const exportSJ = () => {
    const rows = sjList.map((r) => [
      r.no,
      r.date,
      cName(r.customerId),
      cMod(r.commodityId),
      r.volume * r.trips,
      r.trips,
      vPlate(r.vehicleId),
      dName(r.driverId),
      r.volume * r.trips * r.price,
      r.status,
    ]);
    const ws = buildSheet(
      "LAPORAN SURAT JALAN",
      ["No SJ", "Tanggal", "Pelanggan", "Komoditas", "Volume (m³)", "Trips", "Kendaraan (Nopol)", "Sopir (Driver)", "Nilai (Rp)", "Status"],
      rows,
      [8],
      [1],
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surat Jalan");
    XLSX.writeFile(wb, `Laporan_SuratJalan_${from}_s.d._${to}.xlsx`);
    app.toast("Surat jalan diekspor", `Terunduh ${sjList.length} baris`, "success");
  };

  const exportInvoice = () => {
    const rows = invoiceList.map((i) => [
      i.no,
      i.date,
      i.dueDate,
      cName(i.customerId),
      i.dpp,
      i.ppn,
      i.total,
      i.status,
    ]);
    const ws = buildSheet(
      "LAPORAN INVOICE",
      ["No Invoice", "Tanggal", "Jatuh Tempo", "Pelanggan", "DPP (Rp)", "PPN (Rp)", "Total (Rp)", "Status"],
      rows,
      [4, 5, 6],
      [1, 2],
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Laporan_Invoice_${from}_s.d._${to}.xlsx`);
    app.toast("Invoice diekspor", `Terunduh ${invoiceList.length} baris`, "success");
  };

  const exportKas = () => {
    const rows = bankTxList.map((t) => {
      const acc = app.accounts.find((a) => a.id === t.accountId);
      return [
        t.date,
        acc ? `${acc.code} — ${acc.name}` : "-",
        t.desc,
        t.category,
        t.direction === "in" ? t.amount : 0,
        t.direction === "out" ? t.amount : 0,
      ];
    });
    const ws = buildSheet(
      "LAPORAN KAS KEUANGAN",
      ["Tanggal", "Rekening", "Deskripsi", "Kategori", "Masuk (Rp)", "Keluar (Rp)"],
      rows,
      [4, 5],
      [0],
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kas Keuangan");
    XLSX.writeFile(wb, `Laporan_KasKeuangan_${from}_s.d._${to}.xlsx`);
    app.toast("Kas keuangan diekspor", `Terunduh ${bankTxList.length} baris`, "success");
  };

  const exportAll = () => {
    const sjRows = sjList.map((r) => [
      r.no,
      r.date,
      cName(r.customerId),
      cMod(r.commodityId),
      r.volume * r.trips,
      r.trips,
      vPlate(r.vehicleId),
      dName(r.driverId),
      r.volume * r.trips * r.price,
      r.status,
    ]);
    const invRows = invoiceList.map((i) => [
      i.no,
      i.date,
      i.dueDate,
      cName(i.customerId),
      i.dpp,
      i.ppn,
      i.total,
      i.status,
    ]);
    const kasRows = bankTxList.map((t) => {
      const acc = app.accounts.find((a) => a.id === t.accountId);
      return [
        t.date,
        acc ? `${acc.code} — ${acc.name}` : "-",
        t.desc,
        t.category,
        t.direction === "in" ? t.amount : 0,
        t.direction === "out" ? t.amount : 0,
      ];
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(
        "LAPORAN SURAT JALAN",
        ["No SJ", "Tanggal", "Pelanggan", "Komoditas", "Volume (m³)", "Trips", "Kendaraan (Nopol)", "Sopir (Driver)", "Nilai (Rp)", "Status"],
        sjRows,
        [8],
        [1],
      ),
      "Surat Jalan",
    );
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(
        "LAPORAN INVOICE",
        ["No Invoice", "Tanggal", "Jatuh Tempo", "Pelanggan", "DPP (Rp)", "PPN (Rp)", "Total (Rp)", "Status"],
        invRows,
        [4, 5, 6],
        [1, 2],
      ),
      "Invoice",
    );
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(
        "LAPORAN KAS KEUANGAN",
        ["Tanggal", "Rekening", "Deskripsi", "Kategori", "Masuk (Rp)", "Keluar (Rp)"],
        kasRows,
        [4, 5],
        [0],
      ),
      "Kas Keuangan",
    );
    XLSX.writeFile(wb, `Laporan_Lengkap_${from}_s.d._${to}.xlsx`);
    app.toast("Laporan lengkap diekspor", "3 sheet (SJ, Invoice, Kas)", "success");
  };

  return (
    <PageBody>
      <PageHeader
        eyebrow="Laporan Manajemen"
        title="Laporan & Export Excel"
        description={`Unduh laporan operasional dan keuangan dalam format Excel (.xlsx) yang siap direview atasan. Semua data difilter sesuai periode ${d(parseISO(from))} s/d ${d(parseISO(to))}.`}
      />

      <Card className="flex flex-wrap gap-space-sm p-space-md">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Surat Jalan</span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-bold text-primary">{num(sjStats.count)}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">dokumen</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{rupiah(sjStats.value)} â€¢ {sjStats.pending} blm tagih</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Invoice</span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-bold text-primary">{num(invStats.count)}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">dokumen</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{rupiah(invStats.total)} â€¢ {invStats.lunas} lunas</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Kas Keuangan</span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-bold text-primary">{rupiah(kasStats.masuk)}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">masuk</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{rupiah(kasStats.keluar)} keluar â€¢ saldo {rupiah(kasStats.saldo)}</span>
        </div>
      </Card>

      <Card className="flex flex-col gap-space-sm p-space-md sm:p-space-lg">
        <SectionHeading
          icon="local_shipping"
          title="Laporan Surat Jalan"
          subtitle={`Dokumen pengiriman dalam periode. Total ${rupiah(sjStats.value)} (${sjStats.count} dokumen, ${sjStats.pending} belum ditagih).`}
          right={
            <Button variant="primary" icon="table_view" onClick={exportSJ} className="px-4">
              Export Surat Jalan ke Excel
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">No SJ</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Tanggal</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Pelanggan</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Komoditas</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">Volume (m³)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">Nilai (Rp)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Kendaraan (Nopol)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Sopir (Driver)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {sjPreview.map((r) => (
                <tr key={r.no} className="hover:bg-surface-container-low">
                  <Td className="font-mono text-label-md">{r.no}</Td>
                  <Td className="text-body-sm">{r.tanggal}</Td>
                  <Td className="text-body-sm">{r.pelanggan}</Td>
                  <Td className="text-body-sm">{r.komoditas}</Td>
                  <Td className="text-right font-mono text-label-md">{r.volume}</Td>
                  <Td className="text-right font-mono text-label-md">{r.nilai}</Td>
                  <Td className="text-body-sm">{r.kendaraan}</Td>
                  <Td className="text-body-sm">{r.sopir}</Td>
                  <Td>
                    <Pill tone={formatStatus(r.status) as any}>{r.status}</Pill>
                  </Td>
                </tr>
              ))}
              {sjPreview.length === 0 && (
                <tr>
                  <Td colSpan={9} className="py-4 text-center text-on-surface-variant">
                    Tidak ada data surat jalan pada periode ini.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-space-sm p-space-md sm:p-space-lg mt-space-xl">
        <SectionHeading
          icon="receipt_long"
          title="Laporan Invoice"
          subtitle={`Tagihan pelanggan dalam periode. Total ${rupiah(invStats.total)} (DPP ${rupiah(invStats.dpp)} + PPN ${rupiah(invStats.ppn)}), ${invStats.lunas} lunas.`}
          right={
            <Button variant="primary" icon="table_view" onClick={exportInvoice} className="px-4">
              Export Invoice ke Excel
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">No Invoice</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Tanggal</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Jatuh Tempo</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Pelanggan</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">DPP (Rp)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">PPN (Rp)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">Total (Rp)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {invPreview.map((r) => {
                const st = formatStatus(r.status);
                return (
                  <tr key={r.no} className="hover:bg-surface-container-low">
                    <Td className="font-mono text-label-md">{r.no}</Td>
                    <Td className="text-body-sm">{r.tanggal}</Td>
                    <Td className="text-body-sm">{r.jatuhTempo}</Td>
                    <Td className="text-body-sm">{r.pelanggan}</Td>
                    <Td className="text-right font-mono text-label-md">{r.dpp}</Td>
                    <Td className="text-right font-mono text-label-md">{r.ppn}</Td>
                    <Td className="text-right font-mono text-label-md">{r.total}</Td>
                    <Td>
                      <Pill tone={st as any}>{r.status}</Pill>
                    </Td>
                  </tr>
                );
              })}
              {invPreview.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-4 text-center text-on-surface-variant">
                    Tidak ada invoice pada periode ini.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-space-sm p-space-md sm:p-space-lg mt-space-xl">
        <SectionHeading
          icon="account_balance_wallet"
          title="Laporan Kas Keuangan"
          subtitle={`Mutasi kas & bank dalam periode. Masuk ${rupiah(kasStats.masuk)} â€¢ Keluar ${rupiah(kasStats.keluar)} â€¢ Saldo ${rupiah(kasStats.saldo)} (${kasStats.count} transaksi).`}
          right={
            <Button variant="primary" icon="table_view" onClick={exportKas} className="px-4">
              Export Kas ke Excel
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Tanggal</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Rekening</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Deskripsi</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1">Kategori</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">Masuk (Rp)</Th>
                <Th className="font-label-sm text-label-sm text-on-surface-variant pb-1 text-right">Keluar (Rp)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {kasPreview.map((r) => (
                <tr key={r.tanggal + r.deskripsi} className="hover:bg-surface-container-low">
                  <Td className="text-body-sm">{r.tanggal}</Td>
                  <Td className="text-body-sm">{r.rekening}</Td>
                  <Td className="text-body-sm">{r.deskripsi}</Td>
                  <Td className="text-body-sm">{r.kategori}</Td>
                  <Td className="text-right font-mono text-label-md">{r.masuk}</Td>
                  <Td className="text-right font-mono text-label-md">{r.keluar}</Td>
                </tr>
              ))}
              {kasPreview.length === 0 && (
                <tr>
                  <Td colSpan={6} className="py-4 text-center text-on-surface-variant">
                    Tidak ada transaksi kas/bank pada periode ini.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-space-sm p-space-md sm:p-space-lg mt-space-xl">
        <SectionHeading
          icon="description"
          title="Export Semua ke Satu File Excel"
          subtitle="Satu file berisi tiga sheet: Surat Jalan, Invoice, dan Kas Keuangan. Cocok untuk laporan bulanan ke atasan."
        />
        <div className="flex items-center gap-space-sm">
          <Button variant="primary" icon="description" onClick={exportAll} className="px-5 py-3 font-label-lg">
            Unduh Laporan Lengkap (.xlsx)
          </Button>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Format .xlsx dapat dibuka Excel, Google Sheets, atau WPS Office.
          </span>
        </div>
      </Card>
    </PageBody>
  );
}





