-- Harden mining against client-side point inflation and fix user_points write exploits

-- 1) Enforce server-side mining session limits (rate-based + absolute cap)
CREATE OR REPLACE FUNCTION public.enforce_mining_session_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_referral_boost integer := 0;
  v_x_post_boost integer := 0;
  v_x_profile_boost integer := 0;
  v_arena_boost integer := 0;
  v_total_boost integer := 0;
  v_points_per_hour numeric := 10;
  v_elapsed_seconds numeric := 0;
  v_max_allowed numeric := 0;
BEGIN
  -- Normalize inputs
  NEW.arx_mined := COALESCE(NEW.arx_mined, 0);
  NEW.arx_mined := GREATEST(NEW.arx_mined, 0);

  -- Prevent backdating start time (blocks instant 8h claims)
  IF TG_OP = 'UPDATE' AND NEW.started_at < OLD.started_at THEN
    NEW.started_at := OLD.started_at;
  END IF;

  -- Prevent future start times (small clock skew tolerance)
  IF NEW.started_at > now() + interval '5 minutes' THEN
    NEW.started_at := now();
  END IF;

  -- Fetch boosts (all are capped later)
  SELECT COALESCE(up.referral_bonus_percentage, 0), COALESCE(up.x_post_boost_percentage, 0)
    INTO v_referral_boost, v_x_post_boost
  FROM public.user_points up
  WHERE up.user_id = NEW.user_id;

  SELECT COALESCE(xp.boost_percentage, 0)
    INTO v_x_profile_boost
  FROM public.x_profiles xp
  WHERE xp.user_id = NEW.user_id;

  SELECT COALESCE(SUM(ab.boost_percentage), 0)
    INTO v_arena_boost
  FROM public.arena_boosts ab
  WHERE ab.user_id = NEW.user_id
    AND ab.expires_at >= now();

  v_total_boost := LEAST(COALESCE(v_referral_boost, 0)
                       + COALESCE(v_x_post_boost, 0)
                       + COALESCE(v_x_profile_boost, 0)
                       + COALESCE(v_arena_boost, 0), 500);

  -- Compute user's max allowed rate (same cap as frontend: max 60/hr)
  v_points_per_hour := LEAST(10 * (1 + (v_total_boost / 100.0)), 60);

  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - NEW.started_at));
  IF v_elapsed_seconds < 0 THEN
    v_elapsed_seconds := 0;
  END IF;

  -- Max allowed mined so far (buffer +2 points for timing jitter)
  v_max_allowed := LEAST(480, floor((v_elapsed_seconds / 3600.0) * v_points_per_hour) + 2);

  IF NEW.arx_mined > v_max_allowed THEN
    NEW.arx_mined := v_max_allowed;
  END IF;

  -- Absolute safety cap
  NEW.arx_mined := LEAST(NEW.arx_mined, 480);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mining_session_limits ON public.mining_sessions;
CREATE TRIGGER trg_enforce_mining_session_limits
BEFORE INSERT OR UPDATE ON public.mining_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mining_session_limits();


-- 2) Ensure user_points totals are always normalized server-side
DROP TRIGGER IF EXISTS trg_normalize_user_points_totals ON public.user_points;
CREATE TRIGGER trg_normalize_user_points_totals
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.normalize_user_points_totals();


-- 3) Lock down user_points so users cannot self-edit balances via API
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;

DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
CREATE POLICY "Users can insert their own points (zero init)"
ON public.user_points
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(total_points, 0) = 0
  AND COALESCE(daily_streak, 0) = 0
  AND COALESCE(mining_points, 0) = 0
  AND COALESCE(task_points, 0) = 0
  AND COALESCE(social_points, 0) = 0
  AND COALESCE(referral_points, 0) = 0
  AND COALESCE(referral_bonus_percentage, 0) = 0
  AND COALESCE(x_post_boost_percentage, 0) = 0
);

DROP POLICY IF EXISTS "Admins can update all user points" ON public.user_points;
CREATE POLICY "Admins can update all user points"
ON public.user_points
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- 4) Lock down mining_sessions writes to prevent forging arx_mined on updates/inserts
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.mining_sessions;

DROP POLICY IF EXISTS "Users can insert their own sessions (safe)" ON public.mining_sessions;
CREATE POLICY "Users can insert their own sessions (safe)"
ON public.mining_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(arx_mined, 0) = 0
  AND is_active = true
);

DROP POLICY IF EXISTS "Users can update their own sessions (safe)" ON public.mining_sessions;
CREATE POLICY "Users can update their own sessions (safe)"
ON public.mining_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(arx_mined, 0) >= 0
  AND COALESCE(arx_mined, 0) <= 480
);


-- 5) One-time cleanup: clamp obviously-forged rows
UPDATE public.mining_sessions
SET arx_mined = LEAST(GREATEST(arx_mined, 0), 480)
WHERE arx_mined > 480 OR arx_mined < 0;

UPDATE public.user_points
SET mining_points = 0
WHERE mining_points > 1000000;
