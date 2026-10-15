import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/format";

export const HEX = {
  primary: "#00274e",
  primaryContainer: "#0b3d70",
  secondary: "#795900",
  secondaryContainer: "#ffc644",
  secondaryFixed: "#ffdea0",
  error: "#ba1a1a",
  success: "#15683a",
  muted: "#c3c6d1",
  surfaceContainer: "#e5eeff",
  outline: "#737780",
};

/* ------------------------------- Icon ------------------------------- */
export function Icon({ name, size = 20, className, fill }: { name: string; size?: number; className?: string; fill?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined leading-none", fill && "fill", className)}
      style={{ fontSize: size, width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {name}
    </span>
  );
}

/* ------------------------------- Card ------------------------------- */
export function Card({
  children,
  className,
  accentTop,
  padded = true,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  accentTop?: string;
  padded?: boolean;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(11,28,48,0.06),0_8px_24px_-16px_rgba(11,28,48,0.18)]",
        padded && "p-space-md",
        className,
      )}
    >
      {accentTop && <div className={cn("absolute inset-x-0 top-0 h-1", accentTop)} />}
      {children}
    </As>
  );
}

export function SectionHeading({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-space-sm">
      <div className="flex items-start gap-space-sm">
        {icon && <Icon name={icon} size={22} className="mt-0.5 text-secondary" />}
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ Buttons ------------------------------ */
type BtnVariant = "primary" | "secondary" | "amber" | "ghost" | "outline" | "danger";
const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-tertiary shadow-sm",
  secondary: "bg-surface-container text-primary hover:bg-surface-container-high border border-surface-variant",
  amber: "bg-secondary-container text-on-secondary-fixed hover:bg-secondary-fixed-dim shadow-sm",
  ghost: "text-primary hover:bg-surface-container",
  outline: "border border-outline-variant text-on-surface hover:bg-surface-container",
  danger: "bg-error-container text-on-error-container hover:bg-error hover:text-on-error",
};

export function Button({
  children,
  variant = "primary",
  icon,
  className,
  size = "md",
  ...rest
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  icon?: string;
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-space-xs rounded-lg font-label-lg text-label-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-label-md" : "px-space-md py-2.5",
        btnStyles[variant],
        className,
      )}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  title,
  onClick,
  active,
  className,
  size = 20,
}: {
  icon: string;
  title: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-2 transition-colors",
        active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        className,
      )}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ------------------------------- Pill ------------------------------- */
export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: string; className?: string }) {
  const map: Record<string, string> = {
    neutral: "bg-surface-container text-primary",
    navy: "bg-primary text-on-primary",
    amber: "bg-secondary-container text-on-secondary-fixed",
    amberSoft: "bg-secondary-fixed text-on-secondary-fixed",
    error: "bg-error-container text-on-error-container",
    success: "bg-success-container text-success",
    outline: "border border-outline-variant text-on-surface-variant",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-sm text-label-sm uppercase tracking-wide whitespace-nowrap",
        map[tone] ?? map.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "Lunas":
    case "Deal":
    case "Aktif":
    case "Dibayar":
    case "Disetujui":
      return { tone: "success", icon: "check_circle" };
    case "Terlambat":
    case "Gagal":
    case "Batal":
    case "Nonaktif":
    case "Servis":
      return { tone: "error", icon: "error" };
    case "Sebagian":
    case "Jatuh Tempo":
    case "Cuti":
    case "Prospek":
    case "Draft":
      return { tone: "amber", icon: "schedule" };
    case "Diinvoice":
    case "Deal Won":
      return { tone: "navy", icon: "task_alt" };
    default:
      return { tone: "neutral", icon: "circle" };
  }
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const { tone, icon } = statusTone(status);
  return (
    <Pill tone={tone} className={className}>
      <Icon name={icon} size={11} />
      {status}
    </Pill>
  );
}

/* ------------------------------ Progress ------------------------------ */
export function ProgressBar({ value, tone = "bg-primary", height = "h-2", className }: { value: number; tone?: string; height?: string; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-container", height, className)}>
      <div className={cn("h-full rounded-full transition-all duration-700", tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ------------------------------- Modal ------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-primary/55 p-4 backdrop-blur-sm animate-fade-in sm:items-center">
      <div className={cn("w-full animate-fade-up rounded-2xl bg-surface-container-lowest shadow-2xl", width)}>
        <div className="flex items-start justify-between gap-space-md border-b border-surface-container-high p-space-md">
          <div>
            <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
            {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
          <IconButton icon="close" title="Tutup" onClick={onClose} />
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-space-md">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-space-sm border-t border-surface-container-high p-space-md">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Drawer ------------------------------ */
export function Drawer({ open, onClose, title, subtitle, children, footer }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-primary/50 backdrop-blur-sm animate-fade-in">
      <button type="button" aria-label="Tutup panel" className="flex-1 cursor-default" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl animate-slide-left flex-col bg-surface-container-lowest shadow-2xl">
        <header className="flex items-start justify-between border-b border-surface-container-high p-space-md">
          <div>
            <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
            {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
          </div>
          <IconButton icon="close" title="Tutup" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto p-space-md">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-space-sm border-t border-surface-container-high p-space-md">{footer}</footer>}
      </aside>
    </div>
  );
}

/* ------------------------------ Inputs ------------------------------ */
export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/15";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, "cursor-pointer appearance-none bg-[right_0.6rem_center] pr-8", props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-[84px] resize-y", props.className)} />;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: string; badge?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md transition-all",
            value === t.id ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high",
          )}
        >
          {t.icon && <Icon name={t.icon} size={16} />}
          {t.label}
          {typeof t.badge === "number" && (
            <span className={cn("rounded-full px-1.5 py-0.5 font-label-sm text-[10px]", value === t.id ? "bg-secondary-container text-on-secondary-fixed" : "bg-surface-container-high text-primary")}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Table bits ------------------------------ */
export function Th({ children, align = "left", className }: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-surface-container px-space-sm py-3 font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, align = "left", className, colSpan }: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-space-sm py-3 align-middle", align === "right" && "text-right", align === "center" && "text-center", className)}>
      {children}
    </td>
  );
}

export function EmptyState({ icon = "inbox", title, detail }: { icon?: string; title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-xs py-space-xl text-center">
      <Icon name={icon} size={40} className="text-outline-variant" />
      <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
      {detail && <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">{detail}</p>}
    </div>
  );
}

/* ------------------------------ Charts ------------------------------ */
export function SparkArea({ data, height = 64, tone = HEX.primaryContainer, className }: { data: number[]; height?: number; tone?: string; className?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, height - ((v - min) / range) * (height - 8) - 4] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn("h-16 w-full", className)}>
      <defs>
        <linearGradient id={`grad-${tone.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.35" />
          <stop offset="100%" stopColor={tone} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${tone.replace("#", "")})`} />
      <path d={line} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

export function BarPairs({ data, height = 130 }: { data: { label: string; a: number; b: number }[]; height?: number }) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-full w-full items-end justify-center gap-[3px]">
            <div className="w-1/2 max-w-[14px] rounded-t bg-primary transition-all" style={{ height: `${(d.a / max) * 100}%` }} title={`Masuk ${d.a.toLocaleString("id-ID")}`} />
            <div className="w-1/2 max-w-[14px] rounded-t bg-secondary-container transition-all" style={{ height: `${(d.b / max) * 100}%` }} title={`Keluar ${d.b.toLocaleString("id-ID")}`} />
          </div>
          <span className="font-label-sm text-[10px] text-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 148, thickness = 18, center }: { segments: { value: number; color: string; label: string }[]; size?: number; thickness?: number; center?: ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={HEX.surfaceContainer} strokeWidth={thickness} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

/* ------------------------------ Toasts ------------------------------ */
export function ToastHost({ toasts, onDismiss }: { toasts: { id: number; tone: string; title: string; detail?: string }[]; onDismiss: (id: number) => void }) {
  const toneMap: Record<string, { bar: string; icon: string; bg: string }> = {
    success: { bar: "bg-success", icon: "check_circle", bg: "bg-success-container" },
    info: { bar: "bg-primary", icon: "info", bg: "bg-primary-fixed" },
    warn: { bar: "bg-secondary-container", icon: "warning", bg: "bg-secondary-fixed" },
    error: { bar: "bg-error", icon: "error", bg: "bg-error-container" },
  };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-space-sm">
      {toasts.map((t) => {
        const cfg = toneMap[t.tone] ?? toneMap.info;
        return (
          <div key={t.id} className="pointer-events-auto flex animate-fade-up items-start gap-space-sm overflow-hidden rounded-xl bg-surface-container-lowest p-space-sm shadow-xl">
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
              <Icon name={cfg.icon} size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-lg text-label-lg text-on-surface">{t.title}</p>
              {t.detail && <p className="font-body-sm text-body-sm text-on-surface-variant">{t.detail}</p>}
            </div>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => onDismiss(t.id)}
              className="rounded-lg p-1 text-outline hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="close" size={14} />
            </button>
            <div className={cn("h-full w-1 self-stretch rounded-full", cfg.bar)} />
          </div>
        );
      })}
    </div>
  );
}
