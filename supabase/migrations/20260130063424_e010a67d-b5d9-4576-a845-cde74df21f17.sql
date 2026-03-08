-- Fix leaderboard_view to be publicly accessible
-- The security_invoker was causing RLS on user_points to block other users' data

-- Drop and recreate the view WITHOUT security_invoker so it uses definer privileges
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW public.leaderboard_view 
WITH (security_barrier = false)
AS
SELECT 
  up.user_id,
  p.username,
  p.avatar_url,
  up.total_points,
  up.daily_streak
FROM public.user_points up
LEFT JOIN public.profiles p ON p.user_id = up.user_id
WHERE up.total_points > 0
ORDER BY up.total_points DESC;