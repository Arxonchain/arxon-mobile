import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // Absolute base required for Capacitor OTA (pages.dev) deep links like /auth/confirm.
  // Relative "./" resolves assets under /auth/assets/* and blanks the confirm page.
  base: "/",

  // IMPORTANT: support older Android WebView (Android 7/8 devices)
  esbuild: {
    target: "es2017",
  },

  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2017",
    chunkSizeWarningLimit: 2000,
  },
}));
