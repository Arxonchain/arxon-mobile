-- Follow-up fix: task rewards were still capped at 500 per completion (2000-point
-- tasks only paid 500), and the first backfill did not cover post-fix completions.
-- This migration credits full task rewards, tracks per-task credited amounts, and
-- re-syncs ALL user balances from provable source tables.

-- ── 1. Track actual credited amount per task completion ─────────────────────
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS points_credited_amount NUMERIC NOT NULL DEFAULT 0;

-- Mark fully synced completions after balance restore (runs at end of migration)
-- Until then, allow top-up credits for any completed task below points_awarded.

-- ── 2. increment_user_points: full task rewards, keep 500 cap for other types ─
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
  v_max_mining_social NUMERIC := 500;
  v_max_task NUMERIC := 10000;
  v_max_category NUMERIC := 100000;
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  IF p_type = 'task' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_task);
  ELSE
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_mining_social);
  END IF;

  IF p_type = 'mining' THEN
    UPDATE user_points SET
      mining_points = GREATEST(
        mining_points,
        LEAST(mining_points + v_capped_amount, v_max_category)
      ),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points SET
      task_points = GREATEST(
        task_points,
        LEAST(task_points + v_capped_amount, v_max_category)
      ),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points SET
      social_points = GREATEST(
        social_points,
        LEAST(social_points + v_capped_amount, v_max_category)
      ),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points SET
      referral_points = GREATEST(
        referral_points,
        LEAST(referral_points + v_capped_amount, v_max_category)
      ),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO postgres;

-- ── 3. complete_task_and_award_points: full reward from tasks table ─────────
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
        'success', true,
        'already_credited', true,
        'points', 0,
        'user_points', row_to_json(v_result)
      );
    END IF;
    v_to_credit := v_task_reward - v_already_credited;
  ELSE
    v_to_credit := v_task_reward;
  END IF;

  SELECT * INTO v_result
  FROM public.increment_user_points(v_user_id, v_to_credit, 'task');

  IF NOT FOUND OR v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award points');
  END IF;

  IF v_has_existing THEN
    UPDATE public.user_tasks
    SET
      status = 'completed',
      points_awarded = v_task_reward,
      points_credited = true,
      points_credited_amount = v_task_reward,
      completed_at = COALESCE(completed_at, now())
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.user_tasks (
      user_id, task_id, status, points_awarded,
      points_credited, points_credited_amount, completed_at
    ) VALUES (
      v_user_id, p_task_id, 'completed', v_task_reward,
      true, v_task_reward, now()
    );
  END IF;

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'points', v_to_credit,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO service_role;

-- ── 4. Reusable sync: restore task_points for ALL users from source tables ───
CREATE OR REPLACE FUNCTION public.sync_all_user_task_balances()
RETURNS TABLE(users_updated BIGINT, total_points_restored NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_campaign BOOLEAN;
  v_users_updated BIGINT := 0;
  v_total_restored NUMERIC := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'new_user_campaign'
  ) INTO v_has_campaign;

  IF v_has_campaign THEN
    WITH expected AS (
      SELECT
        up.user_id,
        up.task_points AS stored_task,
        up.mining_points,
        up.social_points,
        up.referral_points,
        up.total_points AS stored_total,
        COALESCE(ut.task_sum, 0)
          + COALESCE(dc.checkin_sum, 0)
          + COALESCE(nuc.campaign_sum, 0) AS expected_task
      FROM public.user_points up
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS task_sum
        FROM public.user_tasks WHERE status = 'completed' GROUP BY user_id
      ) ut ON ut.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS checkin_sum
        FROM public.daily_checkins GROUP BY user_id
      ) dc ON dc.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, days_claimed * 1000 AS campaign_sum
        FROM public.new_user_campaign
      ) nuc ON nuc.user_id = up.user_id
    ),
    to_restore AS (
      SELECT * FROM expected WHERE expected_task > stored_task
    ),
    updated AS (
      UPDATE public.user_points up
      SET
        task_points = tr.expected_task,
        total_points = tr.mining_points + tr.expected_task + tr.social_points + tr.referral_points,
        updated_at = now()
      FROM to_restore tr
      WHERE up.user_id = tr.user_id
      RETURNING
        up.user_id,
        tr.stored_task,
        tr.expected_task,
        tr.stored_total,
        tr.mining_points + tr.expected_task + tr.social_points + tr.referral_points AS new_total
    )
    INSERT INTO public.points_audit_log (
      user_id, audit_type,
      stored_task_points, stored_total_points,
      computed_task_points, computed_total_points,
      task_diff, total_diff,
      action_taken, points_restored, notes
    )
    SELECT
      user_id, 'task_balance_sync_v2',
      stored_task, stored_total,
      expected_task, new_total,
      expected_task - stored_task, new_total - stored_total,
      'restored', new_total - stored_total,
      'Full task balance sync: restored missing points from completed tasks, check-ins, and campaign.'
    FROM updated;

    GET DIAGNOSTICS v_users_updated = ROW_COUNT;
  ELSE
    WITH expected AS (
      SELECT
        up.user_id,
        up.task_points AS stored_task,
        up.mining_points,
        up.social_points,
        up.referral_points,
        up.total_points AS stored_total,
        COALESCE(ut.task_sum, 0) + COALESCE(dc.checkin_sum, 0) AS expected_task
      FROM public.user_points up
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS task_sum
        FROM public.user_tasks WHERE status = 'completed' GROUP BY user_id
      ) ut ON ut.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS checkin_sum
        FROM public.daily_checkins GROUP BY user_id
      ) dc ON dc.user_id = up.user_id
    ),
    to_restore AS (
      SELECT * FROM expected WHERE expected_task > stored_task
    ),
    updated AS (
      UPDATE public.user_points up
      SET
        task_points = tr.expected_task,
        total_points = tr.mining_points + tr.expected_task + tr.social_points + tr.referral_points,
        updated_at = now()
      FROM to_restore tr
      WHERE up.user_id = tr.user_id
      RETURNING
        up.user_id,
        tr.stored_task,
        tr.expected_task,
        tr.stored_total,
        tr.mining_points + tr.expected_task + tr.social_points + tr.referral_points AS new_total
    )
    INSERT INTO public.points_audit_log (
      user_id, audit_type,
      stored_task_points, stored_total_points,
      computed_task_points, computed_total_points,
      task_diff, total_diff,
      action_taken, points_restored, notes
    )
    SELECT
      user_id, 'task_balance_sync_v2',
      stored_task, stored_total,
      expected_task, new_total,
      expected_task - stored_task, new_total - stored_total,
      'restored', new_total - stored_total,
      'Full task balance sync: restored missing points from completed tasks and check-ins.'
    FROM updated;

    GET DIAGNOSTICS v_users_updated = ROW_COUNT;
  END IF;

  SELECT COALESCE(SUM(points_restored), 0) INTO v_total_restored
  FROM public.points_audit_log
  WHERE audit_type = 'task_balance_sync_v2'
    AND created_at > now() - interval '5 minutes';

  -- Align credited amounts with completed task records after sync
  UPDATE public.user_tasks
  SET
    points_credited = true,
    points_credited_amount = points_awarded
  WHERE status = 'completed';

  RETURN QUERY SELECT v_users_updated, v_total_restored;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_all_user_task_balances() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_all_user_task_balances() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_user_task_balances() TO postgres;

-- ── 5. Run full sync now ──────────────────────────────────────────────────────
SELECT * FROM public.sync_all_user_task_balances();
