-- Dice Phase 2: active-match expiry/refund, leave lobby, invite uniqueness, size 8, one open seat

-- ── Invite code: uniqueness against ALL rows ────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_dice_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_i INTEGER;
BEGIN
  FOR v_i IN 1..20 LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || v_i::text), 1, 6));
    IF NOT EXISTS (SELECT 1 FROM public.dice_matches WHERE invite_code = v_code) THEN
      RETURN v_code;
    END IF;
  END LOOP;
  RETURN upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
END;
$$;

-- ── Helper: one open/active participation per user ───────────────────────────
CREATE OR REPLACE FUNCTION public.user_has_open_dice_participation(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dice_matches m
    WHERE m.status IN ('open', 'active')
      AND (
        m.created_by = p_user
        OR EXISTS (
          SELECT 1 FROM public.dice_match_players p
          WHERE p.match_id = m.id AND p.user_id = p_user
        )
      )
  );
$$;

-- ── Leave rumble lobby (joiner self-refund while open) ───────────────────────
CREATE OR REPLACE FUNCTION public.leave_dice_rumble_lobby(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_player public.dice_match_players%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Lobby not found'); END IF;
  IF v_match.mode != 'rumble' OR v_match.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only leave an open rumble lobby');
  END IF;
  IF v_match.created_by = v_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'Host must cancel the lobby instead');
  END IF;

  SELECT * INTO v_player FROM public.dice_match_players
  WHERE match_id = p_match_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'You are not in this lobby'); END IF;

  DELETE FROM public.dice_match_players WHERE id = v_player.id;

  UPDATE public.user_points
  SET game_points = game_points + v_match.stake, updated_at = now()
  WHERE user_id = v_user;

  PERFORM public.log_points_ledger_entry(
    v_user, v_match.stake, 'dice_refund',
    'Dice Rumble: left lobby, refunded ' || v_match.stake || ' ARX-P',
    'dice_match', p_match_id
  );

  RETURN jsonb_build_object('success', true, 'refunded', v_match.stake);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_dice_rumble_lobby(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_dice_rumble_lobby(UUID) TO authenticated;

-- ── Patch create rumble to allow size 8 + one participation ─────────────────
CREATE OR REPLACE FUNCTION public.create_dice_rumble_lobby(p_stake INTEGER, p_max_players INTEGER DEFAULT 4)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_match_id UUID;
  v_code TEXT;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_stake NOT IN (10, 25, 50, 100, 250, 500) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;
  IF p_max_players NOT IN (3, 4, 5, 6, 8) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid lobby size');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;

  IF public.user_has_open_dice_participation(v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open or active dice match');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);
  v_code := public.generate_dice_invite_code();

  INSERT INTO public.dice_matches (mode, status, stake, pot, max_players, created_by, expires_at, invite_code)
  VALUES ('rumble', 'open', p_stake, p_stake, p_max_players, v_user, now() + interval '15 minutes', v_code)
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot)
  VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Rumble: staked ' || p_stake || ' ARX-P',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object('success', true, 'match_id', v_match_id, 'invite_code', v_code, 'expires_at', now() + interval '15 minutes');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_dice_rumble_lobby(INTEGER, INTEGER) TO authenticated;

-- ── Join rumble: respect expires_at + one participation ─────────────────────
CREATE OR REPLACE FUNCTION public.join_dice_rumble_lobby(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_balance NUMERIC;
  v_seat_count INTEGER;
  v_pot INTEGER;
  v_rake INTEGER;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Lobby not found'); END IF;
  IF v_match.mode != 'rumble' OR v_match.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is no longer open');
  END IF;
  IF v_match.expires_at IS NOT NULL AND v_match.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby expired');
  END IF;
  IF EXISTS (SELECT 1 FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already joined this lobby');
  END IF;
  IF public.user_has_open_dice_participation(v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open or active dice match');
  END IF;

  SELECT COUNT(*) INTO v_seat_count FROM public.dice_match_players WHERE match_id = p_match_id;
  IF v_seat_count >= v_match.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is full');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_match.stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, v_match.stake);
  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (p_match_id, v_user, v_seat_count + 1, false);
  PERFORM public.log_points_ledger_entry(
    v_user, -v_match.stake, 'dice_stake',
    'Dice Rumble: staked ' || v_match.stake || ' ARX-P',
    'dice_match', p_match_id
  );

  v_seat_count := v_seat_count + 1;
  IF v_seat_count >= v_match.max_players THEN
    v_pot := v_match.stake * v_seat_count;
    v_rake := ROUND(v_pot * 0.05);
    UPDATE public.dice_matches SET status = 'active', started_at = now(), pot = v_pot, rake = v_rake, current_round = 1 WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'players_joined', v_seat_count, 'started', v_seat_count >= v_match.max_players);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_dice_rumble_lobby(UUID) TO authenticated;

-- ── Start rumble: respect expires_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_dice_rumble_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_seat_count INTEGER;
  v_pot INTEGER;
  v_rake INTEGER;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Lobby not found'); END IF;
  IF v_match.created_by IS DISTINCT FROM v_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can start');
  END IF;
  IF v_match.mode != 'rumble' OR v_match.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is not open');
  END IF;
  IF v_match.expires_at IS NOT NULL AND v_match.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby expired');
  END IF;

  SELECT COUNT(*) INTO v_seat_count FROM public.dice_match_players WHERE match_id = p_match_id;
  IF v_seat_count < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 3 players to start');
  END IF;

  v_pot := v_match.stake * v_seat_count;
  v_rake := ROUND(v_pot * 0.05);
  UPDATE public.dice_matches
  SET status = 'active', started_at = now(), pot = v_pot, rake = v_rake, current_round = 1
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'players', v_seat_count, 'pot', v_pot);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_dice_rumble_match(UUID) TO authenticated;

-- ── Expire open AND stale active matches (refund) ───────────────────────────
CREATE OR REPLACE FUNCTION public.expire_open_dice_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_player RECORD;
  v_count INTEGER := 0;
  v_active_count INTEGER := 0;
  v_die1 INT; v_die2 INT;
  v_round INT;
BEGIN
  -- 1) Open lobbies past expires_at
  FOR v_match IN
    SELECT * FROM public.dice_matches
    WHERE status = 'open' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR v_player IN
      SELECT user_id FROM public.dice_match_players
      WHERE match_id = v_match.id AND user_id IS NOT NULL
    LOOP
      UPDATE public.user_points
      SET game_points = game_points + v_match.stake, updated_at = now()
      WHERE user_id = v_player.user_id;
      PERFORM public.log_points_ledger_entry(
        v_player.user_id, v_match.stake, 'dice_refund',
        'Dice ' || initcap(v_match.mode) || ': lobby expired, refunded ' || v_match.stake || ' ARX-P',
        'dice_match', v_match.id
      );
    END LOOP;
    UPDATE public.dice_matches SET status = 'expired', completed_at = now() WHERE id = v_match.id;
    v_count := v_count + 1;
  END LOOP;

  -- 2) Active matches: auto-roll missing players if round idle > 3 minutes
  FOR v_match IN
    SELECT * FROM public.dice_matches
    WHERE status = 'active'
      AND COALESCE(started_at, created_at) < now() - interval '3 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    v_round := COALESCE(v_match.current_round, 1);

    -- If any roll in this round is older than 3 min OR no rolls and started > 3 min ago
    IF EXISTS (
      SELECT 1 FROM public.dice_rolls
      WHERE match_id = v_match.id AND round = v_round AND rolled_at > now() - interval '3 minutes'
    ) AND EXISTS (
      SELECT 1 FROM public.dice_rolls WHERE match_id = v_match.id AND round = v_round
    ) THEN
      CONTINUE; -- recent activity in this round
    END IF;

    -- Auto-roll for alive players missing a roll this round
    FOR v_player IN
      SELECT p.user_id
      FROM public.dice_match_players p
      WHERE p.match_id = v_match.id
        AND p.user_id IS NOT NULL
        AND p.eliminated_round IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.dice_rolls r
          WHERE r.match_id = v_match.id AND r.round = v_round AND r.user_id = p.user_id
        )
    LOOP
      v_die1 := 1 + (get_byte(gen_random_bytes(1), 0) % 6);
      v_die2 := 1 + (get_byte(gen_random_bytes(1), 0) % 6);
      INSERT INTO public.dice_rolls (match_id, round, user_id, die1, die2, total, auto_rolled)
      VALUES (v_match.id, v_round, v_player.user_id, v_die1, v_die2, v_die1 + v_die2, true);
    END LOOP;
  END LOOP;

  -- 3) Active matches stuck > 30 minutes: full refund and expire
  FOR v_match IN
    SELECT * FROM public.dice_matches
    WHERE status = 'active'
      AND COALESCE(started_at, created_at) < now() - interval '30 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR v_player IN
      SELECT user_id FROM public.dice_match_players
      WHERE match_id = v_match.id AND user_id IS NOT NULL
    LOOP
      UPDATE public.user_points
      SET game_points = game_points + v_match.stake, updated_at = now()
      WHERE user_id = v_player.user_id;
      PERFORM public.log_points_ledger_entry(
        v_player.user_id, v_match.stake, 'dice_refund',
        'Dice ' || initcap(v_match.mode) || ': stale active match refunded ' || v_match.stake || ' ARX-P',
        'dice_match', v_match.id
      );
    END LOOP;
    UPDATE public.dice_matches
    SET status = 'expired', completed_at = now(), winner_id = NULL
    WHERE id = v_match.id;
    v_active_count := v_active_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_open', v_count, 'expired_active', v_active_count);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_open_dice_matches() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_open_dice_matches() FROM anon;
-- Cron/service only preferred; keep authenticated for existing client poll but harmless
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO service_role;

-- Also enforce one open participation on duel create/join if those functions exist
DO $$
BEGIN
  -- Patch create_dice_duel_match participation check via recreate thin wrapper not needed;
  -- join duel already checks expiry. Add participation gate on duel create:
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.create_dice_duel_match(p_stake INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_match_id UUID;
  v_code TEXT;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_stake NOT IN (10, 25, 50, 100, 250, 500) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;

  IF public.user_has_open_dice_participation(v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open or active dice match');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);
  v_code := public.generate_dice_invite_code();

  INSERT INTO public.dice_matches (mode, status, stake, pot, max_players, rounds_target, created_by, expires_at, invite_code)
  VALUES ('duel', 'open', p_stake, p_stake, 2, 1, v_user, now() + interval '15 minutes', v_code)
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Duel: staked ' || p_stake || ' ARX-P',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object('success', true, 'match_id', v_match_id, 'invite_code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_dice_duel_match(INTEGER) TO authenticated;
