-- Fix arena_team_leaderboard to show for all users by making it security definer
-- This allows the view to access arena_votes and aggregate totals for all teams

DROP VIEW IF EXISTS public.arena_team_leaderboard;

CREATE OR REPLACE VIEW public.arena_team_leaderboard
WITH (security_invoker = false)
AS
WITH vote_aggregates AS (
  SELECT 
    user_id,
    COUNT(DISTINCT battle_id) AS battles_participated,
    COALESCE(SUM(power_spent), 0) AS total_staked
  FROM public.arena_votes
  GROUP BY user_id
),
earnings_aggregates AS (
  SELECT 
    user_id,
    COALESCE(SUM(total_earned), 0) AS total_earned,
    COALESCE(SUM(bonus_earned), 0) AS total_bonus_earned,
    COALESCE(SUM(pool_share_earned), 0) AS total_pool_share_earned,
    COALESCE(SUM(streak_bonus), 0) AS total_streak_bonus,
    COUNT(*) FILTER (WHERE is_winner = true) AS total_wins
  FROM public.arena_earnings
  GROUP BY user_id
)
SELECT 
  am.user_id,
  p.username,
  p.avatar_url,
  am.club,
  am.current_win_streak,
  am.best_win_streak,
  am.total_votes,
  am.total_wins AS member_total_wins,
  COALESCE(va.battles_participated, 0) AS total_battles,
  COALESCE(ea.total_wins, 0) AS total_wins,
  -- Round staked to whole numbers for cleaner display
  CEIL(COALESCE(va.total_staked, 0)) AS total_staked,
  CEIL(COALESCE(ea.total_earned, 0)) AS total_earned,
  CEIL(COALESCE(ea.total_bonus_earned, 0)) AS total_bonus_earned,
  CEIL(COALESCE(ea.total_pool_share_earned, 0)) AS total_pool_share_earned,
  CEIL(COALESCE(ea.total_streak_bonus, 0)) AS total_streak_bonus,
  CEIL(COALESCE(ea.total_earned, 0) - COALESCE(va.total_staked, 0)) AS net_profit,
  CASE 
    WHEN COALESCE(va.battles_participated, 0) > 0 
    THEN ROUND((COALESCE(ea.total_wins, 0)::numeric / va.battles_participated::numeric) * 100, 2)
    ELSE 0
  END AS win_rate
FROM public.arena_members am
LEFT JOIN public.profiles p ON p.user_id = am.user_id
LEFT JOIN vote_aggregates va ON va.user_id = am.user_id
LEFT JOIN earnings_aggregates ea ON ea.user_id = am.user_id
ORDER BY (COALESCE(va.total_staked, 0) + (COALESCE(ea.total_earned, 0) - COALESCE(va.total_staked, 0))) DESC, am.joined_at;

-- Grant public read access
GRANT SELECT ON public.arena_team_leaderboard TO anon, authenticated;