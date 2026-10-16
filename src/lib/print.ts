import type { Invoice, SJ } from "./data";
import { CUSTOMERS, commodityName, customerName, driverName, vehiclePlate } from "./data";
import { d, daysBetween, num, parseISO, rupiah } from "./format";

const shell = (title: string, body: string) => `
<html lang="id"><head><meta charset="utf-8"><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Inter",Arial,Helvetica,sans-serif;color:#0b1c30;margin:0;padding:32px 36px;font-size:12px}
  .kop{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #00274e;padding-bottom:10px}
  .brand{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:20px;font-weight:800;color:#00274e;letter-spacing:-.4px;margin:0}
  .sub{color:#43474f;font-size:11px;margin:2px 0 0}
  .doc{text-align:right}
  .doc h2{margin:0;font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:16px;letter-spacing:1px;color:#00274e;text-transform:uppercase}
  .doc .no{font-size:13px;font-weight:700;color:#795900;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th{background:#e5eeff;color:#00274e;text-align:left;padding:7px 8px;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px}
  td{padding:7px 8px;border-bottom:1px solid #e5eeff;vertical-align:top}
  tfoot td{background:#eff4ff;font-weight:700;color:#00274e}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-top:14px}
  .kv b{display:inline-block;min-width:120px;color:#43474f;font-weight:600}
  .sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:38px;text-align:center}
  .sign div{border-top:1px solid #c3c6d1;padding-top:6px;font-size:11px;color:#43474f}
  .sign-one{margin:38px 0 0 auto;width:280px;text-align:center;font-size:12px;color:#43474f}
  .sign-one .line{border-top:1px solid #c3c6d1;margin:-4px 0 6px}
  .sign-one b{display:block;font-size:12.5px;color:#00274e}
  .sign-one span{font-size:11px}
  .note{margin-top:16px;padding:10px 12px;background:#ffdea0;border-left:4px solid #795900;font-size:11px;color:#261a00}
  .foot{margin-top:22px;font-size:10px;color:#737780;border-top:1px solid #e5eeff;padding-top:8px}
  .page{page-break-before:always;break-before:page}
  .sec-title{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:13px;font-weight:700;color:#00274e;text-transform:uppercase;letter-spacing:.6px;margin:18px 0 6px}
  .grp{border:1px solid #d3e4fe;border-radius:6px;margin-top:16px;overflow:hidden}
  .grp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;background:#eff4ff;border-left:5px solid #00274e;padding:9px 12px}
  .grp-head b{font-size:12.5px;color:#00274e}
  .grp-head span{font-size:10.5px;color:#43474f}
  .grp table{margin-top:0}
  .grp, .grp table, .grp tbody, .grp tr { break-inside: avoid; page-break-inside: avoid; }
  .mini{font-size:10px;color:#737780}
  .tick{background:#fff8e6}
</style></head><body>${body}</body></html>`;

const kop = (docTitle: string, docNo: string) => `
<div class="kop">
  <div>
    <p class="brand">PT LOGAM BUMI SANTOSA</p>
    <p class="sub">Quarry &amp; Hauling Contractor — Site Golo Mori, Manggarai Barat, NTT</p>
    <p class="sub">Ruko Pemda No.9 Jl. Wae Medu, Komodo, Manggarai Barat, NTT </p> 
    <p class="sub">Telp. +62 812 - 3796 - 9981 | +62 823 - 1411 - 8179 | logambumisantosa@gmail.com, adminlbs.gm@gmail.com</p>
  </div>
  <div class="doc">
    <h2>${docTitle}</h2>
    <p class="no">${docNo}</p>
    <p class="sub">Tanggal cetak: ${d(parseISO(new Date().toISOString().slice(0, 10)))}</p>
    <p class="sub">Sistem: LBS System 1.0</p>
  </div>
</div>`;

function run(title: string, body: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.write(shell(title, body));
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
}

export function printSuratJalan(row: SJ, extras: { site: string; note?: string }) {
  const body = `
  ${kop("Surat Jalan / Delivery Order", row.no)}
  <div class="grid">
    <div class="kv"><b>Pelanggan</b> ${customerName(row.customerId)}</div>
    <div class="kv"><b>Tanggal Muat</b> ${d(parseISO(row.date))}</div>
    <div class="kv"><b>Lokasi Muat</b> ${extras.site}</div>
    <div class="kv"><b>Unit Armada</b> ${vehiclePlate(row.vehicleId)}</div>
    <div class="kv"><b>Driver</b> ${driverName(row.driverId)}</div>
    <div class="kv"><b>Jumlah Ritase</b> ${num(row.trips)} rit</div>
  </div>
  <table>
    <thead><tr><th>Komoditas</th><th>Volume</th></tr></thead>
    <tbody>
      <tr><td>${commodityName(row.commodityId)}</td><td>${num(row.volume)} m³</td></tr>
    </tbody>
    <tfoot><tr><td colspan="2">Total Volume Muatan ${num(row.volume)} m³</td></tr></tfoot>
  </table>
  ${extras.note ? `<div class="note"><b>Catatan operasional:</b> ${extras.note}</div>` : ""}
  <div class="sign">
    <div>Driver<br/><br/>${driverName(row.driverId)}</div>
    <div>Petugas Timbangan<br/><br/>…………………………</div>
    <div>Penerima / Pelanggan<br/><br/>…………………………</div>
  </div>
  <p class="foot">Dokumen ini diterbitkan otomatis oleh LBS System 1.0 dan sah tanpa tanda tangan basah selama data timbangan tercatat pada sistem.</p>`;
  run(`Surat Jalan ${row.no}`, body);
}

/** Membangun HTML invoice: halaman 1 ringkasan, halaman 2+ lampiran surat jalan (dikelompokkan per pelanggan asal muatan). */
export function invoiceHtml(inv: Invoice, ctx: { paid: number; status: string; rows: SJ[] }) {
  const cust = CUSTOMERS.find((c) => c.id === inv.customerId);
  /** Tarif pajak per invoice (dapat diisi manual) — fallback 11%. */
  const rate = inv.ppnRate ?? 0.11;
  const ratePct = rate * 100;
  const rateLabel = `PPN ${ratePct % 1 === 0 ? ratePct.toFixed(0) : ratePct.toFixed(2).replace(/0$/, "")}%`;
  const termDays = daysBetween(new Date(inv.date), new Date(inv.dueDate));
  const isGabungan = inv.kind === "Gabungan" || new Set(ctx.rows.map((r) => r.customerId)).size > 1;

  /* Kelompokkan surat jalan per pelanggan asal muatan */
  const groups = (() => {
    const map = new Map<string, SJ[]>();
    [...ctx.rows]
      .sort((a, b) => (a.no < b.no ? -1 : a.no > b.no ? 1 : 0))
      .forEach((r) => {
        const arr = map.get(r.customerId) ?? [];
        arr.push(r);
        map.set(r.customerId, arr);
      });
    return [...map.entries()]
      .map(([cid, rows]) => {
        const c = CUSTOMERS.find((x) => x.id === cid);
        return {
          cid,
          name: c?.name ?? cid,
          code: c?.code ?? "-",
          city: c?.city ?? "-",
          term: c?.term ?? 30,
          rows,
          volume: rows.reduce((sum, r) => sum + r.volume * r.trips, 0),
          value: rows.reduce((sum, r) => sum + r.volume * r.trips * r.price, 0),
        };
      })
      .sort((a, b) => b.value - a.value);
  })();

  const totalVolume = groups.reduce((sum, g) => sum + g.volume, 0);
  const totalSj = ctx.rows.length;

  /* ---------- HALAMAN 1 — RINGKASAN INVOICE ---------- */
  const summaryRows = groups
    .map(
      (g) => `<tr>
        <td>${g.name}<br/><span class="mini">${g.code} • ${g.city}${g.cid === inv.customerId ? "" : " • asal muatan"}</span></td>
        <td style="text-align:center">${g.rows.length}</td>
        <td style="text-align:right">${num(g.volume)} m³</td>
        <td style="text-align:right">${rupiah(g.value)}</td>
      </tr>`,
    )
    .join("");

  const page1 = `
  ${kop("Invoice / Faktur Penagihan", inv.no)}
  ${
    isGabungan
      ? `<div class="note"><b>INVOICE GABUNGAN</b> — ditagihkan kepada <b>${cust?.name ?? "-"}</b> dan mencakup surat jalan dari <b>${groups.length} pelanggan asal muatan</b>. Rincian lengkap tiap surat jalan (nomor, driver, nopol, komoditas, volume, nilai muatan) terdapat pada <b>halaman lampiran</b>.</div>`
      : ""
  }
  <div class="grid">
    <div class="kv"><b>Ditagihkan Kepada</b> ${cust?.name ?? "-"}</div>
    <div class="kv"><b>Kode Pelanggan</b> ${cust?.code ?? "-"} • ${cust?.city ?? "-"}</div>
    <div class="kv"><b>Kontak</b> ${cust?.contact ?? "-"} — ${cust?.phone ?? "-"}</div>
    <div class="kv"><b>Termin Pembayaran</b> ${termDays} hari</div>
    <div class="kv"><b>Tanggal Invoice</b> ${d(parseISO(inv.date))}</div>
    <div class="kv"><b>Jatuh Tempo</b> ${d(parseISO(inv.dueDate))}</div>
    <div class="kv"><b>Status Sistem</b> ${ctx.status}</div>
    <div class="kv"><b>Jenis Invoice</b> ${isGabungan ? "Gabungan antar pelanggan" : "Reguler"}</div>
    <div class="kv"><b>Jumlah Surat Jalan</b> ${totalSj} dokumen</div>
    <div class="kv"><b>Total Volume Muatan</b> ${num(totalVolume)} m³</div>
  </div>

  <div class="sec-title">Ringkasan per Pelanggan Asal Muatan</div>
  <table>
    <thead><tr><th>Pelanggan Asal Muatan</th><th style="text-align:center">Jumlah SJ</th><th style="text-align:right">Volume</th><th style="text-align:right">Nilai Muatan (DPP)</th></tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot><tr><td>TOTAL</td><td style="text-align:center">${totalSj}</td><td style="text-align:right">${num(totalVolume)} m³</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr></tfoot>
  </table>

  <div class="sec-title">Ringkasan Tagihan</div>
  <table>
    <tbody>
      <tr><td>Dasar Pengenaan Pajak (DPP) — ${totalSj} surat jalan</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr>
      <tr><td>${rateLabel} (tarif diisi manual pada penerbitan)</td><td style="text-align:right">${rupiah(inv.ppn)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Total Tagihan</td><td style="text-align:right">${rupiah(inv.total)}</td></tr>
      <tr><td>Sudah Dibayar</td><td style="text-align:right">${rupiah(ctx.paid)}</td></tr>
      <tr><td>Sisa Kewajiban</td><td style="text-align:right">${rupiah(Math.max(0, inv.total - ctx.paid))}</td></tr>
    </tfoot>
  </table>

  <div class="note">Pembayaran ditransfer ke <b>Bank Mandiri 181-00-7788787-6</b> a/n PT Logam Bumi Santosa. Mohon cantumkan nomor invoice pada berita transfer.</div>

  <div class="sign-one">
    <div>Manggarai Barat, ${d(parseISO(inv.date))}<br/>Hormat kami,</div>
    <img src="/ttd_direktur.png" alt="Tanda tangan Direktur" style="height:64px;display:inline-block;margin:0 0 -2px 18px;" />
    <div class="line"></div>
    <b>JEMY LASMONO NDAY</b>
    <span>Direktur</span>
  </div>
  <p class="foot">${inv.note ?? ""} — Lampiran surat jalan lengkap: halaman 2 dan seterusnya. Dokumen dihasilkan otomatis oleh LBS System 1.0.</p>`;

  /* ---------- HALAMAN 2+ — LAMPIRAN SURAT JALAN PER PELANGGAN ---------- */
  const groupBlocks = groups
    .map((g, idx) => {
      const rows = g.rows
        .map(
          (r) => `<tr>
            <td style="font-size:9px">${r.no}<br/><span class="mini" style="font-size:9px">${d(parseISO(r.date))} • ${r.site}</span></td>
            <td style="font-size:9px">${driverName(r.driverId)}</td>
            <td style="font-size:9px">${vehiclePlate(r.vehicleId)}</td>
            <td style="font-size:9px">${commodityName(r.commodityId)}</td>
            <td style="text-align:right;font-size:9px">${num(r.volume * r.trips)} m³</td>
            <td style="text-align:right;font-size:9px">${rupiah(r.volume * r.trips * r.price)}</td>
          </tr>`,
        )
        .join("");
      return `
      <div style="break-inside:avoid;page-break-inside:avoid;">
        <div class="grp">
          <div class="grp-head">
            <div>
              <b>LAMPIRAN ${idx + 1} — ASAL MUATAN: ${g.name}</b><br/>
              <span>Kode ${g.code} • ${g.city} • termin ${g.term} hari</span>
            </div>
            <div style="text-align:right">
              <span>${g.rows.length} surat jalan • ${num(g.volume)} m³</span><br/>
              <span>Subtotal DPP <b>${rupiah(g.value)}</b></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="font-size:9px">Nomor Surat Jalan</th><th style="font-size:9px">Driver</th><th style="font-size:9px">Nopol</th><th style="font-size:9px">Jenis Komoditas</th>
                <th style="text-align:right;font-size:9px">Volume</th><th style="text-align:right;font-size:9px">Nilai Muatan</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="font-size:9px">Subtotal ${g.name}</td>
                <td style="text-align:right;font-size:9px">${num(g.volume)} m³</td>
                <td style="text-align:right;font-size:9px">${rupiah(g.value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
    })
    .join("");

  const recap = isGabungan ? `
  <div class="sec-title">Rekapitulasi Lampiran Surat Jalan — ${inv.no}</div>
  <table>
    <thead><tr><th>Pelanggan Asal Muatan</th><th style="text-align:center">Jumlah SJ</th><th style="text-align:right">Volume</th><th style="text-align:right">Nilai Muatan (DPP)</th></tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot>
      <tr><td>TOTAL DPP LAMPIRAN</td><td style="text-align:center">${totalSj}</td><td style="text-align:right">${num(totalVolume)} m³</td><td style="text-align:right">${rupiah(inv.dpp)}</td></tr>
    </tfoot>
  </table>
  <table>
    <tbody>
      <tr><td>${rateLabel}</td><td style="text-align:right">${rupiah(inv.ppn)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Total Tagihan (sesuai halaman 1)</td><td style="text-align:right">${rupiah(inv.total)}</td></tr>
      <tr><td>Sudah Dibayar</td><td style="text-align:right">${rupiah(ctx.paid)}</td></tr>
      <tr><td>Sisa Kewajiban</td><td style="text-align:right">${rupiah(Math.max(0, inv.total - ctx.paid))}</td></tr>
    </tfoot>
  </table>` : "";

  const lampiran = `
  <div class="page">
    ${groupBlocks || '<p>Tidak ada surat jalan terlampir pada invoice ini.</p>'}
    ${recap}
    <p class="foot">Lampiran ini merupakan bagian tidak terpisahkan dari Invoice ${inv.no} • ${totalSj} surat jalan • ${groups.length} pelanggan asal muatan • dicetak dari LBS System 1.0.</p>
  </div>`;

  const body = `${page1}${totalSj > 0 ? lampiran : ""}`;
  return { title: `Invoice ${inv.no}`, body };
}

export function printInvoice(inv: Invoice, ctx: { paid: number; status: string; rows: SJ[] }) {
  const { title, body } = invoiceHtml(inv, ctx);
  run(title, body);
}

export function printCashReport(rows: { name: string; opening: number; masuk: number; keluar: number; balance: number; role: string }[], period: { from: string; to: string }) {
  const body = `
  ${kop("Laporan Arus Kas & Likuiditas", `Periode ${d(parseISO(period.from))} – ${d(parseISO(period.to))}`)}
  <table>
    <thead><tr><th>Rekening / Akun</th><th>Peruntukan</th><th style="text-align:right">Saldo Awal</th><th style="text-align:right">Masuk</th><th style="text-align:right">Keluar</th><th style="text-align:right">Saldo Akhir</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td>${r.name}</td><td>${r.role}</td><td style="text-align:right">${rupiah(r.opening)}</td><td style="text-align:right">${rupiah(r.masuk)}</td><td style="text-align:right">${rupiah(r.keluar)}</td><td style="text-align:right">${rupiah(r.balance)}</td></tr>`).join("")}
    </tbody>
    <tfoot>
      <tr><td colspan="2">Total Akumulasi Likuiditas</td><td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.opening, 0))}</td><td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.masuk, 0))}</td><td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.keluar, 0))}</td><td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.balance, 0))}</td></tr>
    </tfoot>
  </table>
  <div class="sign"><div>Disusun<br/><br/>Staff Keuangan</div><div>Direkonsiliasi<br/><br/>Finance Supervisor</div><div>Disetujui<br/><br/>Gunawan. S</div></div>`;
  run("Laporan Arus Kas LBS", body);
}

export function printPayslip(period: string, employee: { name: string; role: string; division: string; basic: number; allowance: number; hadir: number; izin: number; alpha: number }, totals: { potongan: number; net: number }) {
  const body = `
  ${kop("Slip Gaji Karyawan", `Periode ${period}`)}
  <div class="grid">
    <div class="kv"><b>Nama</b> ${employee.name}</div>
    <div class="kv"><b>Jabatan</b> ${employee.role}</div>
    <div class="kv"><b>Divisi</b> ${employee.division}</div>
    <div class="kv"><b>Kehadiran</b> ${employee.hadir} hari · izin ${employee.izin} · alpha ${employee.alpha}</div>
  </div>
  <table>
    <thead><tr><th>Komponen</th><th style="text-align:right">Jumlah</th></tr></thead>
    <tbody>
      <tr><td>Gaji Pokok</td><td style="text-align:right">${rupiah(employee.basic)}</td></tr>
      <tr><td>Tunjangan Jabatan &amp; Operasional</td><td style="text-align:right">${rupiah(employee.allowance)}</td></tr>
      <tr><td>Potongan (BPJS, absensi, PPh 21)</td><td style="text-align:right">- ${rupiah(totals.potongan)}</td></tr>
    </tbody>
    <tfoot><tr><td>Gaji Bersih (Take Home Pay)</td><td style="text-align:right">${rupiah(totals.net)}</td></tr></tfoot>
  </table>
  <div class="note">Slip gaji bersifat rahasia. Transfer dilakukan melalui payroll batch LBS System 1.0.</div>`;
  run(`Slip Gaji ${employee.name}`, body);
}

/* ---------------------- Rekap Keuangan (Laba Rugi & Arus Kas) ---------------------- */
export function printRekapKeuangan(
  rows: { label: string; dpp: number; ppn: number; masuk: number; keluar: number; net: number; payroll: number; bbm: number; laba: number }[],
  summary: { pendapatan: number; ppnKeluaran: number; payroll: number; bbm: number; laba: number; masuk: number; keluar: number },
  period: { from: string; to: string },
) {
  const body = `
  ${kop("Rekap Keuangan — Laba Rugi & Arus Kas", `Periode ${d(parseISO(period.from))} – ${d(parseISO(period.to))}`)}
  <table>
    <thead><tr><th>Bulan</th><th style="text-align:right">Pendapatan (DPP)</th><th style="text-align:right">PPN Keluaran</th><th style="text-align:right">Kas Masuk</th><th style="text-align:right">Kas Keluar</th><th style="text-align:right">Payroll</th><th style="text-align:right">BBM</th><th style="text-align:right">Net Kas</th><th style="text-align:right">Laba Ops.</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${r.label}</td><td style="text-align:right">${rupiah(r.dpp)}</td><td style="text-align:right">${rupiah(r.ppn)}</td><td style="text-align:right">${rupiah(r.masuk)}</td><td style="text-align:right">${rupiah(r.keluar)}</td><td style="text-align:right">${rupiah(r.payroll)}</td><td style="text-align:right">${rupiah(r.bbm)}</td><td style="text-align:right">${rupiah(r.net)}</td><td style="text-align:right">${rupiah(r.laba)}</td></tr>`,
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td>TOTAL</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.dpp, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.ppn, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.masuk, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.keluar, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.payroll, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.bbm, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.net, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.laba, 0))}</td>
      </tr>
    </tfoot>
  </table>
  <table>
    <thead><tr><th>Ringkasan Periode Laporan</th><th style="text-align:right">Nilai</th></tr></thead>
    <tbody>
      <tr><td>Pendapatan (DPP)</td><td style="text-align:right">${rupiah(summary.pendapatan)}</td></tr>
      <tr><td>PPN keluaran</td><td style="text-align:right">${rupiah(summary.ppnKeluaran)}</td></tr>
      <tr><td>Beban payroll</td><td style="text-align:right">- ${rupiah(summary.payroll)}</td></tr>
      <tr><td>Beban BBM &amp; solar</td><td style="text-align:right">- ${rupiah(summary.bbm)}</td></tr>
      <tr><td>Laba operasional</td><td style="text-align:right">${rupiah(summary.laba)}</td></tr>
      <tr><td>Kas masuk / keluar</td><td style="text-align:right">${rupiah(summary.masuk)} / ${rupiah(summary.keluar)}</td></tr>
    </tbody>
  </table>
  <div class="note">Rekap disusun dari invoicing, mutasi kas &amp; bank, batch payroll, dan pembelian solar pada LBS System 1.0. Estimasi pajak bersifat indikatif.</div>
  <div class="sign"><div>Disusun<br/><br/>Staff Keuangan</div><div>Diperiksa<br/><br/>Finance Supervisor</div><div>Disetujui<br/><br/>Gunawan. S</div></div>`;
  run("Rekap Keuangan LBS", body);
}

/* ---------------------- Pernyataan Hutang Piutang ---------------------- */
export function printStatement(
  receivables: { name: string; note: string; billed: number; paid: number; due: number; late: number }[],
  suppliers: { name: string; note: string; due: number }[],
  legacy: { name: string; note: string; due: number }[],
  period: { from: string; to: string },
) {
  const body = `
  ${kop("Pernyataan Hutang & Piutang", `Per ${d(parseISO(period.to))}`)}
  <table>
    <thead><tr><th>Mitra Kerja (Piutang)</th><th>Keterangan</th><th style="text-align:right">Ditagihkan</th><th style="text-align:right">Dibayar</th><th style="text-align:right">Sisa</th><th style="text-align:right">Hari Lewat</th></tr></thead>
    <tbody>
      ${receivables.map((r) => `<tr><td>${r.name}</td><td>${r.note}</td><td style="text-align:right">${rupiah(r.billed)}</td><td style="text-align:right">${rupiah(r.paid)}</td><td style="text-align:right">${rupiah(r.due)}</td><td style="text-align:right">${r.late > 0 ? r.late : "-"}</td></tr>`).join("")}
    </tbody>
    <tfoot>
      <tr><td colspan="2">Total Piutang Beredar</td><td style="text-align:right">${rupiah(receivables.reduce((s, r) => s + r.billed, 0))}</td><td style="text-align:right">${rupiah(receivables.reduce((s, r) => s + r.paid, 0))}</td><td style="text-align:right">${rupiah(receivables.reduce((s, r) => s + r.due, 0))}</td><td></td></tr>
    </tfoot>
  </table>
  <table>
    <thead><tr><th>Hutang Supplier</th><th>Keterangan</th><th style="text-align:right">Sisa</th></tr></thead>
    <tbody>${suppliers.map((s) => `<tr><td>${s.name}</td><td>${s.note}</td><td style="text-align:right">${rupiah(s.due)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="2">Total Hutang Supplier</td><td style="text-align:right">${rupiah(suppliers.reduce((s, x) => s + x.due, 0))}</td></tr></tfoot>
  </table>
  <table>
    <thead><tr><th>Kewajiban Historis LBS</th><th>Keterangan</th><th style="text-align:right">Sisa</th></tr></thead>
    <tbody>${legacy.map((l) => `<tr><td>${l.name}</td><td>${l.note}</td><td style="text-align:right">${rupiah(l.due)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="2">Total Kewajiban Historis</td><td style="text-align:right">${rupiah(legacy.reduce((s, x) => s + x.due, 0))}</td></tr></tfoot>
  </table>
  <div class="note">Posisi neto (piutang dikurangi seluruh kewajiban): <b>${rupiah(receivables.reduce((s, r) => s + r.due, 0) - suppliers.reduce((s, x) => s + x.due, 0) - legacy.reduce((s, x) => s + x.due, 0))}</b></div>
  <div class="sign"><div>Disusun<br/><br/>Admin Penagihan</div><div>Direkonsiliasi<br/><br/>Finance Supervisor</div><div>Disetujui<br/><br/>Gunawan. S</div></div>`;
  run("Pernyataan Hutang Piutang LBS", body);
}

/* ---------------------- Daftar Pengguna & Hak Akses ---------------------- */
export function printUserAccess(
  users: { id: string; employeeId: string; username: string; email: string; role: string; scope: string; status: string; lastLogin: string; permissions: Record<string, Record<string, boolean>> }[],
  nav: { id: string; label: string; group: string }[],
  employeeOf: (id: string) => { name: string; division: string; role: string; code: string } | undefined,
) {
  const letters = (p: Record<string, boolean>) => ["view", "create", "edit", "delete"].filter((a) => p[a]).map((a) => a[0].toUpperCase()).join("") || "—";
  const body = `
  ${kop("Daftar Pengguna Sistem & Hak Akses", `Per ${d(new Date())}`)}
  <table>
    <thead><tr><th>Pengguna</th><th>Akun Login</th><th>Peran</th><th>Cakupan</th><th>Status</th><th>Login Terakhir</th>${nav.map((n) => `<th style="text-align:center;font-size:9px">${n.label}</th>`).join("")}</tr></thead>
    <tbody>
      ${users
        .map((u) => {
          const emp = employeeOf(u.employeeId);
          return `<tr>
            <td>${emp?.name ?? "Tanpa data karyawan"}<br/><span style="color:#737780;font-size:10px">${emp?.code ?? "-"} • ${emp?.division ?? "-"}</span></td>
            <td>${u.username}<br/><span style="color:#737780;font-size:10px">${u.email}</span></td>
            <td>${u.role}</td>
            <td>${u.scope}</td>
            <td>${u.status}</td>
            <td>${u.lastLogin}</td>
            ${nav.map((n) => `<td style="text-align:center">${letters(u.permissions[n.id] ?? {})}</td>`).join("")}
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  <div class="note">Kode izin: <b>L</b> = Lihat · <b>T</b> = Tambah · <b>U</b> = Ubah · <b>H</b> = Hapus. Kode “—” berarti akses modul dicabut sepenuhnya.</div>
  <table>
    <thead><tr><th>Modul</th><th>Group</th><th>Penjelasan</th></tr></thead>
    <tbody>${nav.map((n) => `<tr><td>${n.label}</td><td>${n.group}</td><td>Modul ${n.id} pada LBS System 1.0</td></tr>`).join("")}</tbody>
  </table>
  <div class="sign"><div>Disusun<br/><br/>IT / Super Admin</div><div>Diperiksa<br/><br/>Finance Supervisor</div><div>Disetujui<br/><br/>Gunawan. S</div></div>`;
  run("Hak Akses Pengguna LBS", body);
}

/* ---------------------- Jadwal Servis Berkala Armada ---------------------- */
export function printServiceSchedule(
  rows: { plate: string; model: string; driver: string; odometer: number; lastService: number; lastServiceDate: string; interval: number; next: number; remaining: number; status: string }[],
  params: { defaultIntervalKm: number; warnKm: number },
) {
  const body = `
  ${kop("Jadwal Servis Berkala Armada", `Parameter: interval default ${num(params.defaultIntervalKm)} km • ambang peringatan ${num(params.warnKm)} km`)}
  <table>
    <thead><tr><th>Unit</th><th>Model</th><th>Driver</th><th style="text-align:right">Odometer Kini</th><th style="text-align:right">Servis Terakhir</th><th>Tanggal</th><th style="text-align:right">Interval</th><th style="text-align:right">Servis Berikutnya</th><th style="text-align:right">Sisa (km)</th><th>Status</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${r.plate}</td><td>${r.model}</td><td>${r.driver}</td><td style="text-align:right">${num(r.odometer)}</td><td style="text-align:right">${num(r.lastService)}</td><td>${r.lastServiceDate.split("-").reverse().join("/")}</td><td style="text-align:right">${num(r.interval)}</td><td style="text-align:right">${num(r.next)}</td><td style="text-align:right">${r.remaining <= 0 ? `-${num(Math.abs(r.remaining))}` : num(r.remaining)}</td><td>${r.status}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <div class="note">Unit berstatus <b>Terlambat</b> wajib dijadwalkan servis segera; unit <b>Mendekati jadwal</b> perlu dipesankan slot bengkel. Jadwal diperbarui otomatis setiap kali odometer diperbarui atau servis dicatat pada LBS System 1.0.</div>
  <div class="sign"><div>Disusun<br/><br/>Supervisor Maintenance</div><div>Diperiksa<br/><br/>Operasional Site</div><div>Disetujui<br/><br/>Gunawan. S</div></div>`;
  run("Jadwal Servis Armada LBS", body);
}
/* ---------------------- Kartu Saldo Awal & Roll Forward ---------------------- */
export function printOpeningBalance(
  rows: { account: { name: string; code: string; role: string }; opening: number; source: string; fromMonth?: string; explicit: boolean; masuk: number; keluar: number; closing: number; count: number }[],
  ym: string,
  prevMonth: string,
  log: { id: string; accountId: string; amount: number; by: string; at: string; note: string; type: string }[],
) {
  const label = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, (mo || 1) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };
  const totalOpening = rows.reduce((s, r) => s + r.opening, 0);
  const totalClosing = rows.reduce((s, r) => s + r.closing, 0);
  const body = `
  ${kop("Kartu Saldo Awal Bulanan & Rekonsiliasi", `${label(ym)} • pembanding ${label(prevMonth)}`)}
  <div class="note">
    <b>Saldo awal bukan pemasukan.</b> Nilai ini merupakan posisi kas/bank pada awal periode dan tidak dihitung sebagai kas masuk, pendapatan, maupun piutang.
    Untuk bulan berikutnya saldo awal dibaca otomatis dari <b>saldo akhir bulan sebelumnya</b>; input manual hanya untuk penggunaan pertama, rekening baru, atau koreksi.
  </div>
  <table>
    <thead>
      <tr><th>Rekening / Akun</th><th>Peruntukan</th><th style="text-align:right">Saldo Awal</th><th>Sumber</th><th style="text-align:right">Mutasi Masuk</th><th style="text-align:right">Mutasi Keluar</th><th style="text-align:right">Saldo Akhir</th><th style="text-align:center">Transaksi</th></tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>
        <td>${r.account.name}<br/><span class="mini">${r.account.code}</span></td>
        <td>${r.account.role}</td>
        <td style="text-align:right">${rupiah(r.opening)}</td>
        <td>${r.explicit ? (r.source === "sistem" ? "Saldo awal sistem (input pertama)" : r.source === "manual" ? "Input manual" : `Roll forward dari ${label(r.fromMonth ?? prevMonth)}`) : `Otomatis = saldo akhir ${label(r.fromMonth ?? prevMonth)}`}</td>
        <td style="text-align:right">${rupiah(r.masuk)}</td>
        <td style="text-align:right">${rupiah(r.keluar)}</td>
        <td style="text-align:right">${rupiah(r.closing)}</td>
        <td style="text-align:center">${r.count}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL ${rows.length} REKENING</td>
        <td style="text-align:right">${rupiah(totalOpening)}</td>
        <td>${rows.filter((r) => r.explicit).length} nilai tersimpan • ${rows.filter((r) => !r.explicit).length} otomatis</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.masuk, 0))}</td>
        <td style="text-align:right">${rupiah(rows.reduce((s, r) => s + r.keluar, 0))}</td>
        <td style="text-align:right">${rupiah(totalClosing)}</td>
        <td style="text-align:center">${rows.reduce((s, r) => s + r.count, 0)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="mini">Saldo akhir ${label(ym)} (${rupiah(totalClosing)}) akan menjadi <b>saldo awal ${label(nextYmLabel(ym))}</b> secara otomatis.</p>
  ${
    log.length
      ? `<div class="sec-title">Audit Saldo Awal</div>
    <table>
      <thead><tr><th>Tanggal</th><th>Pengguna</th><th>Jenis</th><th>Keterangan</th><th style="text-align:right">Nilai</th></tr></thead>
      <tbody>${log
        .map((l) => `<tr><td>${l.at.split("-").reverse().join("/")}</td><td>${l.by}</td><td>${l.type}</td><td>${l.note}</td><td style="text-align:right">${rupiah(l.amount)}</td></tr>`)
        .join("")}</tbody>
    </table>`
      : ""
  }
  <div class="sign-one">
    <div>Manggarai Barat, ${d(new Date())}<br/>Hormat kami,</div>
    <div class="line"></div>
    <b>Jemy Lasmono Nday</b>
    <span>Direktur</span>
  </div>`;
  run(`Saldo Awal ${label(ym)}`, body);
}

function nextYmLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const nm = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${nm.y}-${String(nm.m).padStart(2, "0")}`;
}
