import { createClient } from '@supabase/supabase-js';

// PRODUCTION Supabase project: lgytumkuqflksbcukjek
// These are the ONLY credentials that should be used.
// The anon key is a publishable/public key - safe to include in client code.
const supabaseUrl = 'https://lgytumkuqflksbcukjek.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneXR1bWt1cWZsa3NiY3VramVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODU3MzYsImV4cCI6MjA4NTg2MTczNn0.2bVWmCBo4Psx7wR1IygmGWGJXtiEmBJO9UdNVcNrbk8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
