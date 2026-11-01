-- Signup must never fail because of profile/referral side effects.
-- GoTrue maps ANY auth.users INSERT exception to "Database error saving new user".
-- Passing a referrer's code (e.g. ADMIN) in user_metadata as referral_code used to
-- collide with profiles.referral_code UNIQUE and abort the whole signup.

CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts int := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL AND btrim(NEW.referral_code) <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.referral_code = upper(btrim(NEW.referral_code))
        AND p.user_id IS DISTINCT FROM NEW.user_id
    ) INTO code_exists;
    IF code_exists THEN
      NEW.referral_code := NULL;
    ELSE
      NEW.referral_code := upper(btrim(NEW.referral_code));
      RETURN NEW;
    END IF;
  END IF;

  LOOP
    attempts := attempts + 1;
    new_code := public.generate_referral_code();
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
    IF attempts >= 30 THEN
      new_code := 'ARX-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      EXIT;
    END IF;
  END LOOP;

  NEW.referral_code := new_code;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code := 'ARX-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_nexus_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nexus_address IS NULL OR btrim(NEW.nexus_address) = '' THEN
    NEW.nexus_address := public.generate_nexus_address(
      COALESCE(NULLIF(NEW.username, ''), 'u' || replace(COALESCE(NEW.user_id::text, gen_random_uuid()::text), '-', ''))
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  IF NEW.nexus_address IS NULL OR btrim(NEW.nexus_address) = '' THEN
    NEW.nexus_address := 'ARX-P-' || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

-- Disposable-domain block stays, but unexpected SQL errors must not abort signup.
CREATE OR REPLACE FUNCTION public.reject_disposable_signup_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  domain text;
  blocked_domains text[] := ARRAY[
    'tempmail.ing', 'tempmail.img', 'mailpwr.com', 'spymail.one', 'sharebot.net',
    'drmail.in', 'streetwormail.com', 'ronaldofmail.com', 'getnada.com',
    'mailinator.com', 'guerrillamail.com', 'yopmail.com', '10minutemail.com',
    'fakeinbox.com', 'trashmail.com', 'sharklasers.com', 'mailnesia.com',
    'mintemail.com', 'temp-mail.org', 'emailondeck.com', 'discard.email',
    'cico.my.id', 'theeditai.com', 'animateany.com', 'animatimg.com',
    'aniimate.net', 'gettranslation.app', 'deepask.app', '3dkai.com',
    'bigonla.com', 'trocipad.com'
  ];
  blocked_substrings text[] := ARRAY[
    'tempmail', 'sharebot', 'mailpwr', 'spymail', 'guerrillamail', 'mailinator',
    'yopmail', '10minutemail', 'fakeinbox', 'trashmail', 'throwaway', 'disposable',
    'spamgourmet', 'getnada', 'mailsac', 'maildrop', 'temp-mail', 'tmpmail',
    'fakemail', 'spambox'
  ];
  needle text;
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  domain := lower(split_part(btrim(NEW.email), '@', 2));
  IF domain IS NULL OR domain = '' THEN
    RETURN NEW;
  END IF;
  IF domain !~ '^[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RETURN NEW;
  END IF;

  IF domain = ANY (blocked_domains) THEN
    RAISE EXCEPTION 'This email provider is not allowed. Please use a personal email (e.g. Gmail, Outlook, Hotmail).'
      USING ERRCODE = '22023';
  END IF;

  FOREACH needle IN ARRAY blocked_substrings LOOP
    IF position(needle IN domain) > 0 THEN
      RAISE EXCEPTION 'Temporary or disposable email addresses are not allowed.'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN SQLSTATE '22023' THEN
    RAISE;
  WHEN OTHERS THEN
    RAISE LOG 'reject_disposable_signup_email skipped unexpected error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fail-safe profile + points bootstrap. Never copy referred-by codes onto this user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, username)
    VALUES (
      NEW.id,
      NULLIF(left(split_part(COALESCE(NEW.email, ''), '@', 1), 24), '')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_points WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_points (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed (signup continues): %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
