-- Universal points ledger: every credit and debit visible in user history.
-- Backfills all historical activity for every user.

CREATE TABLE IF NOT EXISTS public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created
  ON public.points_ledger(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_dedupe
  ON public.points_ledger(user_id, category, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own points ledger" ON public.points_ledger;
CREATE POLICY "Users read own points ledger"
  ON public.points_ledger FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages points ledger" ON public.points_ledger;
CREATE POLICY "Service role manages points ledger"
  ON public.points_ledger FOR ALL
  USING (current_user = 'service_role' OR current_user = 'postgres');

-- ── Log helper ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_points_ledger_entry(
  p_user_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = p_user_id;

  INSERT INTO public.points_ledger (
    user_id, amount, balance_after, category, description,
    reference_type, reference_id, created_at
  ) VALUES (
    p_user_id, p_amount, v_balance, p_category, p_description,
    p_reference_type, p_reference_id, COALESCE(p_created_at, now())
  )
  ON CONFLICT (user_id, category, reference_type, reference_id)
  WHERE reference_id IS NOT NULL
  DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.log_points_ledger_entry(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_points_ledger_entry(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_points_ledger_entry(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) TO postgres;

-- ── increment_user_points with ledger logging ───────────────────────────────
DROP FUNCTION IF EXISTS public.increment_user_points(UUID, NUMERIC, TEXT);

CREATE FUNCTION public.increment_user_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
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
  v_desc TEXT;
BEGIN
  IF p_type = 'task' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_task);
  ELSE
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_mining_social);
  END IF;

  IF v_capped_amount <= 0 THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = p_user_id;
    RETURN v_result;
  END IF;

  IF p_type = 'mining' THEN
    UPDATE user_points SET
      mining_points = GREATEST(mining_points, LEAST(mining_points + v_capped_amount, v_max_category)),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points SET
      task_points = GREATEST(task_points, LEAST(task_points + v_capped_amount, v_max_category)),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points SET
      social_points = GREATEST(social_points, LEAST(social_points + v_capped_amount, v_max_category)),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points SET
      referral_points = GREATEST(referral_points, LEAST(referral_points + v_capped_amount, v_max_category)),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  v_desc := COALESCE(
    p_description,
    CASE p_type
      WHEN 'mining' THEN 'Mining reward'
      WHEN 'task' THEN 'Task reward'
      WHEN 'social' THEN 'Social reward'
      WHEN 'referral' THEN 'Referral reward'
      ELSE 'Points earned'
    END || ' (+' || v_capped_amount || ' ARX-P)'
  );

  PERFORM public.log_points_ledger_entry(
    p_user_id, v_capped_amount, p_type, v_desc, p_reference_type, p_reference_id
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT) TO postgres;

-- ── Arena stake deductions ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_arena_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_points
  SET total_points = total_points - NEW.power_spent,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  PERFORM public.log_points_ledger_entry(
    NEW.user_id,
    -NEW.power_spent,
    'arena_stake',
    'Arena battle stake (-' || NEW.power_spent || ' ARX-P)',
    'arena_vote',
    NEW.id
  );

  IF NEW.side = 'a' THEN
    UPDATE arena_battles
    SET side_a_power = side_a_power + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  ELSIF NEW.side = 'b' THEN
    UPDATE arena_battles
    SET side_b_power = side_b_power + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  ELSIF NEW.side = 'c' THEN
    UPDATE arena_battles
    SET side_c_power = COALESCE(side_c_power, 0) + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Daily check-in with ledger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.perform_daily_checkin(p_user_id uuid)
RETURNS TABLE(
  success boolean,
  streak_day integer,
  points_awarded numeric,
  streak_boost integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
  v_last_checkin date;
  v_current_streak integer := 0;
  v_new_streak integer := 1;
  v_base_points numeric := 5;
  v_streak_bonus numeric := 0;
  v_total_points numeric := 0;
  v_new_boost integer := 0;
  v_already_checked boolean := false;
  v_checkin_id UUID;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.daily_checkins
    WHERE user_id = p_user_id AND checkin_date = v_today
  ) INTO v_already_checked;

  IF v_already_checked THEN
    RETURN QUERY SELECT false, 0, 0::numeric, 0, 'Already checked in today'::text;
    RETURN;
  END IF;

  SELECT last_checkin_date, daily_streak
  INTO v_last_checkin, v_current_streak
  FROM public.user_points WHERE user_id = p_user_id;

  IF v_last_checkin = v_yesterday THEN
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_streak_bonus := LEAST(v_new_streak, 30);
  v_total_points := v_base_points + v_streak_bonus;
  v_new_boost := LEAST(v_new_streak, 30);

  INSERT INTO public.daily_checkins (user_id, checkin_date, points_awarded, streak_day)
  VALUES (p_user_id, v_today, v_total_points, v_new_streak)
  RETURNING id INTO v_checkin_id;

  UPDATE public.user_points
  SET daily_streak = v_new_streak,
      last_checkin_date = v_today,
      task_points = task_points + v_total_points,
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, daily_streak, last_checkin_date, task_points)
    VALUES (p_user_id, v_new_streak, v_today, v_total_points);
  END IF;

  PERFORM public.log_points_ledger_entry(
    p_user_id, v_total_points, 'checkin',
    'Daily check-in (Day ' || v_new_streak || ', +' || v_total_points || ' ARX-P)',
    'daily_checkin', v_checkin_id
  );

  RETURN QUERY SELECT true, v_new_streak, v_total_points, v_new_boost,
    ('Checked in! Day ' || v_new_streak || ' streak')::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_daily_checkin(uuid) TO authenticated;

-- ── complete_task passes task reference to increment ─────────────────────────
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
  v_task_title TEXT;
  v_to_credit NUMERIC;
  v_already_credited NUMERIC;
  v_existing public.user_tasks%ROWTYPE;
  v_has_existing BOOLEAN := false;
  v_result public.user_points%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT LEAST(GREATEST(CEIL(points_reward), 0), 10000), title
  INTO v_task_reward, v_task_title
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

  SELECT * INTO v_result FROM public.increment_user_points(
    v_user_id, v_to_credit, 'task', 'user_task', p_task_id,
    COALESCE(v_task_title, 'Task') || ' (+' || v_to_credit || ' ARX-P)'
  );

  IF NOT FOUND OR v_result IS NULL THEN
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

-- ── Backfill historical ledger for ALL users ────────────────────────────────
INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, arx_mined, 'mining', 'Mining session (+' || arx_mined || ' ARX-P)', 'mining_session', id, COALESCE(credited_at, ended_at, started_at)
FROM public.mining_sessions
WHERE is_active = false AND COALESCE(arx_mined, 0) > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT ut.user_id, ut.points_awarded, 'task', t.title || ' (+' || ut.points_awarded || ' ARX-P)', 'user_task', ut.id, ut.completed_at
FROM public.user_tasks ut
JOIN public.tasks t ON t.id = ut.task_id
WHERE ut.status = 'completed' AND ut.points_awarded > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, points_awarded, 'checkin', 'Daily check-in (+' || points_awarded || ' ARX-P)', 'daily_checkin', id, checkin_date::timestamptz
FROM public.daily_checkins
WHERE points_awarded > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, points_awarded, 'social', 'Social post approved (+' || points_awarded || ' ARX-P)', 'social_submission', id, COALESCE(reviewed_at, created_at)
FROM public.social_submissions
WHERE status = 'approved' AND points_awarded > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT referrer_id, COALESCE(points_awarded, 100), 'referral', 'Referral bonus (+' || COALESCE(points_awarded, 100) || ' ARX-P)', 'referral', id, created_at
FROM public.referrals
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, -power_spent, 'arena_stake', 'Arena battle stake (-' || power_spent || ' ARX-P)', 'arena_vote', id, created_at
FROM public.arena_votes
WHERE power_spent > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT sender_id, -amount, 'nexus_send', 'Sent ARX-P via Nexus (-' || amount || ' ARX-P)', 'nexus_send', id, created_at
FROM public.nexus_transactions
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT receiver_id, amount, 'nexus_receive', 'Received ARX-P via Nexus (+' || amount || ' ARX-P)', 'nexus_receive', id, created_at
FROM public.nexus_transactions
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, cap_topup_amount, 'restoration', 'Restored underpaid task reward (+' || cap_topup_amount || ' ARX-P)', 'task_topup', id, COALESCE(completed_at, now())
FROM public.user_tasks
WHERE cap_topup_amount > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, points_restored, 'restoration', 'Balance restored: ' || audit_type || ' (+' || points_restored || ' ARX-P)', 'points_audit', id, created_at
FROM public.points_audit_log
WHERE points_restored > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

INSERT INTO public.points_ledger (user_id, amount, category, description, reference_type, reference_id, created_at)
SELECT user_id, total_earned, 'arena_reward', 'Arena battle winnings (+' || total_earned || ' ARX-P)', 'arena_earning', id, created_at
FROM public.arena_earnings
WHERE total_earned > 0
ON CONFLICT (user_id, category, reference_type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

-- ── Nexus transfers log send, receive, and bonus ─────────────────────────────
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
AS $function$
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

  SELECT total_points INTO v_sender_balance FROM user_points WHERE user_id = p_sender_id;
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE user_points
  SET total_points = total_points - p_amount, updated_at = NOW()
  WHERE user_id = p_sender_id;

  INSERT INTO user_points (user_id, total_points)
  VALUES (v_receiver_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_points.total_points + p_amount, updated_at = NOW();

  INSERT INTO nexus_transactions (
    sender_id, receiver_id, sender_address, receiver_address,
    amount, hide_amount, hide_usernames, private_mode, status
  )
  VALUES (
    p_sender_id, v_receiver_id, v_sender_address, p_receiver_address,
    p_amount, p_hide_amount, p_hide_usernames, p_private_mode, 'completed'
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

  INSERT INTO nexus_boosts (user_id, transaction_id, boost_percentage, expires_at, claimed)
  VALUES (p_sender_id, v_transaction_id, 20, NOW() + INTERVAL '72 hours', true);

  UPDATE user_points
  SET total_points = total_points + p_amount,
      social_points = social_points + p_amount,
      updated_at = NOW()
  WHERE user_id = p_sender_id;

  PERFORM public.log_points_ledger_entry(
    p_sender_id, p_amount, 'nexus_bonus',
    'Nexus send bonus (+' || p_amount || ' ARX-P)',
    'nexus_boost', v_transaction_id
  );

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'bonus_credited', p_amount,
    'message', 'Transfer successful! Bonus credited instantly.'
  );
END;
$function$;

-- Enable realtime for live history updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'points_ledger'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.points_ledger;
  END IF;
END $$;
