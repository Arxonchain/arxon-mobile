import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resilientFetch } from '@/lib/auth/resilientFetch';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

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
