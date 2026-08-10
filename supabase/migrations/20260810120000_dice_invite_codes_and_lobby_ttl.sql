-- Dice Roll V2: invite codes, join-by-code, longer open lobbies, expire+refund helper

ALTER TABLE public.dice_matches
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dice_matches_invite_code
  ON public.dice_matches (invite_code)
  WHERE invite_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_dice_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_i INTEGER;
BEGIN
  FOR v_i IN 1..12 LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    IF NOT EXISTS (SELECT 1 FROM public.dice_matches WHERE invite_code = v_code AND status IN ('open', 'active')) THEN
      RETURN v_code;
    END IF;
  END LOOP;
  RETURN upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
END;
$$;

-- Keep open lobbies visible for 15 minutes (was already default on table; recreate RPCs with invite codes)
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

  IF EXISTS (SELECT 1 FROM public.dice_matches WHERE created_by = v_user AND mode = 'duel' AND status = 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open challenge. Cancel it first.');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);
  v_code := public.generate_dice_invite_code();

  INSERT INTO public.dice_matches (mode, status, stake, pot, rake, max_players, rounds_target, created_by, expires_at, invite_code)
  VALUES ('duel', 'open', p_stake, p_stake * 2, ROUND(p_stake * 2 * 0.05), 2, 2, v_user, now() + interval '15 minutes', v_code)
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Duel: staked ' || p_stake || ' ARX-P (open challenge)',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'stake', p_stake,
    'pot', p_stake * 2,
    'invite_code', v_code,
    'expires_at', (now() + interval '15 minutes')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_dice_duel_match(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dice_duel_match(INTEGER) TO authenticated;

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
  IF p_max_players NOT IN (3, 4, 5, 6) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid lobby size');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.dice_matches WHERE created_by = v_user AND mode = 'rumble' AND status = 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open rumble lobby. Cancel it first.');
  END IF;

  SELECT total_points INTO v_balance FROM public.user_points WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ARX-P balance');
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user, p_stake);
  v_code := public.generate_dice_invite_code();

  INSERT INTO public.dice_matches (mode, status, stake, pot, rake, max_players, rounds_target, created_by, expires_at, invite_code)
  VALUES ('rumble', 'open', p_stake, p_stake, 0, p_max_players, 1, v_user, now() + interval '15 minutes', v_code)
  RETURNING id INTO v_match_id;

  INSERT INTO public.dice_match_players (match_id, user_id, seat, is_bot) VALUES (v_match_id, v_user, 1, false);

  PERFORM public.log_points_ledger_entry(
    v_user, -p_stake, 'dice_stake',
    'Dice Rumble: staked ' || p_stake || ' ARX-P (lobby open)',
    'dice_match', v_match_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'stake', p_stake,
    'max_players', p_max_players,
    'invite_code', v_code,
    'expires_at', (now() + interval '15 minutes')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_dice_rumble_lobby(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dice_rumble_lobby(INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_dice_match_by_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match public.dice_matches%ROWTYPE;
  v_code TEXT := upper(trim(COALESCE(p_invite_code, '')));
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF length(v_code) < 4 THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code'); END IF;

  SELECT * INTO v_match
  FROM public.dice_matches
  WHERE invite_code = v_code AND status = 'open'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No open lobby found for that code');
  END IF;

  IF v_match.mode = 'duel' THEN
    RETURN public.join_dice_duel_match(v_match.id);
  ELSIF v_match.mode = 'rumble' THEN
    RETURN public.join_dice_rumble_lobby(v_match.id);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unsupported match mode');
END;
$$;

REVOKE ALL ON FUNCTION public.join_dice_match_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_dice_match_by_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_open_dice_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_rows JSONB;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT m.id, m.mode, m.status, m.stake, m.pot, m.max_players, m.invite_code, m.expires_at, m.created_at,
      (SELECT COUNT(*) FROM public.dice_match_players p WHERE p.match_id = m.id) AS players_joined
    FROM public.dice_matches m
    WHERE m.status IN ('open', 'active')
      AND (
        m.created_by = v_user
        OR EXISTS (SELECT 1 FROM public.dice_match_players p WHERE p.match_id = m.id AND p.user_id = v_user)
      )
  ) t;

  RETURN jsonb_build_object('success', true, 'matches', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_open_dice_matches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_open_dice_matches() TO authenticated;

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
BEGIN
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

    UPDATE public.dice_matches
    SET status = 'expired', completed_at = now()
    WHERE id = v_match.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_open_dice_matches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO service_role;

-- Backfill invite codes for any lingering open lobbies
UPDATE public.dice_matches
SET invite_code = public.generate_dice_invite_code()
WHERE status = 'open' AND invite_code IS NULL;
