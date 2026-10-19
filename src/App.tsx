import { useEffect } from "react";
import { Icon, ToastHost } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { pageFor } from "@/pages/registry";
import Login from "@/pages/Login";
import { AppProvider, useApp } from "@/lib/store";

function AccessDenied() {
  const app = useApp();
  const meta = { label: "modul ini" };
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-margin">
      <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-space-lg text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
          <Icon name="lock" size={28} className="text-error" />
        </div>
        <h2 className="mt-space-md font-headline-lg text-headline-lg text-primary">Akses Modul Ditolak</h2>
        <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
          Akun Anda ({app.currentAccount?.email ?? app.user?.email}) tidak memiliki izin <b>Lihat</b> untuk {meta.label}. Hubungi Super Admin pada menu{" "}
          <b>Master Data → Pengguna &amp; Hak Akses</b> untuk menyesuaikan peran Anda.
        </p>
        <div className="mt-space-md flex flex-wrap justify-center gap-space-sm">
          <button
            type="button"
            onClick={() => app.go("dashboard")}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-label-lg text-label-lg text-on-primary hover:bg-tertiary"
          >
            <Icon name="dashboard" size={18} /> Kembali ke Dashboard
          </button>
          <button
            type="button"
            onClick={() => app.logout()}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2.5 font-label-lg text-label-lg hover:bg-surface-container"
          >
            <Icon name="logout" size={18} /> Ganti Akun
          </button>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const app = useApp();

  useEffect(() => {
    if (!app.user) return;
    const IDLE_MS = 15 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => app.logout(), IDLE_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [app.user, app.logout]);

  if (!app.user) {
    return (
      <>
        <Login />
        <ToastHost toasts={app.toasts} onDismiss={app.dismissToast} />
      </>
    );
  }

  const allowed = app.can(app.route, "view");

  if (!app.loaded) {
    return <div className="flex min-h-screen items-center justify-center text-on-surface-variant">Memuat...</div>;
  }

  return (
    <>
      <Shell>{allowed ? pageFor(app.route) : <AccessDenied />}</Shell>
      <ToastHost toasts={app.toasts} onDismiss={app.dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
