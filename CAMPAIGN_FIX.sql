-- CAMPAIGN_FIX.sql  (run in Supabase SQL Editor)
-- Fixes: new accounts showing "Not eligible" / "CLAIMED" at 0/7 because the
-- client-side insert silently failed (RLS, device_id unique constraint, etc.)

-- ── 1. Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.new_user_campaign (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     text        NOT NULL,
  first_open_at timestamptz NOT NULL DEFAULT now(),
  days_claimed  integer     NOT NULL DEFAULT 0 CHECK (days_claimed >= 0 AND days_claimed <= 7),
  last_claim_at timestamptz,
  is_eligible   boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_new_user_campaign_user_id
  ON public.new_user_campaign(user_id);

-- device_id must NOT be globally unique — multiple users can share a phone
ALTER TABLE public.new_user_campaign DROP CONSTRAINT IF EXISTS new_user_campaign_device_id_key;

-- ── 2. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.new_user_campaign ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own campaign"   ON public.new_user_campaign;
DROP POLICY IF EXISTS "Users insert own campaign" ON public.new_user_campaign;

CREATE POLICY "Users read own campaign"
  ON public.new_user_campaign FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own campaign"
  ON public.new_user_campaign FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Mark old-account users ineligible ──────────────────────────────────────
UPDATE public.new_user_campaign nuc
SET is_eligible = false
FROM auth.users u
WHERE nuc.user_id = u.id
  AND u.created_at < now() - interval '7 days';

-- Re-enable any new account wrongly marked ineligible (created < 7 days ago, < 7 claims)
UPDATE public.new_user_campaign nuc
SET is_eligible = true
FROM auth.users u
WHERE nuc.user_id = u.id
  AND u.created_at >= now() - interval '7 days'
  AND nuc.days_claimed < 7
  AND nuc.is_eligible = false;

-- ── 4. Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.account_age_days(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    FLOOR(EXTRACT(EPOCH FROM (now() - u.created_at)) / 86400)::integer,
    9999
  )
  FROM auth.users u
  WHERE u.id = p_user_id;
$$;

-- Server-side registration — bypasses client RLS / insert failures
CREATE OR REPLACE FUNCTION public.ensure_new_user_campaign(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_account_age integer;
  v_record      public.new_user_campaign%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('registered', false, 'error', 'Not authenticated');
  END IF;

  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN jsonb_build_object('registered', false, 'error', 'Invalid device');
  END IF;

  v_account_age := public.account_age_days(v_user_id);

  IF v_account_age >= 7 THEN
    RETURN jsonb_build_object(
      'registered', false,
      'eligible',   false,
      'error',      'Account older than 7 days'
    );
  END IF;

  SELECT * INTO v_record
  FROM public.new_user_campaign
  WHERE user_id = v_user_id;

  IF FOUND THEN
    IF NOT v_record.is_eligible AND v_record.days_claimed < 7 THEN
      UPDATE public.new_user_campaign
      SET is_eligible = true
      WHERE user_id = v_user_id;
      v_record.is_eligible := true;
    END IF;

    UPDATE public.new_user_campaign
    SET device_id = p_device_id
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'registered',   true,
      'eligible',     v_record.is_eligible,
      'days_claimed', v_record.days_claimed
    );
  END IF;

  INSERT INTO public.new_user_campaign (user_id, device_id, first_open_at, is_eligible)
  VALUES (v_user_id, p_device_id, now(), true)
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'registered',   true,
    'eligible',     true,
    'days_claimed', 0
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_record FROM public.new_user_campaign WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'registered',   true,
      'eligible',     COALESCE(v_record.is_eligible, true),
      'days_claimed', COALESCE(v_record.days_claimed, 0)
    );
END;
$$;

-- ── 5. Claim RPC ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_new_user_reward(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_account_age integer;
  v_record      public.new_user_campaign%ROWTYPE;
  v_today       date := CURRENT_DATE;
  v_reward      numeric := 1000;
  v_ensure      jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_account_age := public.account_age_days(v_user_id);

  IF v_account_age >= 7 THEN
    UPDATE public.new_user_campaign SET is_eligible = false WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'Campaign ended — account is older than 7 days');
  END IF;

  SELECT * INTO v_record FROM public.new_user_campaign WHERE user_id = v_user_id FOR UPDATE;

  -- Auto-register on first claim attempt
  IF NOT FOUND THEN
    v_ensure := public.ensure_new_user_campaign(p_device_id);
    IF (v_ensure->>'registered')::boolean IS NOT TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', COALESCE(v_ensure->>'error', 'Could not register for campaign'));
    END IF;
    SELECT * INTO v_record FROM public.new_user_campaign WHERE user_id = v_user_id FOR UPDATE;
  END IF;

  IF v_record.is_eligible = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not eligible for this campaign');
  END IF;

  IF v_record.days_claimed >= 7 THEN
    UPDATE public.new_user_campaign SET is_eligible = false WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'All 7 daily rewards already claimed');
  END IF;

  IF v_record.last_claim_at IS NOT NULL AND v_record.last_claim_at::date = v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed today');
  END IF;

  UPDATE public.user_points
  SET task_points = task_points + v_reward, updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, task_points, updated_at)
    VALUES (v_user_id, v_reward, now());
  END IF;

  UPDATE public.new_user_campaign
  SET
    days_claimed  = v_record.days_claimed + 1,
    last_claim_at = now(),
    device_id     = p_device_id,
    is_eligible   = CASE
                      WHEN v_record.days_claimed + 1 >= 7 THEN false
                      WHEN v_account_age + 1 >= 7     THEN false
                      ELSE true
                    END
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success',        true,
    'points_awarded', v_reward,
    'days_claimed',   v_record.days_claimed + 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_age_days(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_new_user_campaign(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_new_user_reward(text)         TO authenticated;
