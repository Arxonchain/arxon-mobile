-- P1: Bounded arena leaderboard + admin vote aggregates (no full-table client reads).

CREATE OR REPLACE FUNCTION public.get_arena_staker_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_power_staked numeric,
  total_wins bigint,
  total_battles bigint,
  biggest_stake numeric,
  club text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.user_id,
    p.username,
    p.avatar_url,
    COALESCE(SUM(ae.stake_amount), 0) AS total_power_staked,
    COUNT(*) FILTER (WHERE ae.is_winner)::bigint AS total_wins,
    COUNT(DISTINCT ae.battle_id)::bigint AS total_battles,
    COALESCE(MAX(ae.stake_amount), 0) AS biggest_stake,
    am.club
  FROM public.arena_earnings ae
  LEFT JOIN public.profiles p ON p.user_id = ae.user_id
  LEFT JOIN public.arena_members am ON am.user_id = ae.user_id
  GROUP BY ae.user_id, p.username, p.avatar_url, am.club
  ORDER BY total_power_staked DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_arena_staker_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arena_staker_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arena_staker_leaderboard(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_arena_vote_stats()
RETURNS TABLE (
  user_id uuid,
  vote_count bigint,
  total_power_spent numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    av.user_id,
    COUNT(*)::bigint AS vote_count,
    COALESCE(SUM(av.power_spent), 0) AS total_power_spent
  FROM public.arena_votes av
  GROUP BY av.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_arena_vote_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_arena_vote_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_arena_vote_stats() TO service_role;
