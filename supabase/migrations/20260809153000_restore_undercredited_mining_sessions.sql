-- Verify follow-up 2026-08-09: restore mining bucket gaps where credited
-- mining_sessions sum exceeds mining_points after known legitimate debits
-- (arena_stake / nexus_send / dice stakes). Peak-ledger and task-earned
-- restores from cap_clamp migration left these small under-credits.
-- Idempotent via points_ledger unique (user_id, category, reference_type, reference_id).

DO $$
DECLARE
  r RECORD;
  v_users INT := 0;
  v_total NUMERIC := 0;
  v_ref_type TEXT := 'mining_earned_restore_v1';
BEGIN
  FOR r IN
    WITH mining AS (
      SELECT
        user_id,
        SUM(LEAST(500, CEIL(GREATEST(arx_mined, 0)))) AS earned
      FROM public.mining_sessions
      WHERE credited_at IS NOT NULL
      GROUP BY user_id
    ),
    debits AS (
      SELECT
        user_id,
        COALESCE(SUM(-amount), 0) AS debit_sum
      FROM public.points_ledger
      WHERE amount < 0
        AND category IN (
          'arena_stake',
          'nexus_send',
          'dice_stake',
          'dice_house_stake',
          'game_stake'
        )
      GROUP BY user_id
    )
    SELECT
      up.user_id,
      up.mining_points,
      up.task_points,
      up.social_points,
      up.total_points,
      m.earned,
      COALESCE(d.debit_sum, 0) AS debit_sum,
      GREATEST(
        m.earned - up.mining_points - COALESCE(d.debit_sum, 0),
        0
      ) AS deficit
    FROM public.user_points up
    JOIN mining m ON m.user_id = up.user_id
    LEFT JOIN debits d ON d.user_id = up.user_id
    WHERE GREATEST(
      m.earned - up.mining_points - COALESCE(d.debit_sum, 0),
      0
    ) > 1
    ORDER BY deficit DESC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.points_ledger
      WHERE user_id = r.user_id
        AND category = 'points_restoration'
        AND reference_type = v_ref_type
        AND reference_id = r.user_id
    ) THEN
      CONTINUE;
    END IF;

    IF r.deficit <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.user_points
    SET mining_points = mining_points + r.deficit,
        updated_at = now()
    WHERE user_id = r.user_id;

    INSERT INTO public.points_audit_log (
      user_id, audit_type,
      stored_mining_points, stored_task_points, stored_social_points,
      stored_referral_points, stored_total_points,
      computed_mining_points, computed_task_points, computed_social_points,
      computed_referral_points, computed_checkin_points, computed_total_points,
      mining_diff, task_diff, social_diff, referral_diff, total_diff,
      points_restored, action_taken, notes
    ) VALUES (
      r.user_id, 'mining_earned_restore_v1',
      r.mining_points, r.task_points, r.social_points, 0, r.total_points,
      r.mining_points + r.deficit, r.task_points, r.social_points,
      0, 0, r.total_points + r.deficit,
      r.deficit, 0, 0, 0, r.deficit,
      r.deficit, 'restored',
      format(
        'Restored under-credited mining sessions. earned=%s debits=%s',
        r.earned, r.debit_sum
      )
    );

    PERFORM public.log_points_ledger_entry(
      r.user_id,
      r.deficit,
      'points_restoration',
      format(
        'Restored under-credited mining session points (+%s ARX-P)',
        r.deficit
      ),
      v_ref_type,
      r.user_id
    );

    v_users := v_users + 1;
    v_total := v_total + r.deficit;
  END LOOP;

  RAISE NOTICE 'Mining earned restore: % users, % ARX-P', v_users, v_total;
END $$;
