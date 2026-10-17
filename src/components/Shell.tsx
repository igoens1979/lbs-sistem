import { useMemo, useState, type ReactNode } from "react";
import { NAV, routeMeta, type Route } from "@/lib/routes";
import { roleLabel } from "@/lib/permissions";
import { useApp } from "@/lib/store";
import { cn, d, iso, parseISO, rupiah, TODAY } from "@/lib/format";
import { Button, Icon, IconButton, Pill, statusTone } from "@/components/ui";

export function Shell({ children }: { children: ReactNode }) {
  const app = useApp();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const current = routeMeta(app.route);
  const visibleNav = NAV.filter((n) => app.can(n.id, "view"));
  const visibleNotifications = app.notifications.filter((n) => app.can(n.route, "view"));
  const liquidity = app.accountsWithBalance.reduce((s, a) => s + a.balance, 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as { label: string; sub: string; route: Route; icon: string }[];
    const out: { label: string; sub: string; route: Route; icon: string }[] = [];
    app.sj
      .filter((r) => r.no.toLowerCase().includes(q) || app.customers.find((c) => c.id === r.customerId)?.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((r) => out.push({ label: r.no, sub: `Surat jalan • ${d(parseISO(r.date))} • ${app.customers.find((c) => c.id === r.customerId)?.name}`, route: "surat-jalan", icon: "local_shipping" }));
    app.invoices
      .filter((i) => i.no.toLowerCase().includes(q) || app.customers.find((c) => c.id === i.customerId)?.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((i) => out.push({ label: i.no, sub: `Invoice • ${rupiah(i.total)} • ${app.computedStatus(i)}`, route: "invoice", icon: "receipt_long" }));
    app.customers
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) => out.push({ label: c.name, sub: `Pelanggan ${c.code} • ${c.city}`, route: "master-data", icon: "groups" }));
    app.employees
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((e) => out.push({ label: e.name, sub: `Karyawan • ${e.role} • ${e.division}`, route: "hrd", icon: "badge" }));
    return out.filter((r) => app.can(r.route, "view"));
  }, [query, app]);

  const groups = visibleNav.reduce<Record<string, typeof NAV>>((acc, n) => {
    acc[n.group] = acc[n.group] ?? [];
    acc[n.group].push(n);
    return acc;
  }, {});
  const aksesInfo = app.currentAccount
    ? {
        role: roleLabel(app.currentAccount.role),
        scope: app.currentAccount.scope,
        modul: visibleNav.length,
        total: NAV.length,
      }
    : { role: "Tanpa akun", scope: "-", modul: 0, total: NAV.length };

  const drawerNav = (
    <nav className="flex flex-col gap-space-xs px-space-xs">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="flex flex-col gap-space-xs">
          <span className="px-space-md pt-space-sm pb-space-xs font-label-sm text-label-sm uppercase tracking-wider text-on-tertiary-container/70">{group}</span>
          {items.map((n) => {
            const active = app.route === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  app.go(n.id);
                  setDrawer(false);
                }}
                className={cn(
                  "flex items-center gap-space-sm rounded-lg px-space-md py-space-sm text-left transition-colors",
                  active
                    ? "border-l-4 border-secondary-container bg-primary-container font-label-lg text-label-lg text-on-primary shadow-sm"
                    : "border-l-4 border-transparent font-body-md text-body-md text-on-tertiary-container hover:bg-tertiary-container hover:text-on-primary",
                )}
              >
                <Icon name={n.icon} size={20} />
                <span className="truncate">{n.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      {/* Sidebar */}
      {drawer && <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-40 bg-primary/60 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
      <aside
        className={cn(
          "no-print fixed left-0 top-0 z-50 flex h-full w-72 flex-col justify-between bg-primary shadow-[0_1px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 lg:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-0 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-tertiary-container px-space-md">
            <div className="flex min-w-0 items-center gap-space-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container shadow-inner">
                <span className="font-heading text-[13px] font-extrabold tracking-tight text-on-secondary-fixed">LBS</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-headline-sm text-headline-sm tracking-tight text-on-primary">PT LOGAM BUMI SANTOSA</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">LBS System 1.0</span>
              </div>
            </div>
            <button type="button" className="p-1 text-on-primary lg:hidden" onClick={() => setDrawer(false)} aria-label="Tutup">
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="px-space-md py-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-tertiary-container">Operasional &amp; Logistik</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-space-md">{drawerNav}</div>
        </div>
        <div className="flex flex-col gap-space-sm border-t border-tertiary-container p-space-md">
          <div className="rounded-lg bg-tertiary-container/60 p-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-tertiary-container">Likuiditas</span>
              <Icon name="savings" size={16} className="text-secondary-fixed" />
            </div>
            <p className="font-headline-sm text-headline-sm text-on-primary tabular">{rupiah(liquidity)}</p>
            <p className="font-body-sm text-body-sm text-on-tertiary-container">3 rekening aktif tersinkron</p>
          </div>
          <button
            type="button"
            onClick={app.logout}
            className="flex items-center justify-between rounded-lg bg-secondary-container px-space-md py-space-sm font-label-lg text-label-lg text-on-secondary-fixed transition-colors hover:bg-secondary-fixed-dim"
          >
            <span className="flex items-center gap-1.5">
              <Icon name="logout" size={18} />
              Keluar Sistem
            </span>
            <Icon name="chevron_right" size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        {/* Header */}
        <header className="no-print fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-space-sm border-b border-surface-container-high bg-surface/90 px-space-md shadow-[0_1px_8px_rgba(11,28,48,0.04)] backdrop-blur-md lg:left-72 lg:px-margin-desktop">
          <div className="flex min-w-0 items-center gap-space-sm">
            <button type="button" onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-on-surface hover:bg-surface-container lg:hidden" aria-label="Buka menu">
              <Icon name="menu" size={24} />
            </button>
            <div className="hidden items-center gap-space-xs font-label-md text-label-md text-on-surface-variant sm:flex">
              <Icon name="corporate_fare" size={16} />
              <span>PT LBS</span>
              <Icon name="chevron_right" size={14} />
              <span className="truncate font-semibold text-on-surface">{current.label}</span>
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <span className="font-label-lg text-label-lg text-primary">{current.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="hidden items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1 xl:flex">
              <Icon name="calendar_today" size={16} className="text-outline" />
              <input
                type="date"
                value={app.period.from}
                onChange={(e) => app.setPeriod({ ...app.period, from: e.target.value })}
                className="w-[112px] bg-transparent font-label-md text-label-md text-on-surface outline-none"
                aria-label="Periode dari"
              />
              <span className="text-outline">–</span>
              <input
                type="date"
                value={app.period.to}
                onChange={(e) => app.setPeriod({ ...app.period, to: e.target.value })}
                className="w-[112px] bg-transparent font-label-md text-label-md text-on-surface outline-none"
                aria-label="Periode sampai"
              />
              <IconButton icon="refresh" size={16} title="Reset ke periode berjalan" onClick={() => app.setPeriod({ from: "2026-10-01", to: iso(TODAY()) })} />
            </div>

            <div className="hidden items-center gap-space-xs rounded-full border border-surface-variant bg-surface-container px-3 py-1 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">Sistem Online - DB Tersinkron</span>
            </div>

            <div className="flex items-center gap-space-xs">
              <IconButton icon="search" title="Pencarian Cepat" onClick={() => setSearch(true)} />
              <div className="relative">
                <IconButton icon="notifications" title="Notifikasi Operasional" active={notifOpen} onClick={() => setNotifOpen((v) => !v)} />
                {visibleNotifications.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />}
                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] animate-fade-up overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl">
                    <div className="flex items-center justify-between border-b border-surface-container-high px-space-md py-space-sm">
                      <p className="font-label-lg text-label-lg text-primary">Notifikasi Operasional</p>
                      <Pill tone="navy">{visibleNotifications.length} baru</Pill>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 && <p className="p-space-md font-body-sm text-body-sm text-on-surface-variant">Tidak ada notifikasi.</p>}
                      {visibleNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            app.go(n.route);
                            setNotifOpen(false);
                          }}
                          className="flex w-full items-start gap-space-sm border-b border-surface-container-low px-space-md py-space-sm text-left hover:bg-surface-container-low"
                        >
                          <Icon name={n.tone === "error" ? "error" : n.tone === "warn" ? "warning" : "info"} size={18} className={cn("mt-0.5", n.tone === "error" ? "text-error" : n.tone === "warn" ? "text-secondary" : "text-primary")} />
                          <span className="min-w-0">
                            <span className="block font-label-md text-label-md text-on-surface">{n.title}</span>
                            <span className="block font-body-sm text-body-sm text-on-surface-variant">{n.detail}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden h-6 w-px bg-surface-container-high sm:block" />

            <div className="relative flex items-center gap-space-sm">
              <div className="hidden flex-col text-right sm:flex">
                <span className="font-label-md text-label-md text-on-surface">{app.user?.name ?? "Gunawan. S"}</span>
                <span className="font-label-sm text-label-sm font-bold text-secondary">{app.user?.role ?? "Super Admin / Finance"}</span>
              </div>
              <button type="button" onClick={() => setUserOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary" aria-label="Menu pengguna">
                <Icon name="person" size={18} className="text-on-primary" />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-11 w-64 animate-fade-up overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl">
                  <div className="border-b border-surface-container-high p-space-md">
                    <p className="font-label-lg text-label-lg text-primary">{app.user?.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{app.user?.email}</p>
                    <div className="mt-space-sm flex flex-wrap gap-1">
                      <Pill tone="navy">{aksesInfo.role}</Pill>
                      <Pill tone="outline">{aksesInfo.modul}/{aksesInfo.total} modul</Pill>
                      <Pill tone="outline">{aksesInfo.scope}</Pill>
                    </div>
                  </div>
                  {[
                    { icon: "admin_panel_settings", label: "Kelola Pengguna & Hak Akses", route: "master-data" as Route },
                    { icon: "shield", label: "Audit Trail Sistem", route: "hrd" as Route },
                    { icon: "tune", label: "Preferensi Dashboard", route: "dashboard" as Route },
                  ]
                    .filter((m) => app.can(m.route, "view"))
                    .map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => {
                        app.go(m.route);
                        setUserOpen(false);
                      }}
                      className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                    >
                      <Icon name={m.icon} size={18} />
                      {m.label}
                    </button>
                  ))}
                  <button type="button" onClick={app.logout} className="flex w-full items-center gap-space-sm border-t border-surface-container-high px-space-md py-space-sm text-left font-label-md text-label-md text-error hover:bg-error-container">
                    <Icon name="logout" size={18} />
                    Keluar Sistem
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 pt-16 print:pt-0">{children}</main>

        <footer className="no-print border-t border-surface-container-high bg-surface-container-low px-margin py-space-sm lg:px-margin-desktop">
          <div className="flex flex-wrap items-center justify-between gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span>© 2026 PT Logam Bumi Santosa · LBS System 1.0 — Enterprise Resource Gateway</span>
            <span className="flex items-center gap-2">
              <Pill tone="outline">Site Golo Mori</Pill>
              <Pill tone="outline">Tgl Sistem {d(parseISO(iso(TODAY())))}</Pill>
            </span>
          </div>
        </footer>
      </div>

      {/* Quick search palette */}
      {search && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-primary/55 p-4 backdrop-blur-sm animate-fade-in">
          <div className="mt-16 w-full max-w-2xl animate-fade-up overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
            <div className="flex items-center gap-space-sm border-b border-surface-container-high px-space-md py-space-sm">
              <Icon name="search" size={22} className="text-outline" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari surat jalan, invoice, pelanggan, lead, karyawan…"
                className="w-full bg-transparent py-2 font-body-lg text-body-lg outline-none placeholder:text-outline"
              />
              <IconButton icon="close" title="Tutup" onClick={() => setSearch(false)} />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-space-sm">
              {query.trim().length < 2 && (
                <div className="grid gap-space-sm p-space-sm sm:grid-cols-2">
                  {NAV.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        app.go(n.id);
                        setSearch(false);
                      }}
                      className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm text-left hover:bg-surface-container"
                    >
                      <Icon name={n.icon} size={20} className="text-primary" />
                      <span>
                        <span className="block font-label-md text-label-md text-primary">{n.label}</span>
                        <span className="block font-body-sm text-body-sm text-on-surface-variant">{n.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.map((r) => (
                <button
                  key={`${r.label}-${r.sub}`}
                  type="button"
                  onClick={() => {
                    app.go(r.route);
                    setSearch(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-space-sm rounded-lg px-space-sm py-2 text-left hover:bg-surface-container-low"
                >
                  <Icon name={r.icon} size={18} className="text-secondary" />
                  <span className="min-w-0">
                    <span className="block truncate font-label-md text-label-md text-on-surface">{r.label}</span>
                    <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{r.sub}</span>
                  </span>
                </button>
              ))}
              {query.trim().length >= 2 && results.length === 0 && (
                <p className="p-space-md font-body-sm text-body-sm text-on-surface-variant">Tidak ada hasil untuk “{query}”.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  site,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  site?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
      <div className="flex flex-col gap-space-xs">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="inline-flex h-2 w-2 rounded-full bg-secondary-container" />
          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">{eyebrow}</span>
          <span className="font-label-sm text-label-sm text-outline-variant">•</span>
          <span className="font-label-sm text-label-sm font-mono text-on-surface-variant">{site ?? "SITE GOLO MORI"}</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl-mobile tracking-tight text-primary md:text-headline-xl">{title}</h1>
        <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">{description}</p>
      </div>
      {actions}
    </section>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col"><div className="flex flex-col gap-space-xl p-margin sm:p-margin-tablet lg:p-margin-desktop">{children}</div></div>;
}

export function PeriodActions({ onExport, onPrint, extra }: { onExport?: () => void; onPrint?: () => void; extra?: ReactNode }) {
  const app = useApp();
  return (
    <div className="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5">
        <Icon name="calendar_today" size={18} className="text-outline" />
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] uppercase leading-tight text-on-surface-variant">Dari</span>
          <input
            type="date"
            value={app.period.from}
            onChange={(e) => app.setPeriod({ ...app.period, from: e.target.value })}
            className="w-[112px] bg-transparent font-label-md text-label-md font-semibold text-on-surface focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5">
        <Icon name="calendar_month" size={18} className="text-outline" />
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] uppercase leading-tight text-on-surface-variant">Sampai</span>
          <input
            type="date"
            value={app.period.to}
            onChange={(e) => app.setPeriod({ ...app.period, to: e.target.value })}
            className="w-[112px] bg-transparent font-label-md text-label-md font-semibold text-on-surface focus:outline-none"
          />
        </div>
      </div>
      <Button icon="filter_alt" onClick={() => app.toast("Periode laporan diterapkan", `${d(parseISO(app.period.from))} s/d ${d(parseISO(app.period.to))}`, "info")}>
        Tampilkan Periode
      </Button>
      <div className="flex items-center gap-1">
        <IconButton icon="table_view" title="Export Excel (CSV)" onClick={onExport} className="bg-surface-container hover:bg-surface-container-high" />
        <IconButton icon="picture_as_pdf" title="Unduh Laporan PDF" onClick={onPrint} className="bg-surface-container hover:bg-surface-container-high" />
      </div>
      {extra}
    </div>
  );
}

export { statusTone };
