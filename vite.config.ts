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

  // IMPORTANT: support older Android WebView (Android 7/8 devices)
  esbuild: {
    target: "es2017",
  },

  server: {
    host: "::",
    port: 8080,
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
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2017",
    chunkSizeWarningLimit: 2000,
    sourcemap: sentryUpload ? "hidden" : false,
  },
};
});
