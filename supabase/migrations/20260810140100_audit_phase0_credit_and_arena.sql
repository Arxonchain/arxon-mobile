-- Audit Phase 0b: secure credit sync + arena vote/resolve primitives

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. credit_my_pending_tasks: recompute from tasks.points_reward
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.credit_my_pending_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
  v_total NUMERIC := 0;
  v_owed NUMERIC;
  v_reward NUMERIC;
  v_result user_points;
  r RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  PERFORM set_config('app.allow_task_credit', 'true', true);

  FOR r IN
    SELECT
      ut.id,
      ut.task_id,
      COALESCE(ut.points_credited_amount, 0) AS credited,
      t.points_reward
    FROM public.user_tasks ut
    JOIN public.tasks t ON t.id = ut.task_id
    WHERE ut.user_id = v_user_id
      AND ut.status = 'completed'
      AND COALESCE(ut.points_credited_amount, 0) < LEAST(GREATEST(CEIL(t.points_reward), 0), 10000)
    ORDER BY COALESCE(ut.completed_at, ut.created_at)
    FOR UPDATE OF ut
  LOOP
    v_reward := LEAST(GREATEST(CEIL(r.points_reward), 0), 10000);
    v_owed := v_reward - r.credited;
    IF v_owed <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_result FROM public.increment_user_points(v_user_id, v_owed, 'task');
    IF v_result IS NULL THEN CONTINUE; END IF;

    UPDATE public.user_tasks
    SET
      points_awarded = v_reward,
      points_credited = true,
      points_credited_amount = v_reward
    WHERE id = r.id;

    PERFORM public.log_points_ledger_entry(
      v_user_id, v_owed, 'task',
      'Task credit sync (+' || v_owed || ' ARX-P)',
      'user_task', r.id
    );

    v_count := v_count + 1;
    v_total := v_total + v_owed;
  END LOOP;

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tasks', v_count,
    'points', v_total,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_my_pending_tasks() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_my_pending_tasks() FROM anon;
GRANT EXECUTE ON FUNCTION public.credit_my_pending_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_my_pending_tasks() TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. credit_my_pending_mining: recompute from elapsed time + boosts
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.credit_my_pending_mining()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
  v_total NUMERIC := 0;
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

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  PERFORM set_config('app.allow_session_credit', 'true', true);

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

  FOR r IN
    SELECT id, started_at, ended_at
    FROM public.mining_sessions
    WHERE user_id = v_user_id
      AND is_active = false
      AND credited_at IS NULL
      AND started_at IS NOT NULL
    ORDER BY COALESCE(ended_at, started_at)
    FOR UPDATE OF mining_sessions
  LOOP
    v_end := COALESCE(r.ended_at, r.started_at + interval '8 hours');
    v_seconds := EXTRACT(EPOCH FROM (v_end - r.started_at));
    IF v_seconds IS NULL OR v_seconds < 0 THEN v_seconds := 0; END IF;
    v_effective := LEAST(v_seconds, 8 * 3600);
    v_amt := LEAST(480, CEIL((v_effective / 3600.0) * v_pph));
    IF v_amt <= 0 THEN
      UPDATE public.mining_sessions
      SET credited_at = now(), arx_mined = 0
      WHERE id = r.id AND credited_at IS NULL;
      CONTINUE;
    END IF;

    UPDATE public.mining_sessions
    SET credited_at = now(), arx_mined = v_amt
    WHERE id = r.id AND credited_at IS NULL;

    IF FOUND THEN
      SELECT * INTO v_result FROM public.increment_user_points(v_user_id, v_amt, 'mining');
      IF v_result IS NOT NULL THEN
        PERFORM public.log_points_ledger_entry(
          v_user_id, v_amt, 'mining',
          'Mining session credit (+' || v_amt || ' ARX-P)',
          'mining_session', r.id
        );
        v_count := v_count + 1;
        v_total := v_total + v_amt;
      ELSE
        UPDATE public.mining_sessions SET credited_at = NULL WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'sessions', v_count,
    'points', v_total,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_my_pending_mining() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_my_pending_mining() FROM anon;
GRANT EXECUTE ON FUNCTION public.credit_my_pending_mining() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_my_pending_mining() TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. cast_arena_vote: side-c validation + ledger
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cast_arena_vote(
  p_battle_id UUID,
  p_side TEXT,
  p_amount NUMERIC
)
RETURNS public.arena_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_battle public.arena_battles%ROWTYPE;
  v_vote public.arena_votes%ROWTYPE;
  v_multiplier NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_side NOT IN ('a', 'b', 'c') THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum stake is 1000 ARX-P'; END IF;
  IF p_amount > 100000 THEN RAISE EXCEPTION 'Maximum stake is 100000 ARX-P'; END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.arena_votes WHERE battle_id = p_battle_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'You already voted on this prediction';
  END IF;

  SELECT * INTO v_battle FROM public.arena_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Battle not found'; END IF;
  IF v_battle.winner_side IS NOT NULL THEN RAISE EXCEPTION 'Voting is closed'; END IF;
  IF NOW() < v_battle.starts_at THEN RAISE EXCEPTION 'Voting has not started yet'; END IF;
  IF NOW() > v_battle.ends_at OR NOT v_battle.is_active THEN RAISE EXCEPTION 'Voting is closed'; END IF;
  IF p_side = 'c' AND (v_battle.side_c_name IS NULL OR btrim(v_battle.side_c_name) = '') THEN
    RAISE EXCEPTION 'Side C is not available for this market';
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user_id, p_amount);

  v_multiplier := public.calculate_early_stake_multiplier(p_battle_id, NOW());

  INSERT INTO public.arena_votes (battle_id, user_id, side, power_spent, early_stake_multiplier)
  VALUES (p_battle_id, v_user_id, p_side, p_amount, v_multiplier)
  RETURNING * INTO v_vote;

  IF p_side = 'a' THEN
    UPDATE public.arena_battles SET
      side_a_power = side_a_power + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  ELSIF p_side = 'b' THEN
    UPDATE public.arena_battles SET
      side_b_power = side_b_power + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  ELSE
    UPDATE public.arena_battles SET
      side_c_power = COALESCE(side_c_power, 0) + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  END IF;

  PERFORM public.log_points_ledger_entry(
    v_user_id, -p_amount, 'arena_stake',
    'Arena stake (-' || p_amount || ' ARX-P)',
    'arena_vote', v_vote.id
  );

  RETURN v_vote;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_arena_vote(UUID, TEXT, NUMERIC) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Unique earnings + atomic lock/refund helpers for resolve
-- ═══════════════════════════════════════════════════════════════════════════
DELETE FROM public.arena_earnings a
USING public.arena_earnings b
WHERE a.ctid < b.ctid
  AND a.battle_id = b.battle_id
  AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_arena_earnings_battle_user
  ON public.arena_earnings (battle_id, user_id);

DELETE FROM public.arena_staking_rewards a
USING public.arena_staking_rewards b
WHERE a.ctid < b.ctid
  AND a.battle_id = b.battle_id
  AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_arena_staking_rewards_battle_user
  ON public.arena_staking_rewards (battle_id, user_id);

-- Lock battle for resolve (returns false if already resolved / missing)
CREATE OR REPLACE FUNCTION public.lock_arena_battle_for_resolve(p_battle_id UUID)
RETURNS public.arena_battles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle public.arena_battles%ROWTYPE;
BEGIN
  SELECT * INTO v_battle
  FROM public.arena_battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  IF v_battle.winner_side IS NOT NULL AND COALESCE(v_battle.total_rewards_distributed, 0) > 0 THEN
    RAISE EXCEPTION 'Battle already resolved';
  END IF;

  -- Soft lock: mark inactive while resolving to reduce concurrent writers
  UPDATE public.arena_battles
  SET is_active = false
  WHERE id = p_battle_id
  RETURNING * INTO v_battle;

  RETURN v_battle;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_arena_battle_for_resolve(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_arena_battle_for_resolve(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.lock_arena_battle_for_resolve(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.lock_arena_battle_for_resolve(UUID) TO service_role;

-- Refund all stakes for a battle (empty winner / tie / void)
CREATE OR REPLACE FUNCTION public.refund_arena_battle_stakes(p_battle_id UUID, p_reason TEXT DEFAULT 'void')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_total NUMERIC := 0;
  v_chunk NUMERIC;
  v_left NUMERIC;
BEGIN
  FOR r IN
    SELECT id, user_id, power_spent
    FROM public.arena_votes
    WHERE battle_id = p_battle_id
    FOR UPDATE
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.arena_earnings
      WHERE battle_id = p_battle_id AND user_id = r.user_id
    ) THEN
      CONTINUE;
    END IF;

    v_left := CEIL(r.power_spent);
    WHILE v_left > 0 LOOP
      v_chunk := LEAST(v_left, 500);
      PERFORM public.increment_user_points(r.user_id, v_chunk, 'arena');
      v_left := v_left - v_chunk;
    END LOOP;

    INSERT INTO public.arena_earnings (
      battle_id, user_id, stake_amount, bonus_earned, pool_share_earned,
      streak_bonus, total_earned, is_winner
    ) VALUES (
      p_battle_id, r.user_id, r.power_spent, 0, r.power_spent, 0, r.power_spent, false
    ) ON CONFLICT (battle_id, user_id) DO NOTHING;

    PERFORM public.log_points_ledger_entry(
      r.user_id, r.power_spent, 'arena_refund',
      'Arena refund (' || p_reason || ') +' || r.power_spent || ' ARX-P',
      'arena_vote', r.id
    );

    v_count := v_count + 1;
    v_total := v_total + r.power_spent;
  END LOOP;

  UPDATE public.arena_battles
  SET is_active = false,
      winner_side = COALESCE(winner_side, 'none'),
      losing_pool_distributed = true,
      total_rewards_distributed = COALESCE(total_rewards_distributed, 0),
      resolution_source = COALESCE(resolution_source, '') || ' | refunded:' || p_reason
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'refunded', v_count, 'points', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_arena_battle_stakes(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_arena_battle_stakes(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.refund_arena_battle_stakes(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_arena_battle_stakes(UUID, TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. get_arena_participation: DEFINER, no side leak
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.get_arena_participation(uuid);

CREATE FUNCTION public.get_arena_participation(p_battle_id uuid)
RETURNS TABLE(
  battle_id uuid,
  user_id uuid,
  power_spent numeric,
  created_at timestamptz,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT av.battle_id, av.user_id, av.power_spent, av.created_at, p.username, p.avatar_url
  FROM public.arena_votes av
  LEFT JOIN public.profiles p ON p.user_id = av.user_id
  WHERE av.battle_id = p_battle_id
  ORDER BY av.power_spent DESC;
$$;

REVOKE ALL ON FUNCTION public.get_arena_participation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_participation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arena_participation(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_arena_participation(uuid) TO service_role;

-- Admin refund-before-delete helper
CREATE OR REPLACE FUNCTION public.admin_delete_arena_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote_count INT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COUNT(*) INTO v_vote_count FROM public.arena_votes WHERE battle_id = p_battle_id;
  IF v_vote_count > 0 THEN
    PERFORM public.refund_arena_battle_stakes(p_battle_id, 'admin_delete');
  END IF;

  DELETE FROM public.arena_battles WHERE id = p_battle_id;
  RETURN jsonb_build_object('success', true, 'refunded_votes', v_vote_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_arena_battle(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_arena_battle(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_arena_battle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_arena_battle(UUID) TO service_role;

-- Ensure complete_task_and_award_points can update protected credit columns
CREATE OR REPLACE FUNCTION public.complete_task_and_award_points(
  p_task_id uuid,
  p_points_reward numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_task_reward NUMERIC;
  v_to_credit NUMERIC;
  v_already_credited NUMERIC;
  v_existing public.user_tasks%ROWTYPE;
  v_has_existing BOOLEAN := false;
  v_result public.user_points%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM set_config('app.allow_task_credit', 'true', true);
  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  SELECT LEAST(GREATEST(CEIL(points_reward), 0), 10000)
  INTO v_task_reward
  FROM public.tasks
  WHERE id = p_task_id AND is_active = true;

  IF v_task_reward IS NULL OR v_task_reward <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;

  SELECT * INTO v_existing
  FROM public.user_tasks
  WHERE user_id = v_user_id AND task_id = p_task_id
  FOR UPDATE;

  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status = 'completed' THEN
    v_already_credited := COALESCE(v_existing.points_credited_amount, 0);
    IF v_already_credited >= v_task_reward THEN
      SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
      RETURN jsonb_build_object(
        'success', true, 'already_credited', true, 'points', 0,
        'user_points', row_to_json(v_result)
      );
    END IF;
    v_to_credit := v_task_reward - v_already_credited;
  ELSE
    v_to_credit := v_task_reward;
  END IF;

  SELECT * INTO v_result
  FROM public.increment_user_points(v_user_id, v_to_credit, 'task');

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award points');
  END IF;

  IF v_has_existing THEN
    UPDATE public.user_tasks
    SET status = 'completed', points_awarded = v_task_reward,
        points_credited = true, points_credited_amount = v_task_reward,
        completed_at = COALESCE(completed_at, now())
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.user_tasks (
      user_id, task_id, status, points_awarded, points_credited,
      points_credited_amount, completed_at
    ) VALUES (
      v_user_id, p_task_id, 'completed', v_task_reward, true, v_task_reward, now()
    );
  END IF;

  PERFORM public.log_points_ledger_entry(
    v_user_id, v_to_credit, 'task',
    'Task completed (+' || v_to_credit || ' ARX-P)',
    'task', p_task_id
  );

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'points', v_to_credit, 'user_points', row_to_json(v_result)
  );
END;
$$;
