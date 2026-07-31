-- Fix mining + task points not reaching dashboard balances for public OTA users.
-- Causes: stale 6-arg increment_user_points overload (no row insert), 284+ uncredited mining sessions.

-- ── 1. Remove ambiguous 6-arg overload ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.increment_user_points(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT);

-- ── 2. Canonical 3-arg increment (ensure row exists, all categories) ─────────
DROP FUNCTION IF EXISTS public.increment_user_points(UUID, NUMERIC, TEXT);

CREATE FUNCTION public.increment_user_points(
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
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  INSERT INTO public.user_points (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_type = 'task' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_task_increment);
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

-- ── 3. Fix complete_task_and_award_points (3-arg, ensures row) ───────────────
CREATE OR REPLACE FUNCTION public.complete_task_and_award_points(
  p_task_id UUID,
  p_points_reward NUMERIC DEFAULT NULL
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

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 'points', v_to_credit, 'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO service_role;

-- ── 4. Per-user sync for any remaining uncredited mining (callable on login) ───
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  FOR r IN
    SELECT id, LEAST(500, CEIL(GREATEST(arx_mined, 0)))::numeric AS amt
    FROM public.mining_sessions
    WHERE user_id = v_user_id
      AND is_active = false
      AND credited_at IS NULL
      AND arx_mined > 0
    ORDER BY COALESCE(ended_at, started_at)
    FOR UPDATE OF mining_sessions
  LOOP
    IF r.amt <= 0 THEN CONTINUE; END IF;

    UPDATE public.mining_sessions
    SET credited_at = now()
    WHERE id = r.id AND credited_at IS NULL;

    IF FOUND THEN
      SELECT * INTO v_result FROM public.increment_user_points(v_user_id, r.amt, 'mining');
      IF v_result IS NOT NULL THEN
        v_count := v_count + 1;
        v_total := v_total + r.amt;
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

GRANT EXECUTE ON FUNCTION public.credit_my_pending_mining() TO authenticated;

-- ── 5. Backfill ALL uncredited mining sessions (one-time repair) ─────────────
DO $$
DECLARE
  r RECORD;
  v_amt NUMERIC;
BEGIN
  FOR r IN
    SELECT id, user_id, LEAST(500, CEIL(GREATEST(arx_mined, 0)))::numeric AS amt
    FROM public.mining_sessions
    WHERE is_active = false
      AND credited_at IS NULL
      AND arx_mined > 0
    ORDER BY COALESCE(ended_at, started_at)
  LOOP
    IF r.amt <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.user_points (user_id) VALUES (r.user_id) ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.mining_sessions
    SET credited_at = now()
    WHERE id = r.id AND credited_at IS NULL;

    IF FOUND THEN
      PERFORM public.increment_user_points(r.user_id, r.amt, 'mining');
    END IF;
  END LOOP;
END $$;

-- ── 6. Recalculate total_points for all users ────────────────────────────────
UPDATE public.user_points up
SET
  total_points = LEAST(10000000, GREATEST(0,
    COALESCE(mining_points, 0) + COALESCE(task_points, 0) + COALESCE(social_points, 0)
    + COALESCE(referral_points, 0) + COALESCE(game_points, 0) + COALESCE(arena_points, 0)
  )),
  updated_at = now()
WHERE ABS(
  COALESCE(total_points, 0) - (
    COALESCE(mining_points, 0) + COALESCE(task_points, 0) + COALESCE(social_points, 0)
    + COALESCE(referral_points, 0) + COALESCE(game_points, 0) + COALESCE(arena_points, 0)
  )
) > 0.5;
