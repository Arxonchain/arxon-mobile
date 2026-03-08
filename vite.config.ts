import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force ALL supabase client imports to use production credentials
      // instead of auto-generated Lovable Cloud client
      "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/supabase.ts"),
    },
    // Prevent duplicate React copies which can break hooks at runtime.
    dedupe: ["react", "react-dom"],
  },

  // ────────────────────────────────────────────────
  // This block was added to silence the large chunk warning in Vercel build logs
  build: {
    chunkSizeWarningLimit: 2000,  // 2000 KB = 2 MB limit (you can increase if needed)
  },
  // ────────────────────────────────────────────────
}));