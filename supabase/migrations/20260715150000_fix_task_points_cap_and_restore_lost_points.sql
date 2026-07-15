-- Fix: completing X/social tasks reduced user balances when task_points already
-- exceeded 1000 (from daily check-ins or new-user campaign). increment_user_points
-- used LEAST(task_points + amount, 1000), which clamped balances DOWN.
--
-- 1) Recreate increment_user_points with safe caps and never-decrease-on-credit logic
-- 2) Restore task_points (and totals) for every user short of provable earnings

-- ── 1. Fix increment_user_points ───────────────────────────────────────────────
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
  v_max_category  NUMERIC := 100000;
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_increment);

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

-- ── 2. Track whether task completion points were actually credited ───────────
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS points_credited BOOLEAN NOT NULL DEFAULT false;

UPDATE public.user_tasks
SET points_credited = true
WHERE status = 'completed';

-- Atomic task completion + credit (prevents lost or double credits)
CREATE OR REPLACE FUNCTION public.complete_task_and_award_points(
  p_task_id UUID,
  p_points_reward NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_safe_amount NUMERIC;
  v_existing public.user_tasks%ROWTYPE;
  v_has_existing BOOLEAN := false;
  v_result public.user_points%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_safe_amount := LEAST(GREATEST(CEIL(p_points_reward), 0), 500);
  IF v_safe_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reward amount');
  END IF;

  SELECT * INTO v_existing
  FROM public.user_tasks
  WHERE user_id = v_user_id AND task_id = p_task_id
  FOR UPDATE;

  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status = 'completed' AND v_existing.points_credited THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_credited', true,
      'points', 0,
      'user_points', row_to_json(v_result)
    );
  END IF;

  SELECT * INTO v_result
  FROM public.increment_user_points(v_user_id, v_safe_amount, 'task');

  IF NOT FOUND OR v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award points');
  END IF;

  IF v_has_existing THEN
    UPDATE public.user_tasks
    SET
      status = 'completed',
      points_awarded = p_points_reward,
      points_credited = true,
      completed_at = COALESCE(completed_at, now())
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.user_tasks (
      user_id, task_id, status, points_awarded, points_credited, completed_at
    ) VALUES (
      v_user_id, p_task_id, 'completed', p_points_reward, true, now()
    );
  END IF;

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'points', v_safe_amount,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_and_award_points(UUID, NUMERIC) TO service_role;

-- ── 3. Backfill users who lost task_points due to the 1000 cap ───────────────
DO $$
DECLARE
  v_has_campaign BOOLEAN;
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
        FROM public.user_tasks
        WHERE status = 'completed'
        GROUP BY user_id
      ) ut ON ut.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS checkin_sum
        FROM public.daily_checkins
        GROUP BY user_id
      ) dc ON dc.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, days_claimed * 1000 AS campaign_sum
        FROM public.new_user_campaign
      ) nuc ON nuc.user_id = up.user_id
    ),
    to_restore AS (
      SELECT *
      FROM expected
      WHERE expected_task > stored_task
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
      user_id,
      audit_type,
      stored_task_points,
      stored_total_points,
      computed_task_points,
      computed_total_points,
      task_diff,
      total_diff,
      action_taken,
      points_restored,
      notes
    )
    SELECT
      user_id,
      'task_cap_backfill',
      stored_task,
      stored_total,
      expected_task,
      new_total,
      expected_task - stored_task,
      new_total - stored_total,
      'restored',
      new_total - stored_total,
      'Auto-restore: task_points were clamped to 1000 by increment_user_points when users completed X/social tasks after earning check-in or campaign points.'
    FROM updated;
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
        FROM public.user_tasks
        WHERE status = 'completed'
        GROUP BY user_id
      ) ut ON ut.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, SUM(points_awarded) AS checkin_sum
        FROM public.daily_checkins
        GROUP BY user_id
      ) dc ON dc.user_id = up.user_id
    ),
    to_restore AS (
      SELECT *
      FROM expected
      WHERE expected_task > stored_task
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
      user_id,
      audit_type,
      stored_task_points,
      stored_total_points,
      computed_task_points,
      computed_total_points,
      task_diff,
      total_diff,
      action_taken,
      points_restored,
      notes
    )
    SELECT
      user_id,
      'task_cap_backfill',
      stored_task,
      stored_total,
      expected_task,
      new_total,
      expected_task - stored_task,
      new_total - stored_total,
      'restored',
      new_total - stored_total,
      'Auto-restore: task_points were clamped to 1000 by increment_user_points when users completed X/social tasks after earning check-in points.'
    FROM updated;
  END IF;
END $$;
