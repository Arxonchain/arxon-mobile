import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";

function showFatal(message: string, details?: unknown) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;inset:0;background:#020617;color:#e2e8f0;padding:16px;z-index:999999;font-family:monospace;overflow:auto;";
  const title = document.createElement("h2");
  title.textContent = "Arxon startup error";
  title.style.margin = "0 0 12px 0";
  const msg = document.createElement("pre");
  msg.style.whiteSpace = "pre-wrap";
  msg.textContent = `${message}\n\n${details ? String((details as any)?.stack || details) : ""}`;
  el.appendChild(title);
  el.appendChild(msg);
  document.body.innerHTML = "";
  document.body.appendChild(el);
}

window.addEventListener("error", (e) => {
  showFatal("window error", (e as ErrorEvent).error || (e as ErrorEvent).message);
});

window.addEventListener("unhandledrejection", (e) => {
  showFatal("unhandled promise rejection", (e as PromiseRejectionEvent).reason);
});

try {
  if (Capacitor.isNativePlatform()) {
    try {
      CapacitorUpdater.notifyAppReady();
    } catch (e) {
      console.warn("CapacitorUpdater.notifyAppReady failed:", e);
    }
  }

  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");
  createRoot(rootEl).render(<App />);
} catch (e) {
  showFatal("bootstrap failure", e);
}
