import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

// Tell Capgo the app loaded successfully — prevents rollback
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady();
}

createRoot(document.getElementById("root")!).render(<App />);
