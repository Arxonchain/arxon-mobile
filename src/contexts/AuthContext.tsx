// IMPORTANT: Single source of truth for auth.
// This file exists as the stable import path used across the app.
// The implementation lives in src/hooks/useAuth.tsx.
export { AuthProvider, useAuth } from '@/hooks/useAuth';
