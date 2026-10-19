import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resilientFetch } from '@/lib/auth/resilientFetch';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim() || 'https://local.invalid';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.local';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: resilientFetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // AuthConfirm / explicit verifyOtp only — never auto-exchange URL tokens on every page.
    detectSessionInUrl: false,
    storageKey: 'arxon-auth-session',
    storage: {
      getItem: (key: string) => {
        try { return window.localStorage.getItem(key); } catch { return null; }
      },
      setItem: (key: string, value: string) => {
        try { window.localStorage.setItem(key, value); } catch {}
      },
      removeItem: (key: string) => {
        try { window.localStorage.removeItem(key); } catch {}
      },
    },
  },
});
