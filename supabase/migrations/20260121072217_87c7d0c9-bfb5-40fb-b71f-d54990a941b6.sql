-- Add win streak tracking to arena_members
ALTER TABLE public.arena_members 
ADD COLUMN IF NOT EXISTS current_win_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_win_streak integer NOT NULL DEFAULT 0;

-- Add streak bonus to arena_earnings
ALTER TABLE public.arena_earnings
ADD COLUMN IF NOT EXISTS streak_bonus numeric NOT NULL DEFAULT 0;

-- Create function to calculate streak bonus percentage
-- 3-win streak = +25%, 5-win = +50%, 10-win = +100%, etc.
CREATE OR REPLACE FUNCTION public.calculate_streak_bonus(win_streak integer)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF win_streak < 3 THEN
    RETURN 0;
  ELSIF win_streak >= 3 AND win_streak < 5 THEN
    RETURN 25; -- 25% bonus
  ELSIF win_streak >= 5 AND win_streak < 10 THEN
    RETURN 50; -- 50% bonus
  ELSIF win_streak >= 10 THEN
    RETURN 100; -- 100% bonus (capped)
  END IF;
  RETURN 0;
END;
$$;

-- Update arena_earnings_leaderboard view to include streak data
DROP VIEW IF EXISTS public.arena_earnings_leaderboard;

CREATE VIEW public.arena_earnings_leaderboard 
WITH (security_invoker = true) AS
SELECT 
  ae.user_id,
  p.username,
  p.avatar_url,
  am.club,
  am.current_win_streak,
  am.best_win_streak,
  COUNT(DISTINCT ae.battle_id) as total_battles,
  SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END) as total_wins,
  SUM(ae.stake_amount) as total_staked,
  SUM(ae.total_earned) as total_earned,
  SUM(ae.bonus_earned) as total_bonus_earned,
  SUM(ae.pool_share_earned) as total_pool_share_earned,
  SUM(ae.streak_bonus) as total_streak_bonus,
  SUM(ae.total_earned) - SUM(ae.stake_amount) as net_profit,
  ROUND((SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(DISTINCT ae.battle_id), 0) * 100), 1) as win_rate
FROM public.arena_earnings ae
LEFT JOIN public.profiles p ON p.user_id = ae.user_id
LEFT JOIN public.arena_members am ON am.user_id = ae.user_id
GROUP BY ae.user_id, p.username, p.avatar_url, am.club, am.current_win_streak, am.best_win_streak
ORDER BY (SUM(ae.stake_amount) + SUM(ae.total_earned) - SUM(ae.stake_amount)) DESC;