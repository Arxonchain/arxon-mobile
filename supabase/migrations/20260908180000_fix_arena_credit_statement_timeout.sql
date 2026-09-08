-- Arena resolve: credit_arena_battle_earnings looped in 500-point chunks because
-- increment_user_points capped arena at 500. Large winner payouts (1M+ ARX-P) hit
-- Postgres statement_timeout (~8s) before finishing. Raise arena cap and credit in one call.

CREATE OR REPLACE FUNCTION public.increment_user_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS user_points
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_increment NUMERIC := 500;
  v_max_task_increment NUMERIC := 10000;
  v_max_arena_increment NUMERIC := 10000000;
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  INSERT INTO public.user_points (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_type = 'task' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_task_increment);
  ELSIF p_type = 'arena' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_arena_increment);
  ELSE
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_increment);
  END IF;

  IF v_capped_amount <= 0 THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = p_user_id;
    RETURN v_result;
  END IF;

  IF p_type = 'mining' THEN
    UPDATE user_points SET mining_points = GREATEST(mining_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points SET task_points = GREATEST(task_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points SET social_points = GREATEST(social_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points SET referral_points = GREATEST(referral_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'game' THEN
    UPDATE user_points SET game_points = GREATEST(game_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'arena' THEN
    UPDATE user_points SET arena_points = GREATEST(COALESCE(arena_points, 0), 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.credit_arena_battle_earnings(
  p_battle_id UUID,
  p_user_id UUID,
  p_total_earned NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.arena_earnings%ROWTYPE;
  v_target NUMERIC;
  v_owed NUMERIC;
  v_credited NUMERIC := 0;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  IF p_battle_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'battle_id and user_id required';
  END IF;

  v_target := GREATEST(FLOOR(COALESCE(p_total_earned, 0)), 0);
  IF v_target <= 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_row
  FROM public.arena_earnings
  WHERE battle_id = p_battle_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'arena_earnings row missing for battle % user %', p_battle_id, p_user_id;
  END IF;

  IF v_row.total_earned IS DISTINCT FROM v_target THEN
    UPDATE public.arena_earnings
    SET total_earned = v_target,
        pool_share_earned = v_target,
        bonus_earned = v_target - COALESCE(stake_amount, 0),
        is_winner = true
    WHERE battle_id = p_battle_id AND user_id = p_user_id;
  END IF;

  v_owed := v_target - COALESCE(v_row.points_credited_amount, 0);
  IF v_owed <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.increment_user_points(p_user_id, v_owed, 'arena');
  v_credited := v_owed;

  UPDATE public.arena_earnings
  SET points_credited_amount = COALESCE(points_credited_amount, 0) + v_credited
  WHERE battle_id = p_battle_id AND user_id = p_user_id;

  IF v_credited > 0 THEN
    PERFORM public.log_points_ledger_entry(
      p_user_id,
      v_credited,
      'arena_reward',
      'Arena battle winnings (+' || v_credited || ' ARX-P)',
      'arena_earning',
      v_row.id
    );
  END IF;

  RETURN v_credited;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_arena_battle_earnings(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_arena_battle_earnings(UUID, UUID, NUMERIC) TO service_role;
