-- Dice Roll: schema (future-proofed for duel/rumble) + Phase 1 RPCs (vs House, Daily Free Rolls)

-- ── Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dice_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('house', 'duel', 'rumble')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'complete', 'cancelled', 'expired')),
  stake INTEGER NOT NULL CHECK (stake >= 0),
  pot INTEGER NOT NULL DEFAULT 0,
  rake INTEGER NOT NULL DEFAULT 0,
  max_players SMALLINT NOT NULL DEFAULT 2,
  rounds_target SMALLINT NOT NULL DEFAULT 2,
  current_round SMALLINT NOT NULL DEFAULT 1,
  winner_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  challenged_user UUID REFERENCES auth.users(id),
  seed_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_dice_matches_created_by ON public.dice_matches(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dice_matches_status ON public.dice_matches(status) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.dice_match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.dice_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  seat SMALLINT NOT NULL,
  rounds_won SMALLINT NOT NULL DEFAULT 0,
  eliminated_round SMALLINT,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dice_match_players_unique_user
  ON public.dice_match_players(match_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dice_match_players_match ON public.dice_match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_dice_match_players_user ON public.dice_match_players(user_id);

CREATE TABLE IF NOT EXISTS public.dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.dice_matches(id) ON DELETE CASCADE,
  round SMALLINT NOT NULL,
  user_id UUID,
  die1 SMALLINT NOT NULL CHECK (die1 BETWEEN 1 AND 6),
  die2 SMALLINT NOT NULL CHECK (die2 BETWEEN 1 AND 6),
  total SMALLINT GENERATED ALWAYS AS (die1 + die2) STORED,
  auto_rolled BOOLEAN NOT NULL DEFAULT false,
  rolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_match ON public.dice_rolls(match_id, round);

CREATE TABLE IF NOT EXISTS public.dice_daily_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  free_rolls_used SMALLINT NOT NULL DEFAULT 0,
  house_matches_played SMALLINT NOT NULL DEFAULT 0,
  house_net_won INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.dice_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_daily_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own or open dice matches" ON public.dice_matches;
CREATE POLICY "Users read own or open dice matches"
  ON public.dice_matches FOR SELECT
  USING (
    auth.uid() = created_by
    OR status = 'open'
    OR EXISTS (SELECT 1 FROM public.dice_match_players p WHERE p.match_id = id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users read dice match players" ON public.dice_match_players;
CREATE POLICY "Users read dice match players"
  ON public.dice_match_players FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.dice_matches m WHERE m.id = match_id AND (m.created_by = auth.uid() OR m.status = 'open'))
  );

DROP POLICY IF EXISTS "Users read dice rolls" ON public.dice_rolls;
CREATE POLICY "Users read dice rolls"
  ON public.dice_rolls FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.dice_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.dice_match_players p WHERE p.match_id = match_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users read own dice daily state" ON public.dice_daily_state;
CREATE POLICY "Users read own dice daily state"
  ON public.dice_daily_state FOR SELECT
  USING (auth.uid() = user_id);

-- ── RPC: claim_dice_free_roll ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_dice_free_roll()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_day DATE := CURRENT_DATE;
  v_daily RECORD;
  v_d1 SMALLINT; v_d2 SMALLINT; v_total SMALLINT;
  v_reward INTEGER;
  v_balance NUMERIC;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.dice_daily_state (user_id, day) VALUES (v_user, v_day) ON CONFLICT (user_id, day) DO NOTHING;

  SELECT * INTO v_daily FROM public.dice_daily_state WHERE user_id = v_user AND day = v_day FOR UPDATE;

  IF v_daily.free_rolls_used >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No free rolls left today. Come back tomorrow!');
  END IF;

  v_d1 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
  v_d2 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
  v_total := v_d1 + v_d2;

  v_reward := CASE
    WHEN v_d1 = 6 AND v_d2 = 6 THEN 250
    WHEN v_total BETWEEN 10 AND 11 THEN 100
    WHEN v_total BETWEEN 7 AND 9 THEN 50
    ELSE 20
  END;

  UPDATE public.user_points SET game_points = game_points + v_reward, updated_at = now() WHERE user_id = v_user;
  UPDATE public.dice_daily_state SET free_rolls_used = free_rolls_used + 1 WHERE user_id = v_user AND day = v_day;

  PERFORM public.log_points_ledger_entry(
    v_user, v_reward, 'dice_free_roll',
    'Dice Roll: free roll (' || v_d1 || '+' || v_d2 || ') +' || v_reward || ' ARX-P',
    'dice_free_roll', gen_random_uuid()
  );

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'success', true, 'die1', v_d1, 'die2', v_d2, 'total', v_total,
    'reward', v_reward, 'rolls_left', 3 - (v_daily.free_rolls_used + 1),
    'balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_dice_free_roll() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_dice_free_roll() TO authenticated;

-- ── RPC: play_dice_house_match ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_dice_house_match(p_stake INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match_id UUID;
  v_day DATE := CURRENT_DATE;
  v_daily RECORD;
  v_balance NUMERIC;
  v_pot INTEGER;
  v_rounds JSONB := '[]'::jsonb;
  v_round SMALLINT := 1;
  v_user_wins SMALLINT := 0;
  v_bot_wins SMALLINT := 0;
  v_d1 SMALLINT; v_d2 SMALLINT; v_user_total SMALLINT;
  v_b1 SMALLINT; v_b2 SMALLINT; v_bot_total SMALLINT;
  v_winner TEXT;
  v_round_json JSONB;
  v_safety SMALLINT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_stake NOT IN (10, 25, 50, 100, 250, 500) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.dice_daily_state (user_id, day) VALUES (v_user, v_day) ON CONFLICT (user_id, day) DO NOTHING;

  SELECT * INTO v_daily FROM public.dice_daily_state WHERE user_id = v_user AND day = v_day FOR UPDATE;

  IF v_daily.house_matches_played >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily house match limit reached (20/20)');
  END IF;
  IF v_daily.house_net_won >= 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily house winnings cap reached. Come back tomorrow!');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);

  v_pot := ROUND(p_stake * 1.85);

  INSERT INTO public.dice_matches (mode, status, stake, pot, rake, max_players, rounds_target, created_by, started_at)
  VALUES ('house', 'active', p_stake, v_pot, 0, 2, 2, v_user, now())
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);
  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, NULL, 2, true);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Roll: staked ' || p_stake || ' ARX-P vs House',
    'dice_match', v_match_id
  );

  WHILE v_user_wins < 2 AND v_bot_wins < 2 AND v_safety < 25 LOOP
    v_safety := v_safety + 1;

    v_d1 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_d2 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_user_total := v_d1 + v_d2;

    v_b1 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_b2 := 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 6);
    v_bot_total := v_b1 + v_b2;

    INSERT INTO public.dice_rolls (match_id, round, user_id, die1, die2) VALUES (v_match_id, v_round, v_user, v_d1, v_d2);
    INSERT INTO public.dice_rolls (match_id, round, user_id, die1, die2) VALUES (v_match_id, v_round, NULL, v_b1, v_b2);

    IF v_user_total > v_bot_total THEN
      v_user_wins := v_user_wins + 1;
      v_winner := 'user';
    ELSIF v_bot_total > v_user_total THEN
      v_bot_wins := v_bot_wins + 1;
      v_winner := 'bot';
    ELSE
      v_winner := 'tie';
    END IF;

    v_round_json := jsonb_build_object(
      'round', v_round,
      'user_die1', v_d1, 'user_die2', v_d2, 'user_total', v_user_total,
      'bot_die1', v_b1, 'bot_die2', v_b2, 'bot_total', v_bot_total,
      'result', v_winner,
      'user_wins_after', v_user_wins, 'bot_wins_after', v_bot_wins
    );
    v_rounds := v_rounds || v_round_json;

    v_round := v_round + 1;
  END LOOP;

  UPDATE public.dice_match_players SET rounds_won = v_user_wins WHERE match_id = v_match_id AND user_id = v_user;
  UPDATE public.dice_match_players SET rounds_won = v_bot_wins WHERE match_id = v_match_id AND is_bot = true;

  IF v_user_wins >= 2 THEN
    UPDATE public.user_points SET game_points = game_points + v_pot, updated_at = now() WHERE user_id = v_user;
    PERFORM public.log_points_ledger_entry(
      v_user, v_pot, 'dice_win',
      'Dice Roll: won ' || v_pot || ' ARX-P vs House',
      'dice_match', v_match_id
    );
    UPDATE public.dice_matches SET status = 'complete', winner_id = v_user, completed_at = now(), current_round = v_round - 1 WHERE id = v_match_id;
    UPDATE public.dice_daily_state
      SET house_matches_played = house_matches_played + 1,
          house_net_won = house_net_won + (v_pot - p_stake)
      WHERE user_id = v_user AND day = v_day;
  ELSE
    UPDATE public.dice_matches SET status = 'complete', winner_id = NULL, completed_at = now(), current_round = v_round - 1 WHERE id = v_match_id;
    UPDATE public.dice_daily_state
      SET house_matches_played = house_matches_played + 1,
          house_net_won = house_net_won - p_stake
      WHERE user_id = v_user AND day = v_day;
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'stake', p_stake,
    'pot', v_pot,
    'rounds', v_rounds,
    'user_wins', v_user_wins,
    'bot_wins', v_bot_wins,
    'won', v_user_wins >= 2,
    'payout', CASE WHEN v_user_wins >= 2 THEN v_pot ELSE 0 END,
    'net_change', CASE WHEN v_user_wins >= 2 THEN v_pot - p_stake ELSE -p_stake END,
    'balance', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.play_dice_house_match(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.play_dice_house_match(INTEGER) TO authenticated;

-- ── RPC: get_dice_daily_state (read-only helper, avoids upsert race on plain SELECT) ─
CREATE OR REPLACE FUNCTION public.get_dice_daily_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_day DATE := CURRENT_DATE;
  v_daily RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_daily FROM public.dice_daily_state WHERE user_id = v_user AND day = v_day;

  RETURN jsonb_build_object(
    'success', true,
    'free_rolls_used', COALESCE(v_daily.free_rolls_used, 0),
    'free_rolls_left', 3 - COALESCE(v_daily.free_rolls_used, 0),
    'house_matches_played', COALESCE(v_daily.house_matches_played, 0),
    'house_matches_left', 20 - COALESCE(v_daily.house_matches_played, 0),
    'house_net_won', COALESCE(v_daily.house_net_won, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dice_daily_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dice_daily_state() TO authenticated;
