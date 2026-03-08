-- Allow authenticated users to check if THEIR OWN email is whitelisted (for Arena access gating)
-- This fixes the "Arena Coming Soon" issue for whitelisted testers while keeping the list private.

ALTER TABLE public.arena_email_whitelist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'arena_email_whitelist'
      AND policyname = 'Users can check own whitelist status'
  ) THEN
    CREATE POLICY "Users can check own whitelist status"
    ON public.arena_email_whitelist
    FOR SELECT
    TO authenticated
    USING (lower(email) = lower((auth.jwt() ->> 'email')));
  END IF;
END $$;