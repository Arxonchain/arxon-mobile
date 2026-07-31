-- Fix task rewards: users were marked completed but wallet never received full admin-set amount.
-- Backfill ~1841 underpaid completions and expose per-user sync on login.

-- ── 1. Raise task_points category cap (20+ tasks at 5k each exceeded 100k) ───
CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_is_service_role BOOLEAN := (current_user = 'service_role');
  v_arena_stake BOOLEAN := (current_setting('app.arena_stake', true) = 'true');
  v_allow_decrease BOOLEAN := v_is_service_role OR v_arena_stake
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));
BEGIN
  IF TG_OP = 'UPDATE' AND NOT v_allow_decrease THEN
    IF NEW.mining_points < OLD.mining_points THEN NEW.mining_points := OLD.mining_points; END IF;
    IF NEW.task_points < OLD.task_points THEN NEW.task_points := OLD.task_points; END IF;
    IF NEW.social_points < OLD.social_points THEN NEW.social_points := OLD.social_points; END IF;
    IF NEW.referral_points < OLD.referral_points THEN NEW.referral_points := OLD.referral_points; END IF;
    IF NEW.game_points < OLD.game_points THEN NEW.game_points := OLD.game_points; END IF;
    IF NEW.arena_points < OLD.arena_points THEN NEW.arena_points := OLD.arena_points; END IF;
  END IF;

  NEW.mining_points := LEAST(GREATEST(COALESCE(NEW.mining_points, 0), 0), 1000000);
  NEW.task_points := LEAST(GREATEST(COALESCE(NEW.task_points, 0), 0), 10000000);
  NEW.social_points := LEAST(GREATEST(COALESCE(NEW.social_points, 0), 0), 1000000);
  NEW.referral_points := LEAST(GREATEST(COALESCE(NEW.referral_points, 0), 0), 1000000);
  NEW.game_points := LEAST(GREATEST(COALESCE(NEW.game_points, 0), 0), 1000000);
  NEW.arena_points := LEAST(GREATEST(COALESCE(NEW.arena_points, 0), 0), 1000000);
  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points
    + NEW.referral_points + NEW.game_points + NEW.arena_points;
  IF NEW.total_points > 10000000 THEN NEW.total_points := 10000000; END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Per-user sync for underpaid completed tasks (callable on login) ───────
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
  v_result user_points;
  r RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  FOR r IN
    SELECT
      ut.id,
      ut.points_awarded,
      COALESCE(ut.points_credited_amount, 0) AS credited
    FROM public.user_tasks ut
    WHERE ut.user_id = v_user_id
      AND ut.status = 'completed'
      AND COALESCE(ut.points_credited_amount, 0) < ut.points_awarded
    ORDER BY COALESCE(ut.completed_at, ut.created_at)
    FOR UPDATE OF ut
  LOOP
    v_owed := r.points_awarded - r.credited;
    IF v_owed <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_result FROM public.increment_user_points(v_user_id, v_owed, 'task');
    IF v_result IS NULL THEN CONTINUE; END IF;

    UPDATE public.user_tasks
    SET
      points_credited = true,
      points_credited_amount = r.points_awarded
    WHERE id = r.id;

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

GRANT EXECUTE ON FUNCTION public.credit_my_pending_tasks() TO authenticated;

-- ── 3. One-time backfill: credit all underpaid completed tasks ───────────────
DO $$
DECLARE
  r RECORD;
  v_owed NUMERIC;
  v_credited INT := 0;
  v_total NUMERIC := 0;
BEGIN
  FOR r IN
    SELECT
      ut.id,
      ut.user_id,
      ut.points_awarded,
      COALESCE(ut.points_credited_amount, 0) AS credited
    FROM public.user_tasks ut
    WHERE ut.status = 'completed'
      AND COALESCE(ut.points_credited_amount, 0) < ut.points_awarded
    ORDER BY COALESCE(ut.completed_at, ut.created_at)
    FOR UPDATE OF ut
  LOOP
    v_owed := r.points_awarded - r.credited;
    IF v_owed <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.user_points (user_id) VALUES (r.user_id) ON CONFLICT (user_id) DO NOTHING;

    PERFORM public.increment_user_points(r.user_id, v_owed, 'task');

    UPDATE public.user_tasks
    SET
      points_credited = true,
      points_credited_amount = r.points_awarded
    WHERE id = r.id;

    v_credited := v_credited + 1;
    v_total := v_total + v_owed;
  END LOOP;

  RAISE NOTICE 'Task backfill: % rows, % ARX-P credited', v_credited, v_total;
END $$;

-- ── 4. Recalculate total_points for all users ────────────────────────────────
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
