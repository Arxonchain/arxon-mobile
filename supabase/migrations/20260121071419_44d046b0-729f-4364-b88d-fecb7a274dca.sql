-- Drop existing view and recreate with club information
DROP VIEW IF EXISTS public.arena_earnings_leaderboard;

-- Create enhanced leaderboard view with club data
CREATE VIEW public.arena_earnings_leaderboard 
WITH (security_invoker = true) AS
SELECT 
  ae.user_id,
  p.username,
  p.avatar_url,
  am.club,
  COUNT(DISTINCT ae.battle_id) as total_battles,
  SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END) as total_wins,
  SUM(ae.stake_amount) as total_staked,
  SUM(ae.total_earned) as total_earned,
  SUM(ae.bonus_earned) as total_bonus_earned,
  SUM(ae.pool_share_earned) as total_pool_share_earned,
  -- Net profit = total earned - total staked (what you actually gained)
  SUM(ae.total_earned) - SUM(ae.stake_amount) as net_profit,
  ROUND((SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(DISTINCT ae.battle_id), 0) * 100), 1) as win_rate
FROM public.arena_earnings ae
LEFT JOIN public.profiles p ON p.user_id = ae.user_id
LEFT JOIN public.arena_members am ON am.user_id = ae.user_id
GROUP BY ae.user_id, p.username, p.avatar_url, am.club
ORDER BY (SUM(ae.stake_amount) + SUM(ae.total_earned) - SUM(ae.stake_amount)) DESC;