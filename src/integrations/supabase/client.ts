import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Persistent storage for Capacitor (Android/iOS) ────────────────────────
// Uses @capacitor/preferences so the auth session survives app restarts.
// Falls back to localStorage on web.
const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return localStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Preferences.set({ key, value });
      localStorage.setItem(key, value); // keep in sync
    } catch {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Preferences.remove({ key });
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session so users stay logged in across app restarts
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: Capacitor.isNativePlatform() ? capacitorStorage : undefined,
  },
});
