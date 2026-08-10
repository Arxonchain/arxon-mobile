-- Fix dice PvP: broken RLS column scoping + stuck lobby recovery
-- Root cause: policy EXISTS subqueries used unqualified `id` / `match_id`, which
-- Postgres resolved to dice_match_players columns (p.match_id = p.id), so joiners
-- could not SELECT active matches → "Match not found" while still blocked by
-- user_has_open_dice_participation.

-- ── Helper: participation check without RLS recursion ───────────────────────
CREATE OR REPLACE FUNCTION public.is_dice_match_participant(p_match_id UUID, p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.dice_matches m
      WHERE m.id = p_match_id AND m.created_by = p_user
    )
    OR EXISTS (
      SELECT 1 FROM public.dice_match_players p
      WHERE p.match_id = p_match_id AND p.user_id = p_user
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_dice_match_participant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dice_match_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dice_match_participant(UUID, UUID) TO service_role;

-- ── Fix SELECT policies (qualified + definer helper) ────────────────────────
DROP POLICY IF EXISTS "Users read own or open dice matches" ON public.dice_matches;
CREATE POLICY "Users read own or open dice matches"
  ON public.dice_matches FOR SELECT
  USING (
    auth.uid() = created_by
    OR status = 'open'
    OR public.is_dice_match_participant(id, auth.uid())
  );

DROP POLICY IF EXISTS "Users read dice match players" ON public.dice_match_players;
CREATE POLICY "Users read dice match players"
  ON public.dice_match_players FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_dice_match_participant(match_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.dice_matches m
      WHERE m.id = dice_match_players.match_id AND m.status = 'open'
    )
  );

DROP POLICY IF EXISTS "Users read dice rolls" ON public.dice_rolls;
CREATE POLICY "Users read dice rolls"
  ON public.dice_rolls FOR SELECT
  USING (
    public.is_dice_match_participant(match_id, auth.uid())
  );

-- ── Participation gate: PvP only (never block on house) ─────────────────────
CREATE OR REPLACE FUNCTION public.user_has_open_dice_participation(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dice_matches m
    WHERE m.status IN ('open', 'active')
      AND m.mode IN ('duel', 'rumble')
      AND (
        m.created_by = p_user
        OR EXISTS (
          SELECT 1 FROM public.dice_match_players p
          WHERE p.match_id = m.id AND p.user_id = p_user
        )
      )
  );
$$;

-- ── List my open/active (include created_by for host UI) ────────────────────
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
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Housekeeping first so ghost open lobbies clear before listing
  PERFORM public.expire_open_dice_matches();

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      m.id,
      m.mode,
      m.status,
      m.stake,
      m.pot,
      m.max_players,
      m.invite_code,
      m.expires_at,
      m.created_at,
      m.created_by,
      (SELECT COUNT(*)::int FROM public.dice_match_players p WHERE p.match_id = m.id) AS players_joined
    FROM public.dice_matches m
    WHERE m.status IN ('open', 'active')
      AND m.mode IN ('duel', 'rumble')
      AND public.is_dice_match_participant(m.id, v_user)
  ) t;

  RETURN jsonb_build_object('success', true, 'matches', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_open_dice_matches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_open_dice_matches() TO authenticated;

-- ── Cancel / refund all of my OPEN PvP lobbies (stuck recovery) ─────────────
CREATE OR REPLACE FUNCTION public.cancel_my_open_dice_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_match RECORD;
  v_player RECORD;
  v_cancelled INTEGER := 0;
  v_expired_active INTEGER := 0;
  v_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1) Cancel every OPEN duel/rumble the user participates in (host or joiner)
  FOR v_match IN
    SELECT m.*
    FROM public.dice_matches m
    WHERE m.status = 'open'
      AND m.mode IN ('duel', 'rumble')
      AND public.is_dice_match_participant(m.id, v_user)
    FOR UPDATE OF m SKIP LOCKED
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
        'Dice ' || initcap(v_match.mode) || ': open lobby cancelled, refunded ' || v_match.stake || ' ARX-P',
        'dice_match', v_match.id
      );
    END LOOP;

    UPDATE public.dice_matches
    SET status = 'cancelled', completed_at = now()
    WHERE id = v_match.id;

    v_cancelled := v_cancelled + 1;
    v_ids := array_append(v_ids, v_match.id);
  END LOOP;

  -- 2) Stale ACTIVE (>30m): refund + expire (same as expire_open_dice_matches)
  FOR v_match IN
    SELECT m.*
    FROM public.dice_matches m
    WHERE m.status = 'active'
      AND m.mode IN ('duel', 'rumble')
      AND public.is_dice_match_participant(m.id, v_user)
      AND COALESCE(m.started_at, m.created_at) < now() - interval '30 minutes'
    FOR UPDATE OF m SKIP LOCKED
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

    v_expired_active := v_expired_active + 1;
    v_ids := array_append(v_ids, v_match.id);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_open', v_cancelled,
    'expired_active', v_expired_active,
    'match_ids', to_jsonb(v_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_my_open_dice_matches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_my_open_dice_matches() TO authenticated;

-- ── Expire: treat NULL expires_at as created_at + 15 minutes ────────────────
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
  v_die1 INT;
  v_die2 INT;
  v_round INT;
BEGIN
  -- 1) Open lobbies past TTL (or missing expires_at older than 15m)
  FOR v_match IN
    SELECT * FROM public.dice_matches
    WHERE status = 'open'
      AND mode IN ('duel', 'rumble')
      AND COALESCE(expires_at, created_at + interval '15 minutes') < now()
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

  -- 2) Active: auto-roll missing players if round idle > 3 minutes
  FOR v_match IN
    SELECT * FROM public.dice_matches
    WHERE status = 'active'
      AND mode IN ('duel', 'rumble')
      AND COALESCE(started_at, created_at) < now() - interval '3 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    v_round := COALESCE(v_match.current_round, 1);

    IF EXISTS (
      SELECT 1 FROM public.dice_rolls
      WHERE match_id = v_match.id AND round = v_round AND rolled_at > now() - interval '3 minutes'
    ) AND EXISTS (
      SELECT 1 FROM public.dice_rolls WHERE match_id = v_match.id AND round = v_round
    ) THEN
      CONTINUE;
    END IF;

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
      AND mode IN ('duel', 'rumble')
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
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO service_role;

-- ── Join duel: add one-participation gate (was missing) ─────────────────────
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
  IF COALESCE(v_match.expires_at, v_match.created_at + interval '15 minutes') < now() THEN
    UPDATE public.user_points SET game_points = game_points + v_match.stake, updated_at = now() WHERE user_id = v_match.created_by;
    PERFORM public.log_points_ledger_entry(v_match.created_by, v_match.stake, 'dice_refund', 'Dice Duel: challenge expired, refunded ' || v_match.stake || ' ARX-P', 'dice_match', p_match_id);
    UPDATE public.dice_matches SET status = 'expired', completed_at = now() WHERE id = p_match_id;
    RETURN jsonb_build_object('success', false, 'error', 'This challenge has expired');
  END IF;
  IF public.user_has_open_dice_participation(v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an open or active dice match');
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

  UPDATE public.dice_matches SET status = 'active', started_at = now(), pot = v_match.stake * 2 WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_dice_duel_match(UUID) TO authenticated;
