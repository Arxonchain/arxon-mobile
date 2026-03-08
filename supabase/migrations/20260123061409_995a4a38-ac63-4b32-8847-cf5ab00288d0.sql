-- Create a comprehensive arena team leaderboard view that includes active participants
-- This view aggregates data from arena_members, arena_votes, and profiles
-- to show rankings even before battles are resolved

CREATE OR REPLACE VIEW public.arena_team_leaderboard AS
WITH vote_aggregates AS (
  SELECT 
    user_id,
    COUNT(DISTINCT battle_id) as battles_participated,
    COALESCE(SUM(power_spent), 0) as total_staked
  FROM arena_votes
  GROUP BY user_id
),
earnings_aggregates AS (
  SELECT
    user_id,
    COALESCE(SUM(total_earned), 0) as total_earned,
    COALESCE(SUM(bonus_earned), 0) as total_bonus_earned,
    COALESCE(SUM(pool_share_earned), 0) as total_pool_share_earned,
    COALESCE(SUM(streak_bonus), 0) as total_streak_bonus,
    COUNT(*) FILTER (WHERE is_winner = true) as total_wins
  FROM arena_earnings
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
  am.total_wins as member_total_wins,
  COALESCE(va.battles_participated, 0)::bigint as total_battles,
  COALESCE(ea.total_wins, 0)::bigint as total_wins,
  COALESCE(va.total_staked, 0)::numeric as total_staked,
  COALESCE(ea.total_earned, 0)::numeric as total_earned,
  COALESCE(ea.total_bonus_earned, 0)::numeric as total_bonus_earned,
  COALESCE(ea.total_pool_share_earned, 0)::numeric as total_pool_share_earned,
  COALESCE(ea.total_streak_bonus, 0)::numeric as total_streak_bonus,
  (COALESCE(ea.total_earned, 0) - COALESCE(va.total_staked, 0))::numeric as net_profit,
  CASE 
    WHEN COALESCE(va.battles_participated, 0) > 0 
    THEN ROUND((COALESCE(ea.total_wins, 0)::numeric / va.battles_participated::numeric) * 100, 2)
    ELSE 0 
  END as win_rate
FROM arena_members am
LEFT JOIN profiles p ON p.user_id = am.user_id
LEFT JOIN vote_aggregates va ON va.user_id = am.user_id
LEFT JOIN earnings_aggregates ea ON ea.user_id = am.user_id
ORDER BY 
  (COALESCE(va.total_staked, 0) + (COALESCE(ea.total_earned, 0) - COALESCE(va.total_staked, 0))) DESC,
  am.joined_at ASC;