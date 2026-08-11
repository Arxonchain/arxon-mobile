-- Fix claim-path points integrity:
-- 1) end_and_credit_mining_session accepts optional p_user_id for service_role (award-points)
-- 2) enforce_mining_session_limits uses ended_at when present (not always now())
-- 3) credit_pending_mining_for_user for server-side backlog repair
-- 4) Drop duplicate user_points triggers that fire normalize/validate twice

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
  v_end timestamptz;
BEGIN
  NEW.arx_mined := COALESCE(NEW.arx_mined, 0);
  NEW.arx_mined := GREATEST(NEW.arx_mined, 0);

  IF TG_OP = 'UPDATE' AND NEW.started_at < OLD.started_at THEN
    NEW.started_at := OLD.started_at;
  END IF;

  IF NEW.started_at > now() + interval '5 minutes' THEN
    NEW.started_at := now();
  END IF;

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

  v_total_boost := LEAST(COALESCE(v_referral_boost, 0)
                       + COALESCE(v_x_post_boost, 0)
                       + COALESCE(v_x_profile_boost, 0)
                       + COALESCE(v_arena_boost, 0)
                       + COALESCE(v_streak_boost, 0), 500);

  v_points_per_hour := LEAST(10 * (1 + (v_total_boost / 100.0)), 60);

  v_end := COALESCE(NEW.ended_at, now());
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_end - NEW.started_at));
  IF v_elapsed_seconds < 0 THEN
    v_elapsed_seconds := 0;
  END IF;

  v_max_allowed := LEAST(480, floor((LEAST(v_elapsed_seconds, 8 * 3600) / 3600.0) * v_points_per_hour) + 2);

  IF NEW.arx_mined > v_max_allowed THEN
    NEW.arx_mined := v_max_allowed;
  END IF;

  NEW.arx_mined := LEAST(NEW.arx_mined, 480);

  RETURN NEW;
END;
$$;

-- Replace prior single-arg overload so service_role can pass p_user_id
DROP FUNCTION IF EXISTS public.end_and_credit_mining_session(uuid);

CREATE OR REPLACE FUNCTION public.end_and_credit_mining_session(
  p_session_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  r RECORD;
  v_result user_points;
  v_seconds NUMERIC;
  v_effective NUMERIC;
  v_referral NUMERIC;
  v_x_post NUMERIC;
  v_streak NUMERIC;
  v_x_profile NUMERIC;
  v_arena NUMERIC;
  v_nexus NUMERIC;
  v_total_boost NUMERIC;
  v_pph NUMERIC;
  v_amt NUMERIC;
  v_end TIMESTAMPTZ;
  v_is_service BOOLEAN := (auth.role() = 'service_role');
BEGIN
  IF v_is_service THEN
    v_user_id := p_user_id;
    IF v_user_id IS NULL THEN
      SELECT user_id INTO v_user_id FROM public.mining_sessions WHERE id = p_session_id;
    END IF;
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session ID required');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM set_config('app.allow_session_credit', 'true', true);

  SELECT id, user_id, is_active, arx_mined, credited_at, started_at, ended_at
  INTO r
  FROM public.mining_sessions
  WHERE id = p_session_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found or access denied');
  END IF;

  IF r.is_active OR r.ended_at IS NULL THEN
    UPDATE public.mining_sessions
    SET is_active = false,
        ended_at = COALESCE(ended_at, now())
    WHERE id = r.id;
    r.ended_at := COALESCE(r.ended_at, now());
    r.is_active := false;
  END IF;

  IF r.credited_at IS NOT NULL THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already credited',
      'points', 0,
      'session_id', r.id,
      'user_points', row_to_json(v_result)
    );
  END IF;

  SELECT
    LEAST(COALESCE(referral_bonus_percentage, 0), 50),
    COALESCE(x_post_boost_percentage, 0),
    LEAST(COALESCE(daily_streak, 0), 30)
  INTO v_referral, v_x_post, v_streak
  FROM public.user_points WHERE user_id = v_user_id;

  SELECT COALESCE(boost_percentage, 0) INTO v_x_profile
  FROM public.x_profiles WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(boost_percentage), 0) INTO v_arena
  FROM public.arena_boosts
  WHERE user_id = v_user_id AND expires_at >= now();

  SELECT COALESCE(SUM(boost_percentage), 0) INTO v_nexus
  FROM public.nexus_boosts
  WHERE user_id = v_user_id AND claimed = true AND expires_at >= now();

  v_total_boost := LEAST(
    COALESCE(v_referral, 0) + COALESCE(v_x_post, 0) + COALESCE(v_streak, 0)
    + COALESCE(v_x_profile, 0) + COALESCE(v_arena, 0) + COALESCE(v_nexus, 0),
    500
  );
  v_pph := LEAST(10 * (1 + v_total_boost / 100.0), 60);

  v_end := COALESCE(r.ended_at, now());
  -- Guard inverted clocks (ended_at before started_at)
  IF v_end < r.started_at THEN
    v_end := r.started_at;
  END IF;
  v_seconds := EXTRACT(EPOCH FROM (v_end - r.started_at));
  IF v_seconds IS NULL OR v_seconds < 0 THEN v_seconds := 0; END IF;
  v_effective := LEAST(v_seconds, 8 * 3600);
  v_amt := LEAST(480, CEIL((v_effective / 3600.0) * v_pph));

  IF v_amt <= 0 THEN
    UPDATE public.mining_sessions
    SET credited_at = now(), arx_mined = 0
    WHERE id = r.id AND credited_at IS NULL;
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No points to award',
      'points', 0,
      'session_id', r.id,
      'user_points', row_to_json(v_result)
    );
  END IF;

  UPDATE public.mining_sessions
  SET credited_at = now(), arx_mined = v_amt
  WHERE id = r.id AND credited_at IS NULL;

  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already credited',
      'points', 0,
      'session_id', r.id,
      'user_points', row_to_json(v_result)
    );
  END IF;

  SELECT * INTO v_result FROM public.increment_user_points(v_user_id, v_amt, 'mining');

  IF v_result IS NULL THEN
    UPDATE public.mining_sessions SET credited_at = NULL WHERE id = r.id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award points');
  END IF;

  PERFORM public.log_points_ledger_entry(
    v_user_id, v_amt, 'mining',
    'Mining session credit (+' || v_amt || ' ARX-P)',
    'mining_session', r.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', v_amt,
    'session_id', r.id,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.end_and_credit_mining_session(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_and_credit_mining_session(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.end_and_credit_mining_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_and_credit_mining_session(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.credit_pending_mining_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_total NUMERIC := 0;
  r RECORD;
  v_rpc jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id required');
  END IF;

  FOR r IN
    SELECT id
    FROM public.mining_sessions
    WHERE user_id = p_user_id
      AND credited_at IS NULL
      AND started_at IS NOT NULL
      AND (is_active = false OR started_at <= now() - interval '8 hours')
    ORDER BY COALESCE(ended_at, started_at)
    FOR UPDATE OF mining_sessions
  LOOP
    v_rpc := public.end_and_credit_mining_session(r.id, p_user_id);
    IF COALESCE((v_rpc->>'success')::boolean, false)
       AND COALESCE((v_rpc->>'points')::numeric, 0) > 0 THEN
      v_count := v_count + 1;
      v_total := v_total + COALESCE((v_rpc->>'points')::numeric, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'sessions', v_count, 'points', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_pending_mining_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_pending_mining_for_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.credit_pending_mining_for_user(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_pending_mining_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_pending_mining_for_user(uuid) TO postgres;

-- Deduplicate double-fire triggers (keep the trg_* names)
DROP TRIGGER IF EXISTS normalize_points ON public.user_points;
DROP TRIGGER IF EXISTS validate_points_integrity ON public.user_points;
