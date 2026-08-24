-- Server-side signup email policy: block disposable / farm domains on auth.users INSERT.
-- Mirrors supabase/functions/_shared/signupEmailPolicy.ts and src/lib/auth/signupEmailPolicy.ts

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

  IF domain IS NULL OR domain = '' OR domain !~ '^[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address.'
      USING ERRCODE = '22023';
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
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_disposable_signup_email ON auth.users;

CREATE TRIGGER trg_reject_disposable_signup_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_disposable_signup_email();

COMMENT ON FUNCTION public.reject_disposable_signup_email() IS
  'Blocks disposable / farm email domains on new auth.users rows (signup).';
