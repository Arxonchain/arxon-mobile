
-- Add country tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Create index for country aggregation queries
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
