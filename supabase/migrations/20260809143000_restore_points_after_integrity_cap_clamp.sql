-- Incident 2026-08-09: restore balances silently cut by validate_user_points_integrity
-- LEAST caps (social/mining 1e6, task briefly 1e5, total 1e7) when July 30–31
-- migrations mass-updated user_points rows.
--
-- This migration:
-- 1) Raises category/total caps so legitimate balances are never silently clamped down
-- 2) Restores peak ledger balance_after deficits (idempotent)
-- 3) Restores task/check-in/campaign earned-vs-stored deficits (idempotent)
-- 4) Fixes send_nexus_transfer so sends debit buckets and receivers are credited
--
-- Inflation controls retained: per-call caps in increment_user_points, nexus
-- amount/daily limits, and anti-decrease for non-privileged roles.

-- ── 1. Integrity trigger: high safety ceilings, never silent wipe ─────────────
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
  -- Soft ceilings only (1e9). Do NOT use low caps that destroy earned balances.
  v_max_category NUMERIC := 1000000000;
  v_max_total NUMERIC := 1000000000;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT v_allow_decrease THEN
    IF NEW.mining_points < OLD.mining_points THEN NEW.mining_points := OLD.mining_points; END IF;
    IF NEW.task_points < OLD.task_points THEN NEW.task_points := OLD.task_points; END IF;
    IF NEW.social_points < OLD.social_points THEN NEW.social_points := OLD.social_points; END IF;
    IF NEW.referral_points < OLD.referral_points THEN NEW.referral_points := OLD.referral_points; END IF;
    IF NEW.game_points < OLD.game_points THEN NEW.game_points := OLD.game_points; END IF;
    IF NEW.arena_points < OLD.arena_points THEN NEW.arena_points := OLD.arena_points; END IF;
  END IF;

  NEW.mining_points := LEAST(GREATEST(COALESCE(NEW.mining_points, 0), 0), v_max_category);
  NEW.task_points := LEAST(GREATEST(COALESCE(NEW.task_points, 0), 0), v_max_category);
  NEW.social_points := LEAST(GREATEST(COALESCE(NEW.social_points, 0), 0), v_max_category);
  NEW.referral_points := LEAST(GREATEST(COALESCE(NEW.referral_points, 0), 0), v_max_category);
  NEW.game_points := LEAST(GREATEST(COALESCE(NEW.game_points, 0), 0), v_max_category);
  NEW.arena_points := LEAST(GREATEST(COALESCE(NEW.arena_points, 0), 0), v_max_category);

  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points
    + NEW.referral_points + NEW.game_points + NEW.arena_points;
  IF NEW.total_points > v_max_total THEN
    NEW.total_points := v_max_total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_user_points_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_points := GREATEST(0,
    COALESCE(NEW.mining_points, 0) + COALESCE(NEW.task_points, 0)
    + COALESCE(NEW.social_points, 0) + COALESCE(NEW.referral_points, 0)
    + COALESCE(NEW.game_points, 0) + COALESCE(NEW.arena_points, 0)
  );
  IF NEW.total_points > 1000000000 THEN
    NEW.total_points := 1000000000;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Fix Nexus transfer: debit sender buckets, credit receiver social ───────
CREATE OR REPLACE FUNCTION public.send_nexus_transfer(
  p_sender_id uuid,
  p_receiver_address text,
  p_amount numeric,
  p_hide_amount boolean DEFAULT false,
  p_hide_usernames boolean DEFAULT false,
  p_private_mode boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_receiver_id UUID;
  v_sender_address TEXT;
  v_sender_balance NUMERIC;
  v_daily_count INTEGER;
  v_transaction_id UUID;
  v_existing_transaction BOOLEAN;
BEGIN
  IF p_amount < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is 1 ARX-P');
  END IF;
  IF p_amount > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum transfer is 10 ARX-P');
  END IF;

  SELECT nexus_address INTO v_sender_address FROM profiles WHERE user_id = p_sender_id;
  IF v_sender_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender address not found');
  END IF;

  SELECT user_id INTO v_receiver_id FROM profiles WHERE nexus_address = p_receiver_address;
  IF v_receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient address not found');
  END IF;
  IF v_receiver_id = p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send to yourself');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM nexus_transactions
    WHERE (sender_id = p_sender_id AND receiver_id = v_receiver_id)
       OR (sender_id = v_receiver_id AND receiver_id = p_sender_id)
  ) INTO v_existing_transaction;
  IF v_existing_transaction THEN
    RETURN json_build_object('success', false, 'error', 'You have already transacted with this user. Find a new miner!');
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM nexus_transactions
  WHERE sender_id = p_sender_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  IF v_daily_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Daily transfer limit reached (5/5)');
  END IF;

  SELECT total_points INTO v_sender_balance FROM user_points WHERE user_id = p_sender_id FOR UPDATE;
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Debit real buckets (not total_points alone — normalize would undo that).
  PERFORM set_config('app.arena_stake', 'true', true);
  PERFORM public.deduct_user_points_for_arena(p_sender_id, p_amount);

  INSERT INTO user_points (user_id, social_points)
  VALUES (v_receiver_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET social_points = user_points.social_points + p_amount,
      updated_at = NOW();

  INSERT INTO nexus_transactions (
    sender_id, receiver_id, sender_address, receiver_address, amount,
    hide_amount, hide_usernames, private_mode, status
  ) VALUES (
    p_sender_id, v_receiver_id, v_sender_address, p_receiver_address, p_amount,
    p_hide_amount, p_hide_usernames, p_private_mode, 'completed'
  )
  RETURNING id INTO v_transaction_id;

  PERFORM public.log_points_ledger_entry(
    p_sender_id, -p_amount, 'nexus_send',
    'Sent ARX-P via Nexus (-' || p_amount || ' ARX-P)',
    'nexus_send', v_transaction_id
  );
  PERFORM public.log_points_ledger_entry(
    v_receiver_id, p_amount, 'nexus_receive',
    'Received ARX-P via Nexus (+' || p_amount || ' ARX-P)',
    'nexus_receive', v_transaction_id
  );

  -- Instant send bonus (product behavior): credit equal amount back to sender social.
  UPDATE user_points
  SET social_points = social_points + p_amount,
      updated_at = NOW()
  WHERE user_id = p_sender_id;

  PERFORM public.log_points_ledger_entry(
    p_sender_id, p_amount, 'nexus_bonus',
    'Nexus send bonus (+' || p_amount || ' ARX-P)',
    'nexus_boost', v_transaction_id
  );

  INSERT INTO nexus_boosts (user_id, transaction_id, boost_percentage, expires_at, claimed)
  VALUES (p_sender_id, v_transaction_id, 20, NOW() + INTERVAL '72 hours', true);

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'bonus_credited', p_amount,
    'message', 'Transfer successful! Bonus credited instantly.'
  );
END;
$$;

-- ── 3. Peak ledger restoration (integrity-cap clamp victims) ─────────────────
DO $$
DECLARE
  r RECORD;
  v_users INT := 0;
  v_total NUMERIC := 0;
  v_bucket TEXT;
  v_ref_type TEXT := 'cap_clamp_peak_restore_v1';
BEGIN
  FOR r IN
    WITH peaks AS (
      SELECT
        user_id,
        MAX(balance_after) AS peak_balance,
        (ARRAY_AGG(created_at ORDER BY balance_after DESC, created_at DESC))[1] AS peak_at
      FROM public.points_ledger
      WHERE balance_after IS NOT NULL
      GROUP BY user_id
    ),
    post AS (
      SELECT
        p.user_id,
        COALESCE(SUM(pl.amount), 0) AS net_after_peak
      FROM peaks p
      LEFT JOIN public.points_ledger pl
        ON pl.user_id = p.user_id
       AND pl.created_at > p.peak_at
      GROUP BY p.user_id
    )
    SELECT
      up.user_id,
      up.mining_points,
      up.task_points,
      up.social_points,
      up.total_points,
      p.peak_balance,
      COALESCE(post.net_after_peak, 0) AS net_after_peak,
      GREATEST(
        p.peak_balance + COALESCE(post.net_after_peak, 0) - up.total_points,
        0
      ) AS deficit
    FROM public.user_points up
    JOIN peaks p ON p.user_id = up.user_id
    LEFT JOIN post ON post.user_id = up.user_id
    WHERE p.peak_balance + COALESCE(post.net_after_peak, 0) > up.total_points + 1
    ORDER BY deficit DESC
  LOOP
    -- Idempotency: unique (user_id, category, reference_type, reference_id)
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

    IF r.mining_points >= 999999 THEN
      v_bucket := 'mining';
      UPDATE public.user_points
      SET mining_points = mining_points + r.deficit,
          updated_at = now()
      WHERE user_id = r.user_id;
    ELSIF r.social_points >= 999999 THEN
      v_bucket := 'social';
      UPDATE public.user_points
      SET social_points = social_points + r.deficit,
          updated_at = now()
      WHERE user_id = r.user_id;
    ELSE
      v_bucket := 'task';
      UPDATE public.user_points
      SET task_points = task_points + r.deficit,
          updated_at = now()
      WHERE user_id = r.user_id;
    END IF;

    INSERT INTO public.points_audit_log (
      user_id, audit_type,
      stored_mining_points, stored_task_points, stored_social_points,
      stored_referral_points, stored_total_points,
      computed_mining_points, computed_task_points, computed_social_points,
      computed_referral_points, computed_checkin_points, computed_total_points,
      mining_diff, task_diff, social_diff, referral_diff, total_diff,
      points_restored, action_taken, notes
    ) VALUES (
      r.user_id, 'cap_clamp_peak_restore_v1',
      r.mining_points,
      r.task_points,
      r.social_points,
      0,
      r.total_points,
      r.mining_points + CASE WHEN v_bucket = 'mining' THEN r.deficit ELSE 0 END,
      r.task_points + CASE WHEN v_bucket = 'task' THEN r.deficit ELSE 0 END,
      r.social_points + CASE WHEN v_bucket = 'social' THEN r.deficit ELSE 0 END,
      0, 0,
      r.total_points + r.deficit,
      CASE WHEN v_bucket = 'mining' THEN r.deficit ELSE 0 END,
      CASE WHEN v_bucket = 'task' THEN r.deficit ELSE 0 END,
      CASE WHEN v_bucket = 'social' THEN r.deficit ELSE 0 END,
      0,
      r.deficit,
      r.deficit,
      'restored',
      format(
        'Restored integrity-cap clamp deficit into %s. peak=%s net_after=%s',
        v_bucket, r.peak_balance, r.net_after_peak
      )
    );

    PERFORM public.log_points_ledger_entry(
      r.user_id,
      r.deficit,
      'points_restoration',
      format(
        'Restored points cut by integrity caps (+%s ARX-P into %s)',
        r.deficit, v_bucket
      ),
      v_ref_type,
      r.user_id
    );

    v_users := v_users + 1;
    v_total := v_total + r.deficit;
  END LOOP;

  RAISE NOTICE 'Peak cap-clamp restore: % users, % ARX-P', v_users, v_total;
END $$;

-- ── 4. Task/check-in/campaign earned-vs-stored restoration ───────────────────
DO $$
DECLARE
  r RECORD;
  v_users INT := 0;
  v_total NUMERIC := 0;
  v_ref_type TEXT := 'task_earned_restore_v1';
BEGIN
  FOR r IN
    SELECT
      up.user_id,
      up.mining_points,
      up.task_points,
      up.social_points,
      up.total_points,
      COALESCE(ut.s, 0) AS tasks,
      COALESCE(dc.s, 0) AS checkins,
      COALESCE(nuc.s, 0) AS campaign,
      COALESCE(ut.s, 0) + COALESCE(dc.s, 0) + COALESCE(nuc.s, 0) AS expected_task,
      GREATEST(
        COALESCE(ut.s, 0) + COALESCE(dc.s, 0) + COALESCE(nuc.s, 0) - up.task_points,
        0
      ) AS deficit
    FROM public.user_points up
    LEFT JOIN (
      SELECT user_id, SUM(points_awarded) AS s
      FROM public.user_tasks
      WHERE status = 'completed'
      GROUP BY user_id
    ) ut ON ut.user_id = up.user_id
    LEFT JOIN (
      SELECT user_id, SUM(points_awarded) AS s
      FROM public.daily_checkins
      GROUP BY user_id
    ) dc ON dc.user_id = up.user_id
    LEFT JOIN (
      SELECT user_id, days_claimed * 1000 AS s
      FROM public.new_user_campaign
    ) nuc ON nuc.user_id = up.user_id
    WHERE GREATEST(
      COALESCE(ut.s, 0) + COALESCE(dc.s, 0) + COALESCE(nuc.s, 0) - up.task_points,
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
    SET task_points = task_points + r.deficit,
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
      r.user_id, 'task_earned_restore_v1',
      r.mining_points, r.task_points, r.social_points, 0, r.total_points,
      r.mining_points, r.task_points + r.deficit, r.social_points,
      0, r.checkins, r.total_points + r.deficit,
      0, r.deficit, 0, 0, r.deficit,
      r.deficit, 'restored',
      format(
        'Restored task bucket to earned sources. tasks=%s checkins=%s campaign=%s',
        r.tasks, r.checkins, r.campaign
      )
    );

    PERFORM public.log_points_ledger_entry(
      r.user_id,
      r.deficit,
      'points_restoration',
      format('Restored under-credited task/check-in/campaign points (+%s ARX-P)', r.deficit),
      v_ref_type,
      r.user_id
    );

    v_users := v_users + 1;
    v_total := v_total + r.deficit;
  END LOOP;

  RAISE NOTICE 'Task earned restore: % users, % ARX-P', v_users, v_total;
END $$;
