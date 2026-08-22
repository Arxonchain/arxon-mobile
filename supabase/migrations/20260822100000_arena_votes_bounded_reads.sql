-- P0 #13: Replace unbounded client arena_votes reads with bounded RPCs + indexes.

CREATE INDEX IF NOT EXISTS idx_arena_votes_battle_id ON public.arena_votes (battle_id);
CREATE INDEX IF NOT EXISTS idx_arena_votes_user_id ON public.arena_votes (user_id);

-- Platform + optional caller analytics (aggregates only, never full vote rows).
CREATE OR REPLACE FUNCTION public.get_arena_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_battles bigint;
  v_total_power numeric;
  v_participants bigint;
  v_largest_stake numeric;
  v_avg_stake numeric;
  v_top_user_id uuid;
  v_top_vote_count bigint;
  v_top_username text;
  v_user_battles bigint;
  v_user_wins bigint;
  v_user_power numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_battles FROM public.arena_battles;

  SELECT
    COALESCE(SUM(power_spent), 0),
    COUNT(DISTINCT user_id),
    COALESCE(MAX(power_spent), 0)
  INTO v_total_power, v_participants, v_largest_stake
  FROM public.arena_votes;

  v_avg_stake := CASE
    WHEN v_participants > 0 THEN ROUND(v_total_power / v_participants)
    ELSE 0
  END;

  SELECT av.user_id, COUNT(*)::bigint
  INTO v_top_user_id, v_top_vote_count
  FROM public.arena_votes av
  GROUP BY av.user_id
  ORDER BY COUNT(*) DESC, av.user_id
  LIMIT 1;

  IF v_top_user_id IS NOT NULL THEN
    SELECT p.username INTO v_top_username
    FROM public.profiles p
    WHERE p.user_id = v_top_user_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT
      COUNT(DISTINCT av.battle_id),
      COUNT(*) FILTER (
        WHERE ab.winner_side IS NOT NULL AND av.side = ab.winner_side
      ),
      COALESCE(SUM(av.power_spent), 0)
    INTO v_user_battles, v_user_wins, v_user_power
    FROM public.arena_votes av
    JOIN public.arena_battles ab ON ab.id = av.battle_id
    WHERE av.user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'total_battles', COALESCE(v_total_battles, 0),
    'total_power_staked', COALESCE(v_total_power, 0),
    'total_participants', COALESCE(v_participants, 0),
    'average_stake_per_voter', COALESCE(v_avg_stake, 0),
    'largest_single_stake', COALESCE(v_largest_stake, 0),
    'most_active_voter', CASE
      WHEN v_top_user_id IS NOT NULL THEN jsonb_build_object(
        'username', COALESCE(v_top_username, 'Top Voter'),
        'votes', v_top_vote_count
      )
      ELSE NULL
    END,
    'user_stats', CASE
      WHEN v_user_id IS NOT NULL THEN jsonb_build_object(
        'total_battles_participated', COALESCE(v_user_battles, 0),
        'total_wins', COALESCE(v_user_wins, 0),
        'total_power_staked', COALESCE(v_user_power, 0),
        'win_rate', CASE
          WHEN COALESCE(v_user_battles, 0) > 0
            THEN ROUND((v_user_wins::numeric / v_user_battles) * 100, 1)
          ELSE 0
        END
      )
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_arena_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arena_analytics() TO service_role;

-- Anonymized recent activity for a single battle (no user_id exposed).
CREATE OR REPLACE FUNCTION public.get_recent_battle_votes(
  p_battle_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  side text,
  power_spent numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT av.id, av.side, av.power_spent, av.created_at
  FROM public.arena_votes av
  WHERE av.battle_id = p_battle_id
  ORDER BY av.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_recent_battle_votes(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_battle_votes(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_battle_votes(uuid, integer) TO service_role;

-- Per-battle side aggregates (counts + power totals).
CREATE OR REPLACE FUNCTION public.get_battle_vote_summary(p_battle_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_voters', COUNT(*)::bigint,
    'total_power', COALESCE(SUM(power_spent), 0),
    'side_a_count', COUNT(*) FILTER (WHERE side = 'a'),
    'side_b_count', COUNT(*) FILTER (WHERE side = 'b'),
    'side_c_count', COUNT(*) FILTER (WHERE side = 'c'),
    'side_a_power', COALESCE(SUM(power_spent) FILTER (WHERE side = 'a'), 0),
    'side_b_power', COALESCE(SUM(power_spent) FILTER (WHERE side = 'b'), 0),
    'side_c_power', COALESCE(SUM(power_spent) FILTER (WHERE side = 'c'), 0)
  )
  FROM public.arena_votes
  WHERE battle_id = p_battle_id;
$$;

REVOKE ALL ON FUNCTION public.get_battle_vote_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_battle_vote_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_battle_vote_summary(uuid) TO service_role;

-- Bounded participation list (includes side for battle explorer UI).
DROP FUNCTION IF EXISTS public.get_arena_participation(uuid);

CREATE FUNCTION public.get_arena_participation(
  p_battle_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  battle_id uuid,
  user_id uuid,
  power_spent numeric,
  side text,
  created_at timestamptz,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    av.battle_id,
    av.user_id,
    av.power_spent,
    av.side,
    av.created_at,
    p.username,
    p.avatar_url
  FROM public.arena_votes av
  LEFT JOIN public.profiles p ON p.user_id = av.user_id
  WHERE av.battle_id = p_battle_id
  ORDER BY av.power_spent DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.get_arena_participation(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_participation(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arena_participation(uuid, integer) TO service_role;
