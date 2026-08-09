-- Dice Roll Phase 2: 1v1 Duel (PvP escrow) + Rumble (multiplayer elimination)

-- ── Realtime for live lobby/match sync ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dice_matches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_matches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dice_match_players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_match_players;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dice_rolls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_rolls;
  END IF;
END $$;

-- ── Duel: create open challenge ──────────────────────────────────────────────
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
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_stake NOT IN (10, 25, 50, 100, 250, 500) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.dice_matches WHERE created_by = v_user AND mode = 'duel' AND status = 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open challenge. Cancel it first.');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);

  INSERT INTO public.dice_matches (mode, status, stake, pot, rake, max_players, rounds_target, created_by, expires_at)
  VALUES ('duel', 'open', p_stake, p_stake * 2, ROUND(p_stake * 2 * 0.05), 2, 2, v_user, now() + interval '30 minutes')
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Duel: staked ' || p_stake || ' ARX-P (open challenge)',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object('success', true, 'match_id', v_match_id, 'stake', p_stake, 'pot', p_stake * 2);
END;
$$;

REVOKE ALL ON FUNCTION public.create_dice_duel_match(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dice_duel_match(INTEGER) TO authenticated;

-- ── Duel: join open challenge ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_dice_duel_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  IF v_match.mode != 'duel' OR v_match.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is no longer open');
  END IF;
  IF v_match.created_by = v_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot join your own challenge');
  END IF;
  IF v_match.expires_at < now() THEN
    UPDATE public.user_points SET game_points = game_points + v_match.stake, updated_at = now() WHERE user_id = v_match.created_by;
    PERFORM public.log_points_ledger_entry(v_match.created_by, v_match.stake, 'dice_refund', 'Dice Duel: challenge expired, refunded ' || v_match.stake || ' ARX-P', 'dice_match', p_match_id);
    UPDATE public.dice_matches SET status = 'expired', completed_at = now() WHERE id = p_match_id;
    RETURN jsonb_build_object('success', false, 'error', 'This challenge has expired');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_match.stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, v_match.stake);

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (p_match_id, v_user, 2, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -v_match.stake, 'dice_stake',
    'Dice Duel: staked ' || v_match.stake || ' ARX-P vs miner',
    'dice_match', p_match_id
  );

  UPDATE public.dice_matches SET status = 'active', started_at = now() WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id);
END;
$$;

REVOKE ALL ON FUNCTION public.join_dice_duel_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_dice_duel_match(UUID) TO authenticated;

-- ── Duel: cancel open challenge (creator only, before anyone joins) ─────────
CREATE OR REPLACE FUNCTION public.cancel_dice_duel_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  IF v_match.created_by != v_user THEN RETURN jsonb_build_object('success', false, 'error', 'Not your challenge'); END IF;
  IF v_match.status != 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge is no longer open'); END IF;

  UPDATE public.user_points SET game_points = game_points + v_match.stake, updated_at = now() WHERE user_id = v_user;
  PERFORM public.log_points_ledger_entry(v_user, v_match.stake, 'dice_refund', 'Dice Duel: challenge cancelled, refunded ' || v_match.stake || ' ARX-P', 'dice_match', p_match_id);
  UPDATE public.dice_matches SET status = 'cancelled', completed_at = now() WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_dice_duel_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_dice_duel_match(UUID) TO authenticated;

-- ── Duel: roll for the current round (caller only rolls their own dice) ─────
CREATE OR REPLACE FUNCTION public.roll_dice_duel(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_opp_user UUID;
  v_already_rolled BOOLEAN;
  v_my_d1 SMALLINT; v_my_d2 SMALLINT; v_my_total SMALLINT;
  v_opp_roll public.dice_rolls%ROWTYPE;
  v_result TEXT;
  v_payout INTEGER;
  v_balance NUMERIC;
  v_my_wins SMALLINT; v_opp_wins SMALLINT;
  v_match_complete BOOLEAN := false;
  v_i_won BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Match not found'); END IF;
  IF v_match.mode != 'duel' OR v_match.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match is not active');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a player in this match');
  END IF;

  SELECT user_id INTO v_opp_user FROM public.dice_match_players WHERE match_id = p_match_id AND user_id != v_user;

  SELECT EXISTS(
    SELECT 1 FROM public.dice_rolls WHERE match_id = p_match_id AND round = v_match.current_round AND user_id = v_user
  ) INTO v_already_rolled;

  IF NOT v_already_rolled THEN
    v_my_d1 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_my_d2 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    INSERT INTO public.dice_rolls (match_id, round, user_id, die1, die2) VALUES (p_match_id, v_match.current_round, v_user, v_my_d1, v_my_d2);
  ELSE
    SELECT die1, die2 INTO v_my_d1, v_my_d2 FROM public.dice_rolls WHERE match_id = p_match_id AND round = v_match.current_round AND user_id = v_user;
  END IF;
  v_my_total := v_my_d1 + v_my_d2;

  SELECT * INTO v_opp_roll FROM public.dice_rolls WHERE match_id = p_match_id AND round = v_match.current_round AND user_id = v_opp_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'waiting', true, 'my_die1', v_my_d1, 'my_die2', v_my_d2, 'my_total', v_my_total, 'round', v_match.current_round);
  END IF;

  IF v_my_total > (v_opp_roll.die1 + v_opp_roll.die2) THEN
    v_result := 'me';
    UPDATE public.dice_match_players SET rounds_won = rounds_won + 1 WHERE match_id = p_match_id AND user_id = v_user;
  ELSIF (v_opp_roll.die1 + v_opp_roll.die2) > v_my_total THEN
    v_result := 'opponent';
    UPDATE public.dice_match_players SET rounds_won = rounds_won + 1 WHERE match_id = p_match_id AND user_id = v_opp_user;
  ELSE
    v_result := 'tie';
  END IF;

  SELECT rounds_won INTO v_my_wins FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_user;
  SELECT rounds_won INTO v_opp_wins FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_opp_user;

  IF v_my_wins >= v_match.rounds_target THEN
    v_payout := v_match.pot - v_match.rake;
    UPDATE public.user_points SET game_points = game_points + v_payout, updated_at = now() WHERE user_id = v_user;
    PERFORM public.log_points_ledger_entry(v_user, v_payout, 'dice_win', 'Dice Duel: won ' || v_payout || ' ARX-P', 'dice_match', p_match_id);
    UPDATE public.dice_matches SET status = 'complete', winner_id = v_user, completed_at = now() WHERE id = p_match_id;
    v_match_complete := true; v_i_won := true;
  ELSIF v_opp_wins >= v_match.rounds_target THEN
    v_payout := v_match.pot - v_match.rake;
    UPDATE public.user_points SET game_points = game_points + v_payout, updated_at = now() WHERE user_id = v_opp_user;
    PERFORM public.log_points_ledger_entry(v_opp_user, v_payout, 'dice_win', 'Dice Duel: won ' || v_payout || ' ARX-P', 'dice_match', p_match_id);
    UPDATE public.dice_matches SET status = 'complete', winner_id = v_opp_user, completed_at = now() WHERE id = p_match_id;
    v_match_complete := true;
  ELSE
    UPDATE public.dice_matches SET current_round = current_round + 1 WHERE id = p_match_id;
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'success', true, 'waiting', false,
    'my_die1', v_my_d1, 'my_die2', v_my_d2, 'my_total', v_my_total,
    'opp_die1', v_opp_roll.die1, 'opp_die2', v_opp_roll.die2, 'opp_total', v_opp_roll.die1 + v_opp_roll.die2,
    'result', v_result, 'round', v_match.current_round,
    'my_rounds_won', v_my_wins, 'opp_rounds_won', v_opp_wins,
    'match_complete', v_match_complete, 'i_won', v_i_won,
    'balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.roll_dice_duel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.roll_dice_duel(UUID) TO authenticated;

-- ── Rumble: create open lobby ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_dice_rumble_lobby(p_stake INTEGER, p_max_players INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_match_id UUID;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_stake NOT IN (10, 25, 50, 100, 250, 500) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;
  IF p_max_players < 3 OR p_max_players > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby size must be between 3 and 8 players');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.dice_matches WHERE created_by = v_user AND mode = 'rumble' AND status = 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open lobby. Cancel it first.');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);

  INSERT INTO public.dice_matches (mode, status, stake, pot, rake, max_players, rounds_target, created_by, expires_at)
  VALUES ('rumble', 'open', p_stake, p_stake, 0, p_max_players, 1, v_user, now() + interval '30 minutes')
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Rumble: staked ' || p_stake || ' ARX-P (lobby open)',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object('success', true, 'match_id', v_match_id, 'stake', p_stake, 'max_players', p_max_players);
END;
$$;

REVOKE ALL ON FUNCTION public.create_dice_rumble_lobby(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dice_rumble_lobby(INTEGER, INTEGER) TO authenticated;

-- ── Rumble: join open lobby (auto-starts when full) ──────────────────────────
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
  IF EXISTS (SELECT 1 FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already joined this lobby');
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

REVOKE ALL ON FUNCTION public.join_dice_rumble_lobby(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_dice_rumble_lobby(UUID) TO authenticated;

-- ── Rumble: creator starts early (min 3 players) ─────────────────────────────
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
  IF v_match.created_by != v_user THEN RETURN jsonb_build_object('success', false, 'error', 'Only the host can start the match'); END IF;
  IF v_match.mode != 'rumble' OR v_match.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is no longer open');
  END IF;

  SELECT COUNT(*) INTO v_seat_count FROM public.dice_match_players WHERE match_id = p_match_id;
  IF v_seat_count < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Need at least 3 players to start');
  END IF;

  v_pot := v_match.stake * v_seat_count;
  v_rake := ROUND(v_pot * 0.05);
  UPDATE public.dice_matches SET status = 'active', started_at = now(), pot = v_pot, rake = v_rake, current_round = 1 WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'players_joined', v_seat_count);
END;
$$;

REVOKE ALL ON FUNCTION public.start_dice_rumble_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_dice_rumble_match(UUID) TO authenticated;

-- ── Rumble: cancel open lobby (creator only, refunds everyone joined) ────────
CREATE OR REPLACE FUNCTION public.cancel_dice_rumble_lobby(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_player RECORD;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Lobby not found'); END IF;
  IF v_match.created_by != v_user THEN RETURN jsonb_build_object('success', false, 'error', 'Only the host can cancel'); END IF;
  IF v_match.status != 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'Lobby is no longer open'); END IF;

  FOR v_player IN SELECT user_id FROM public.dice_match_players WHERE match_id = p_match_id AND user_id IS NOT NULL LOOP
    UPDATE public.user_points SET game_points = game_points + v_match.stake, updated_at = now() WHERE user_id = v_player.user_id;
    PERFORM public.log_points_ledger_entry(v_player.user_id, v_match.stake, 'dice_refund', 'Dice Rumble: lobby cancelled, refunded ' || v_match.stake || ' ARX-P', 'dice_match', p_match_id);
  END LOOP;

  UPDATE public.dice_matches SET status = 'cancelled', completed_at = now() WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_dice_rumble_lobby(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_dice_rumble_lobby(UUID) TO authenticated;

-- ── Rumble: roll for the current round (elimination) ─────────────────────────
CREATE OR REPLACE FUNCTION public.roll_dice_rumble(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_already_rolled BOOLEAN;
  v_my_d1 SMALLINT; v_my_d2 SMALLINT;
  v_alive_count INTEGER;
  v_rolled_count INTEGER;
  v_min_total SMALLINT;
  v_eliminated JSONB := '[]'::jsonb;
  v_rolls JSONB := '[]'::jsonb;
  v_alive_after INTEGER;
  v_winner UUID;
  v_payout INTEGER;
  v_balance NUMERIC;
  v_match_complete BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_match FROM public.dice_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Match not found'); END IF;
  IF v_match.mode != 'rumble' OR v_match.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match is not active');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dice_match_players WHERE match_id = p_match_id AND user_id = v_user AND eliminated_round IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are eliminated or not in this match');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.dice_rolls WHERE match_id = p_match_id AND round = v_match.current_round AND user_id = v_user
  ) INTO v_already_rolled;

  IF NOT v_already_rolled THEN
    v_my_d1 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_my_d2 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    INSERT INTO public.dice_rolls (match_id, round, user_id, die1, die2) VALUES (p_match_id, v_match.current_round, v_user, v_my_d1, v_my_d2);
  ELSE
    SELECT die1, die2 INTO v_my_d1, v_my_d2 FROM public.dice_rolls WHERE match_id = p_match_id AND round = v_match.current_round AND user_id = v_user;
  END IF;

  SELECT COUNT(*) INTO v_alive_count FROM public.dice_match_players WHERE match_id = p_match_id AND eliminated_round IS NULL;
  SELECT COUNT(*) INTO v_rolled_count
  FROM public.dice_rolls r
  JOIN public.dice_match_players p ON p.match_id = r.match_id AND p.user_id = r.user_id AND p.eliminated_round IS NULL
  WHERE r.match_id = p_match_id AND r.round = v_match.current_round;

  IF v_rolled_count < v_alive_count THEN
    RETURN jsonb_build_object(
      'success', true, 'waiting', true, 'my_die1', v_my_d1, 'my_die2', v_my_d2, 'my_total', v_my_d1 + v_my_d2,
      'round', v_match.current_round, 'rolled_count', v_rolled_count, 'alive_count', v_alive_count
    );
  END IF;

  SELECT MIN(r.die1 + r.die2) INTO v_min_total
  FROM public.dice_rolls r
  JOIN public.dice_match_players p ON p.match_id = r.match_id AND p.user_id = r.user_id AND p.eliminated_round IS NULL
  WHERE r.match_id = p_match_id AND r.round = v_match.current_round;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', r.user_id, 'die1', r.die1, 'die2', r.die2, 'total', r.die1 + r.die2,
    'eliminated', (r.die1 + r.die2) = v_min_total
  )), '[]'::jsonb) INTO v_rolls
  FROM public.dice_rolls r
  JOIN public.dice_match_players p ON p.match_id = r.match_id AND p.user_id = r.user_id AND p.eliminated_round IS NULL
  WHERE r.match_id = p_match_id AND r.round = v_match.current_round;

  SELECT (
    SELECT COUNT(*) FROM public.dice_rolls r WHERE r.match_id = p_match_id AND r.round = v_match.current_round AND (r.die1 + r.die2) = v_min_total
  ) INTO v_rolled_count;

  IF v_rolled_count >= v_alive_count THEN
    -- everyone tied at the minimum this round: no elimination, reroll next round
    UPDATE public.dice_matches SET current_round = current_round + 1 WHERE id = p_match_id;
    v_eliminated := '[]'::jsonb;
    v_alive_after := v_alive_count;
  ELSE
    UPDATE public.dice_match_players SET eliminated_round = v_match.current_round
    WHERE match_id = p_match_id AND eliminated_round IS NULL
      AND user_id IN (
        SELECT r.user_id FROM public.dice_rolls r WHERE r.match_id = p_match_id AND r.round = v_match.current_round AND (r.die1 + r.die2) = v_min_total
      );

    SELECT COALESCE(jsonb_agg(user_id), '[]'::jsonb) INTO v_eliminated
    FROM public.dice_match_players WHERE match_id = p_match_id AND eliminated_round = v_match.current_round;

    SELECT COUNT(*) INTO v_alive_after FROM public.dice_match_players WHERE match_id = p_match_id AND eliminated_round IS NULL;

    IF v_alive_after <= 1 THEN
      SELECT user_id INTO v_winner FROM public.dice_match_players WHERE match_id = p_match_id AND eliminated_round IS NULL LIMIT 1;
      v_payout := v_match.pot - v_match.rake;
      IF v_winner IS NOT NULL THEN
        UPDATE public.user_points SET game_points = game_points + v_payout, updated_at = now() WHERE user_id = v_winner;
        PERFORM public.log_points_ledger_entry(v_winner, v_payout, 'dice_win', 'Dice Rumble: won ' || v_payout || ' ARX-P', 'dice_match', p_match_id);
      END IF;
      UPDATE public.dice_matches SET status = 'complete', winner_id = v_winner, completed_at = now() WHERE id = p_match_id;
      v_match_complete := true;
    ELSE
      UPDATE public.dice_matches SET current_round = current_round + 1 WHERE id = p_match_id;
    END IF;
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'success', true, 'waiting', false, 'round', v_match.current_round,
    'rolls', v_rolls, 'eliminated', v_eliminated, 'alive_after', v_alive_after,
    'match_complete', v_match_complete, 'winner_id', v_winner, 'i_won', (v_winner = v_user),
    'payout', v_payout, 'balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.roll_dice_rumble(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.roll_dice_rumble(UUID) TO authenticated;
