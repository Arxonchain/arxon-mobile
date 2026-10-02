import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import "./index.css";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";
import { ensureArxonNotificationChannel } from "@/lib/nativeNotifications";
import { markBootFailed, markBootOk } from "@/lib/bootState";
import { isDevPublicPath, resolveAppPath } from "@/lib/devPublicRoutes";
import AppLoadFailureScreen from "@/components/system/AppLoadFailureScreen";
import type { LoadFailureKind } from "@/components/system/failureCatalog";
import { initSentry, captureBootFailure } from "@/lib/sentry";

if (!(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

initSentry();

const SLOW_LOAD_MS = 2800;

function inferLoadFailureKind(message: string): LoadFailureKind {
  const m = message.toLowerCase();
  if (/err_name_not_resolved|enotfound|dns|name not resolved/.test(m)) return "dns";
  if (/network|offline|failed to fetch|net::/.test(m)) return "network";
  if (/timeout|timed out|took too long/.test(m)) return "timeout";
  if (/5\d\d|server|unavailable|503|502/.test(m)) return "server";
  return "unknown";
}

function renderLoadFailure(kind: LoadFailureKind, detail?: string) {
  window.__ARXON_DISMISS_BOOT__?.();
  markBootFailed(detail);

  let mount = document.getElementById("root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "root";
    document.body.appendChild(mount);
  }

  createRoot(mount).render(
    <AppLoadFailureScreen kind={kind} detail={detail} />,
  );
}

function showFatal(message: string, details?: unknown) {
  captureBootFailure(message, details);
  const detail =
    details instanceof Error
      ? details.message
      : details
        ? String((details as { stack?: string }).stack || details)
        : message;
  const kind = inferLoadFailureKind(`${message} ${detail}`);
  renderLoadFailure(kind, detail.slice(0, 280));
}

window.addEventListener("error", (e) => {
  if (window.__ARXON_BOOT_OK__) return;
  const target = (e as ErrorEvent).target;
  if (target && target instanceof HTMLElement && target.tagName === "SCRIPT") {
    showFatal("script load failed", (e as ErrorEvent).message);
    return;
  }
  showFatal("window error", (e as ErrorEvent).error || (e as ErrorEvent).message);
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  const msg = String((reason as Error)?.message || reason || "");
  if (/not implemented|nativebiometric|localnotifications|haptics/i.test(msg)) {
    console.warn("[startup] ignored plugin rejection:", reason);
    e.preventDefault();
    return;
  }
  if (window.__ARXON_BOOT_OK__) {
    console.warn("[startup] unhandled rejection after boot", reason);
    return;
  }
  showFatal("unhandled promise rejection", reason);
});

void (async () => {
  const slowTimer = window.setTimeout(() => {
    const slow = document.getElementById("arxon-boot-slow");
    if (slow && !window.__ARXON_BOOT_OK__) {
      slow.style.display = "block";
    }
  }, SLOW_LOAD_MS);

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        CapacitorUpdater.notifyAppReady();
      } catch (e) {
        console.warn("CapacitorUpdater.notifyAppReady failed:", e);
      }

      void ensureArxonNotificationChannel().catch((e) => {
        console.warn("LocalNotifications channel setup failed:", e);
      });
    }

    window.clearTimeout(slowTimer);
    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("Missing #root element");

    const path = resolveAppPath();
    if (isDevPublicPath(path)) {
      const { default: FailureUiPreview } = await import("./pages/dev/FailureUiPreview");
      createRoot(rootEl).render(<FailureUiPreview />);
      markBootOk();
      return;
    }

    const { default: App } = await import("./App.tsx");
    createRoot(rootEl).render(<App />);
  } catch (e) {
    window.clearTimeout(slowTimer);
    showFatal("bootstrap failure", e);
  }
})();
