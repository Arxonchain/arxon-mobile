-- Update enforce_mining_session_limits to include streak boost
CREATE OR REPLACE FUNCTION public.enforce_mining_session_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
DECLARE
  v_referral_boost integer := 0;
  v_x_post_boost integer := 0;
  v_x_profile_boost integer := 0;
  v_arena_boost integer := 0;
  v_streak_boost integer := 0;
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
  SELECT COALESCE(up.referral_bonus_percentage, 0), COALESCE(up.x_post_boost_percentage, 0), LEAST(COALESCE(up.daily_streak, 0), 30)
    INTO v_referral_boost, v_x_post_boost, v_streak_boost
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

  -- Total boost = referral + X profile + X posts + arena + streak (cap at 500%)
  v_total_boost := LEAST(COALESCE(v_referral_boost, 0)
                       + COALESCE(v_x_post_boost, 0)
                       + COALESCE(v_x_profile_boost, 0)
                       + COALESCE(v_arena_boost, 0)
                       + COALESCE(v_streak_boost, 0), 500);

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