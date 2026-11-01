import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'
import {
  adminCorsHeaders,
  requireServiceRole,
  serviceAuthResponse,
} from '../_shared/adminAuth.ts'

const corsHeaders = adminCorsHeaders

const FIX_SQL = `
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

CREATE OR REPLACE FUNCTION public.assign_nexus_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

CREATE OR REPLACE FUNCTION public.reject_disposable_signup_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
  IF domain IS NULL OR domain = '' OR domain !~ '^[a-z0-9.-]+\\.[a-z]{2,}$' THEN
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
$fn$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const auth = await requireServiceRole(req)
    if (!auth.ok) return serviceAuthResponse(auth)

    const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'No database URL configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sql = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 20, idle_timeout: 15 })
    const before = await sql`
      SELECT t.tgname, p.proname
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'auth.users'::regclass
        AND NOT t.tgisinternal
      ORDER BY t.tgname
    `
    await sql.unsafe(FIX_SQL)
    const after = await sql`
      SELECT t.tgname, p.proname
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'auth.users'::regclass
        AND NOT t.tgisinternal
      ORDER BY t.tgname
    `
    await sql.end({ timeout: 5 })
    return new Response(JSON.stringify({ ok: true, before, after }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
