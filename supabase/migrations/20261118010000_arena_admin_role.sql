-- Add scoped role. Do not use this value in the same transaction.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'arena_admin';
