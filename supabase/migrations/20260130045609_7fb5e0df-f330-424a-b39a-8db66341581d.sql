-- Ensure referral_code and nexus_address are always generated for new profile rows
-- and prevent duplicates.

-- 1) Unique indexes (safe with nullable columns)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uq
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL AND btrim(referral_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nexus_address_uq
  ON public.profiles (nexus_address)
  WHERE nexus_address IS NOT NULL AND btrim(nexus_address) <> '';

-- 2) Triggers to auto-assign derived fields on insert
DROP TRIGGER IF EXISTS profiles_assign_referral_code ON public.profiles;
CREATE TRIGGER profiles_assign_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_referral_code();

DROP TRIGGER IF EXISTS profiles_assign_nexus_address ON public.profiles;
CREATE TRIGGER profiles_assign_nexus_address
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_nexus_address();
