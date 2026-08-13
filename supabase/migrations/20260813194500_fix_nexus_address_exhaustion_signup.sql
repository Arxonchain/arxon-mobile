-- Root cause: generate_nexus_address('user') only had 10k slots (ARX-P-user0000..9999).
-- All 10k were taken, so BEFORE INSERT profile triggers looped forever and Auth /signup
-- timed out (~10s) with "context deadline exceeded" (looked like a mailer/captcha failure).

CREATE OR REPLACE FUNCTION public.generate_nexus_address(p_username text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base_name text;
  random_suffix text;
  new_address text;
  address_exists boolean;
  attempts int := 0;
BEGIN
  base_name := lower(regexp_replace(coalesce(nullif(trim(p_username), ''), 'u'), '[^a-z0-9]', '', 'g'));
  IF base_name = '' THEN
    base_name := 'u';
  END IF;
  base_name := left(base_name, 16);

  LOOP
    attempts := attempts + 1;
    random_suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    new_address := 'ARX-P-' || base_name || random_suffix;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE nexus_address = new_address) INTO address_exists;
    EXIT WHEN NOT address_exists;
    IF attempts >= 25 THEN
      new_address := 'ARX-P-' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;
  END LOOP;

  RETURN new_address;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_nexus_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.nexus_address IS NULL THEN
    NEW.nexus_address := public.generate_nexus_address(
      COALESCE(NULLIF(NEW.username, ''), 'u' || replace(COALESCE(NEW.user_id::text, gen_random_uuid()::text), '-', ''))
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_assign_nexus_address ON public.profiles;
DROP TRIGGER IF EXISTS trigger_assign_referral_code ON public.profiles;

DROP TRIGGER IF EXISTS assign_nexus_address_trigger ON public.profiles;
CREATE TRIGGER assign_nexus_address_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_nexus_address();

DROP TRIGGER IF EXISTS assign_referral_code_trigger ON public.profiles;
CREATE TRIGGER assign_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_referral_code();
