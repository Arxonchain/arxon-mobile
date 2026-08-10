-- Audit Phase 0: shared critical security (whole-app + arena + dice infra)
-- Revoke public mint/drain RPCs, bind auth.uid(), harden RLS, arena resolve safety.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. increment_user_points: service_role only
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO postgres;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. deduct_user_points_for_arena: auth bind + revoke client EXECUTE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.deduct_user_points_for_arena(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_left NUMERIC := p_amount;
  m NUMERIC; t NUMERIC; s NUMERIC; r NUMERIC; g NUMERIC; a NUMERIC;
  take NUMERIC;
  v_caller UUID := auth.uid();
BEGIN
  -- Allow: service_role / definer wrappers with matching uid / admin
  IF v_caller IS NOT NULL
     AND v_caller IS DISTINCT FROM p_user_id
     AND NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: cannot deduct points for another user';
  END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid stake amount'; END IF;
  PERFORM set_config('app.arena_stake', 'true', true);

  SELECT mining_points, task_points, social_points, referral_points, game_points, COALESCE(arena_points, 0)
  INTO m, t, s, r, g, a
  FROM public.user_points WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points'; END IF;
  IF (m + t + s + r + g + a) < p_amount THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  take := LEAST(v_left, m); m := m - take; v_left := v_left - take;
  take := LEAST(v_left, t); t := t - take; v_left := v_left - take;
  take := LEAST(v_left, s); s := s - take; v_left := v_left - take;
  take := LEAST(v_left, r); r := r - take; v_left := v_left - take;
  take := LEAST(v_left, g); g := g - take; v_left := v_left - take;
  take := LEAST(v_left, a); a := a - take; v_left := v_left - take;
  IF v_left > 0 THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  UPDATE public.user_points SET
    mining_points = m, task_points = t, social_points = s,
    referral_points = r, game_points = g, arena_points = a,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) TO postgres;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. send_nexus_transfer: force sender = auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════
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
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_receiver_id UUID;
  v_sender_address TEXT;
  v_sender_balance NUMERIC;
  v_daily_count INTEGER;
  v_transaction_id UUID;
  v_existing_transaction BOOLEAN;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  -- Ignore client-supplied sender id
  IF p_sender_id IS DISTINCT FROM v_sender_id THEN
    -- tolerate mismatch by forcing auth uid (do not honor client)
    NULL;
  END IF;

  IF p_amount < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is 1 ARX-P');
  END IF;
  IF p_amount > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum transfer is 10 ARX-P');
  END IF;

  SELECT nexus_address INTO v_sender_address FROM profiles WHERE user_id = v_sender_id;
  IF v_sender_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender address not found');
  END IF;

  SELECT user_id INTO v_receiver_id FROM profiles WHERE nexus_address = p_receiver_address;
  IF v_receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient address not found');
  END IF;
  IF v_receiver_id = v_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send to yourself');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM nexus_transactions
    WHERE (sender_id = v_sender_id AND receiver_id = v_receiver_id)
       OR (sender_id = v_receiver_id AND receiver_id = v_sender_id)
  ) INTO v_existing_transaction;
  IF v_existing_transaction THEN
    RETURN json_build_object('success', false, 'error', 'You have already transacted with this user. Find a new miner!');
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM nexus_transactions
  WHERE sender_id = v_sender_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  IF v_daily_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Daily transfer limit reached (5/5)');
  END IF;

  SELECT total_points INTO v_sender_balance FROM user_points WHERE user_id = v_sender_id FOR UPDATE;
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  PERFORM set_config('app.arena_stake', 'true', true);
  PERFORM public.deduct_user_points_for_arena(v_sender_id, p_amount);

  INSERT INTO user_points (user_id, social_points)
  VALUES (v_receiver_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET social_points = user_points.social_points + p_amount,
      updated_at = NOW();

  INSERT INTO nexus_transactions (
    sender_id, receiver_id, sender_address, receiver_address, amount,
    hide_amount, hide_usernames, private_mode, status
  ) VALUES (
    v_sender_id, v_receiver_id, v_sender_address, p_receiver_address, p_amount,
    p_hide_amount, p_hide_usernames, p_private_mode, 'completed'
  )
  RETURNING id INTO v_transaction_id;

  PERFORM public.log_points_ledger_entry(
    v_sender_id, -p_amount, 'nexus_send',
    'Sent ARX-P via Nexus (-' || p_amount || ' ARX-P)',
    'nexus_send', v_transaction_id
  );
  PERFORM public.log_points_ledger_entry(
    v_receiver_id, p_amount, 'nexus_receive',
    'Received ARX-P via Nexus (+' || p_amount || ' ARX-P)',
    'nexus_receive', v_transaction_id
  );

  -- Boost only (no full social_points refund to sender — stops free mint farm)
  INSERT INTO nexus_boosts (user_id, transaction_id, boost_percentage, expires_at, claimed)
  VALUES (v_sender_id, v_transaction_id, 20, NOW() + INTERVAL '72 hours', true);

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'bonus_credited', 0,
    'boost_percentage', 20,
    'message', 'Transfer successful! +20% mining boost for 72h.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_nexus_transfer(uuid, text, numeric, boolean, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_nexus_transfer(uuid, text, numeric, boolean, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_nexus_transfer(uuid, text, numeric, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_nexus_transfer(uuid, text, numeric, boolean, boolean, boolean) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. perform_daily_checkin: auth.uid() only
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.perform_daily_checkin(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(success boolean, streak_day integer, points_awarded numeric, streak_boost integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
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
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0::numeric, 0, 'Not authenticated'::text;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.daily_checkins WHERE user_id = v_user_id AND checkin_date = v_today
  ) INTO v_already_checked;
  IF v_already_checked THEN
    RETURN QUERY SELECT false, 0, 0::numeric, 0, 'Already checked in today'::text;
    RETURN;
  END IF;

  SELECT last_checkin_date, daily_streak
  INTO v_last_checkin, v_current_streak
  FROM public.user_points WHERE user_id = v_user_id;

  IF v_last_checkin = v_yesterday THEN
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_streak_bonus := LEAST(v_new_streak, 30);
  v_total_points := v_base_points + v_streak_bonus;
  v_new_boost := LEAST(v_new_streak, 30);

  INSERT INTO public.daily_checkins (user_id, checkin_date, points_awarded, streak_day)
  VALUES (v_user_id, v_today, v_total_points, v_new_streak)
  RETURNING id INTO v_checkin_id;

  UPDATE public.user_points
  SET daily_streak = v_new_streak,
      last_checkin_date = v_today,
      task_points = task_points + v_total_points,
      updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, daily_streak, last_checkin_date, task_points)
    VALUES (v_user_id, v_new_streak, v_today, v_total_points);
  END IF;

  PERFORM public.log_points_ledger_entry(
    v_user_id, v_total_points, 'checkin',
    'Daily check-in (Day ' || v_new_streak || ', +' || v_total_points || ' ARX-P)',
    'daily_checkin', v_checkin_id
  );

  RETURN QUERY SELECT true, v_new_streak, v_total_points, v_new_boost,
    ('Checked in! Day ' || v_new_streak || ' streak')::text;
END;
$$;

REVOKE ALL ON FUNCTION public.perform_daily_checkin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perform_daily_checkin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.perform_daily_checkin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_daily_checkin(uuid) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. bulk_approve_referrals: admin only
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.bulk_approve_referrals(
  p_referral_code text,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = upper(trim(p_referral_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral code not found');
  END IF;

  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code_used, points_awarded)
    VALUES (v_referrer_id, v_user_id, upper(trim(p_referral_code)), 0)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.referral_recovery_log (referrer_id, referral_code, referred_count, admin_action)
  VALUES (v_referrer_id, upper(trim(p_referral_code)), v_count, 'approved');

  RETURN jsonb_build_object('success', true, 'credited_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_approve_referrals(text, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bulk_approve_referrals(text, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.bulk_approve_referrals(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_approve_referrals(text, uuid[]) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. log_points_ledger_entry: revoke client EXECUTE
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid, timestamptz) TO postgres;

-- Also revoke common overload without p_created_at if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'log_points_ledger_entry'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_amount numeric, p_category text, p_description text, p_reference_type text, p_reference_id uuid'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.log_points_ledger_entry(uuid, numeric, text, text, text, uuid) TO service_role, postgres';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS hardening: tasks, social_submissions, user_tasks, mining, nexus, x_profiles, arena_members
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admin full access to tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can update own submissions" ON public.social_submissions;
-- Users may only update proof fields while pending (cannot self-approve)
CREATE POLICY "Users can update own pending proof"
  ON public.social_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Protect social status via trigger (defense in depth)
CREATE OR REPLACE FUNCTION public.protect_social_submission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
      RETURN NEW;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded THEN
      RAISE EXCEPTION 'Cannot modify submission status or points';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_social_submission_status ON public.social_submissions;
CREATE TRIGGER trg_protect_social_submission_status
  BEFORE UPDATE ON public.social_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_social_submission_status();

-- user_tasks: protect credit columns
CREATE OR REPLACE FUNCTION public.protect_user_task_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF current_setting('app.allow_task_credit', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
     OR NEW.points_credited IS DISTINCT FROM OLD.points_credited
     OR NEW.points_credited_amount IS DISTINCT FROM OLD.points_credited_amount
     OR NEW.cap_topup_amount IS DISTINCT FROM OLD.cap_topup_amount
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Cannot modify task credit fields';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_user_task_credits ON public.user_tasks;
CREATE TRIGGER trg_protect_user_task_credits
  BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_task_credits();

-- mining_sessions: protect credited_at / arx_mined
CREATE OR REPLACE FUNCTION public.protect_mining_session_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF current_setting('app.allow_session_credit', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.credited_at IS DISTINCT FROM OLD.credited_at
     OR NEW.arx_mined IS DISTINCT FROM OLD.arx_mined THEN
    RAISE EXCEPTION 'Cannot modify mining credit fields';
  END IF;
  -- Allow ending sessions (is_active/ended_at) but not credit fields
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_mining_session_credits ON public.mining_sessions;
CREATE TRIGGER trg_protect_mining_session_credits
  BEFORE UPDATE ON public.mining_sessions
  FOR EACH ROW EXECUTE FUNCTION public.protect_mining_session_credits();

-- nexus_boosts: SELECT only for users
DROP POLICY IF EXISTS "Users can insert own boosts" ON public.nexus_boosts;
DROP POLICY IF EXISTS "Users can update own boosts" ON public.nexus_boosts;

-- x_profiles: protect boost fields
CREATE OR REPLACE FUNCTION public.protect_x_profile_boost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF current_setting('app.allow_x_boost', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.boost_percentage := COALESCE(NEW.boost_percentage, 0);
    IF NEW.boost_percentage <> 0 THEN
      NEW.boost_percentage := 0;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.boost_percentage IS DISTINCT FROM OLD.boost_percentage
     OR NEW.qualified_posts_today IS DISTINCT FROM OLD.qualified_posts_today
     OR NEW.viral_bonus IS DISTINCT FROM OLD.viral_bonus
     OR NEW.historical_boost_total IS DISTINCT FROM OLD.historical_boost_total THEN
    RAISE EXCEPTION 'Cannot modify X profile boost fields';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_x_profile_boost ON public.x_profiles;
CREATE TRIGGER trg_protect_x_profile_boost
  BEFORE INSERT OR UPDATE ON public.x_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_x_profile_boost();

-- arena_members: lock streak / wins UPDATE for users
DROP POLICY IF EXISTS "Users can update own membership" ON public.arena_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.arena_members;

CREATE OR REPLACE FUNCTION public.update_arena_member_profile(
  p_club text DEFAULT NULL,
  p_fingerprint_verified boolean DEFAULT NULL,
  p_fingerprint_hash text DEFAULT NULL
)
RETURNS public.arena_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user UUID := auth.uid();
  v_row public.arena_members%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.arena_members SET
    club = COALESCE(p_club, club),
    fingerprint_verified = COALESCE(p_fingerprint_verified, fingerprint_verified),
    fingerprint_hash = COALESCE(p_fingerprint_hash, fingerprint_hash)
  WHERE user_id = v_user
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Arena membership not found'; END IF;
  RETURN v_row;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.update_arena_member_profile(text, boolean, text) TO authenticated;
