-- Fix mining stop/collect after protect_mining_session_credits:
-- clients may end sessions (is_active/ended_at) but cannot write arx_mined/credited_at.
-- Provide an atomic SECURITY DEFINER RPC and close already-credited zombie sessions.

CREATE OR REPLACE FUNCTION public.end_and_credit_mining_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
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
BEGIN
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

REVOKE ALL ON FUNCTION public.end_and_credit_mining_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_and_credit_mining_session(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.end_and_credit_mining_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_and_credit_mining_session(uuid) TO service_role;

UPDATE public.mining_sessions
SET is_active = false,
    ended_at = COALESCE(ended_at, credited_at, now())
WHERE is_active = true
  AND credited_at IS NOT NULL;
