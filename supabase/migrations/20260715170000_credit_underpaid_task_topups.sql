ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS cap_topup_amount NUMERIC NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.credit_task_cap_topups()
RETURNS TABLE(users_credited BIGINT, total_topup NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users BIGINT := 0;
  v_total NUMERIC := 0;
  v_row RECORD;
  v_topup NUMERIC;
  v_cap_window_end TIMESTAMPTZ := TIMESTAMPTZ '2026-07-15 13:45:00+00';
BEGIN
  FOR v_row IN
    SELECT
      ut.id,
      ut.user_id,
      ut.points_awarded,
      ut.cap_topup_amount
    FROM public.user_tasks ut
    WHERE ut.status = 'completed'
      AND ut.points_awarded > 500
      AND ut.completed_at < v_cap_window_end
      AND ut.cap_topup_amount < (ut.points_awarded - 500)
  LOOP
    v_topup := v_row.points_awarded - 500 - v_row.cap_topup_amount;
    IF v_topup <= 0 THEN
      CONTINUE;
    END IF;

    PERFORM public.increment_user_points(v_row.user_id, v_topup, 'task');

    UPDATE public.user_tasks
    SET cap_topup_amount = cap_topup_amount + v_topup
    WHERE id = v_row.id;

    INSERT INTO public.points_audit_log (
      user_id, audit_type,
      stored_task_points, stored_total_points,
      computed_task_points, computed_total_points,
      task_diff, total_diff,
      action_taken, points_restored, notes
    )
    SELECT
      up.user_id, 'task_cap_topup',
      up.task_points, up.total_points,
      up.task_points, up.total_points + v_topup,
      v_topup, v_topup,
      'restored', v_topup,
      'Top-up for task completion underpaid due to 500-point cap (task ' || v_row.id || ').'
    FROM public.user_points up
    WHERE up.user_id = v_row.user_id;

    v_users := v_users + 1;
    v_total := v_total + v_topup;
  END LOOP;

  RETURN QUERY SELECT v_users, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_task_cap_topups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_task_cap_topups() TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_task_cap_topups() TO postgres;

SELECT * FROM public.credit_task_cap_topups();
SELECT * FROM public.sync_all_user_task_balances();

-- Enable realtime so dashboard/apps update live when balances change (no app rebuild needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
  END IF;
END $$;
