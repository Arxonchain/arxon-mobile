-- Variable vote options: JSONB vote_options on arena_battles (2–26 sides, ids a–z).
-- Keeps side_a/b/c columns synced for backward compatibility with existing clients.

ALTER TABLE public.arena_battles
  ADD COLUMN IF NOT EXISTS vote_options JSONB;

COMMENT ON COLUMN public.arena_battles.vote_options IS
  'Array of {id, name, color, power}. Source of truth when set; side_a/b/c mirror first three.';

-- Backfill from legacy columns
UPDATE public.arena_battles
SET vote_options = (
  jsonb_build_array(
    jsonb_build_object(
      'id', 'a',
      'name', side_a_name,
      'color', COALESCE(side_a_color, '#4ade80'),
      'power', COALESCE(side_a_power, 0)
    ),
    jsonb_build_object(
      'id', 'b',
      'name', side_b_name,
      'color', COALESCE(side_b_color, '#f87171'),
      'power', COALESCE(side_b_power, 0)
    )
  )
  || CASE
    WHEN side_c_name IS NOT NULL AND btrim(side_c_name) <> '' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', 'c',
          'name', side_c_name,
          'color', COALESCE(side_c_color, '#FFD700'),
          'power', COALESCE(side_c_power, 0)
        )
      )
    ELSE '[]'::jsonb
  END
)
WHERE vote_options IS NULL;

-- Allow any lowercase option id on votes (validated in cast_arena_vote)
ALTER TABLE public.arena_votes DROP CONSTRAINT IF EXISTS arena_votes_side_check;
ALTER TABLE public.arena_votes
  ADD CONSTRAINT arena_votes_side_check CHECK (side ~ '^[a-z]+$');

CREATE OR REPLACE FUNCTION public.sync_arena_battle_legacy_sides(p_options JSONB)
RETURNS TABLE (
  side_a_name TEXT,
  side_a_color TEXT,
  side_a_power NUMERIC,
  side_b_name TEXT,
  side_b_color TEXT,
  side_b_power NUMERIC,
  side_c_name TEXT,
  side_c_color TEXT,
  side_c_power NUMERIC
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_options->0->>'name', 'Option A'),
    COALESCE(p_options->0->>'color', '#4ade80'),
    COALESCE((p_options->0->>'power')::numeric, 0),
    COALESCE(p_options->1->>'name', 'Option B'),
    COALESCE(p_options->1->>'color', '#f87171'),
    COALESCE((p_options->1->>'power')::numeric, 0),
    NULLIF(btrim(COALESCE(p_options->2->>'name', '')), ''),
    CASE WHEN p_options->2 IS NOT NULL THEN COALESCE(p_options->2->>'color', '#FFD700') ELSE NULL END,
    CASE WHEN p_options->2 IS NOT NULL THEN COALESCE((p_options->2->>'power')::numeric, 0) ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.cast_arena_vote(
  p_battle_id UUID,
  p_side TEXT,
  p_amount NUMERIC
)
RETURNS public.arena_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_battle public.arena_battles%ROWTYPE;
  v_vote public.arena_votes%ROWTYPE;
  v_multiplier NUMERIC;
  v_options JSONB;
  v_found BOOLEAN := false;
  v_la_name TEXT;
  v_la_color TEXT;
  v_la_power NUMERIC;
  v_lb_name TEXT;
  v_lb_color TEXT;
  v_lb_power NUMERIC;
  v_lc_name TEXT;
  v_lc_color TEXT;
  v_lc_power NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_side IS NULL OR p_side !~ '^[a-z]+$' THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum stake is 1000 ARX-P'; END IF;
  IF p_amount > 100000 THEN RAISE EXCEPTION 'Maximum stake is 100000 ARX-P'; END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.arena_votes WHERE battle_id = p_battle_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'You already voted on this prediction';
  END IF;

  SELECT * INTO v_battle FROM public.arena_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Battle not found'; END IF;
  IF v_battle.winner_side IS NOT NULL THEN RAISE EXCEPTION 'Voting is closed'; END IF;
  IF NOW() < v_battle.starts_at THEN RAISE EXCEPTION 'Voting has not started yet'; END IF;
  IF NOW() > v_battle.ends_at OR NOT v_battle.is_active THEN RAISE EXCEPTION 'Voting is closed'; END IF;

  v_options := v_battle.vote_options;
  IF v_options IS NULL OR jsonb_array_length(v_options) < 2 THEN
    v_options := jsonb_build_array(
      jsonb_build_object('id', 'a', 'name', v_battle.side_a_name, 'color', COALESCE(v_battle.side_a_color, '#4ade80'), 'power', COALESCE(v_battle.side_a_power, 0)),
      jsonb_build_object('id', 'b', 'name', v_battle.side_b_name, 'color', COALESCE(v_battle.side_b_color, '#f87171'), 'power', COALESCE(v_battle.side_b_power, 0))
    );
    IF v_battle.side_c_name IS NOT NULL AND btrim(v_battle.side_c_name) <> '' THEN
      v_options := v_options || jsonb_build_array(
        jsonb_build_object('id', 'c', 'name', v_battle.side_c_name, 'color', COALESCE(v_battle.side_c_color, '#FFD700'), 'power', COALESCE(v_battle.side_c_power, 0))
      );
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_options) elem WHERE elem->>'id' = p_side
  ) INTO v_found;
  IF NOT v_found THEN
    RAISE EXCEPTION 'Invalid side for this market';
  END IF;

  PERFORM public.deduct_user_points_for_arena(v_user_id, p_amount);

  v_multiplier := public.calculate_early_stake_multiplier(p_battle_id, NOW());

  INSERT INTO public.arena_votes (battle_id, user_id, side, power_spent, early_stake_multiplier)
  VALUES (p_battle_id, v_user_id, p_side, p_amount, v_multiplier)
  RETURNING * INTO v_vote;

  v_options := (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN elem->>'id' = p_side THEN
          jsonb_set(elem, '{power}', to_jsonb(COALESCE((elem->>'power')::numeric, 0) + p_amount))
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(v_options) elem
  );

  SELECT
    side_a_name, side_a_color, side_a_power,
    side_b_name, side_b_color, side_b_power,
    side_c_name, side_c_color, side_c_power
  INTO
    v_la_name, v_la_color, v_la_power,
    v_lb_name, v_lb_color, v_lb_power,
    v_lc_name, v_lc_color, v_lc_power
  FROM public.sync_arena_battle_legacy_sides(v_options);

  UPDATE public.arena_battles SET
    vote_options = v_options,
    side_a_name = v_la_name,
    side_a_color = v_la_color,
    side_a_power = v_la_power,
    side_b_name = v_lb_name,
    side_b_color = v_lb_color,
    side_b_power = v_lb_power,
    side_c_name = v_lc_name,
    side_c_color = v_lc_color,
    side_c_power = v_lc_power,
    total_participants = COALESCE(total_participants, 0) + 1
  WHERE id = p_battle_id;

  PERFORM public.log_points_ledger_entry(
    v_user_id, -p_amount, 'arena_stake',
    'Arena stake (-' || p_amount || ' ARX-P)',
    'arena_vote', v_vote.id
  );

  RETURN v_vote;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_arena_vote(UUID, TEXT, NUMERIC) TO authenticated;
