import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync, existsSync } from "node:fs";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

function otaReleaseVersion(): string {
  try {
    if (existsSync("public/web-bundle-version.json")) {
      const parsed = JSON.parse(readFileSync("public/web-bundle-version.json", "utf8")) as {
        version?: string;
      };
      if (parsed.version) return parsed.version;
    }
  } catch {
    /* ignore */
  }
  return process.env.VITE_SENTRY_RELEASE || "dev";
}

export default defineConfig(({ mode }) => {
  const release = otaReleaseVersion();
  const sentryUpload =
    Boolean(process.env.SENTRY_AUTH_TOKEN) &&
    Boolean(process.env.SENTRY_ORG) &&
    Boolean(process.env.SENTRY_PROJECT);

  return {
  // Absolute base required for Capacitor OTA (pages.dev) deep links like /auth/confirm.
  // Relative "./" resolves assets under /auth/assets/* and blanks the confirm page.
  base: "/",

  // Wallet (viem) needs BigInt. es2017 was for ancient WebViews; this private
  // APK is for current devices. Store OTA on main stays es2017 until wallet ships.
  esbuild: {
    target: "es2020",
  },

  server: {
    host: process.env.CAPACITOR_LIVE_USB === "true" ? "127.0.0.1" : "::",
    port: 8080,
    strictPort: process.env.CAPACITOR_LIVE_USB === "true",
    allowedHosts: true,
    hmr:
      process.env.CAPACITOR_LIVE_USB === "true"
        ? { host: "127.0.0.1", protocol: "ws", clientPort: 8080 }
        : undefined,
    // Ignore Capacitor copied OTA bundles — Vite must not prebundle android/.../App-*.js.
    watch: {
      ignored: ["**/android/**", "**/ios/**"],
    },
    fs: {
      deny: [path.resolve(__dirname, "android"), path.resolve(__dirname, "ios")],
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  define: {
    "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release),
    global: "globalThis",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sentryUpload &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: `arxon-mobile@${release}` },
        sourcemaps: { filesToDeleteAfterUpload: ["**/*.map"] },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 2000,
    sourcemap: sentryUpload ? "hidden" : false,
  },
};
});
