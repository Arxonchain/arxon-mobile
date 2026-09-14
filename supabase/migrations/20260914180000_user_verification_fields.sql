-- Optional account verification (no gating until claims/airdrop).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS country_declared_at timestamptz,
ADD COLUMN IF NOT EXISTS email_change_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_locked_at timestamptz,
ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verification_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.email_change_count IS 'Max 2 email changes; then email_locked_at is set.';
COMMENT ON COLUMN public.profiles.verification_completed_at IS 'Set when email verified + country + age confirmed.';
