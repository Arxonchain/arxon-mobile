-- Drop the overly permissive public leaderboard policy
DROP POLICY IF EXISTS "Leaderboard view" ON public.user_points;

-- Create a secure leaderboard view that only exposes minimal data
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  p.username,
  p.avatar_url,
  up.user_id,
  up.total_points,
  up.daily_streak
FROM public.user_points up
LEFT JOIN public.profiles p ON p.user_id = up.user_id
ORDER BY up.total_points DESC;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Create a secure yapper leaderboard view
CREATE OR REPLACE VIEW public.yapper_leaderboard_view AS
SELECT 
  xp.user_id,
  xp.username,
  p.avatar_url,
  xp.boost_percentage,
  xp.qualified_posts_today,
  xp.average_engagement,
  xp.viral_bonus,
  up.social_points
FROM public.x_profiles xp
LEFT JOIN public.profiles p ON p.user_id = xp.user_id
LEFT JOIN public.user_points up ON up.user_id = xp.user_id
ORDER BY up.social_points DESC NULLS LAST;

-- Grant select on the yapper view
GRANT SELECT ON public.yapper_leaderboard_view TO authenticated;
GRANT SELECT ON public.yapper_leaderboard_view TO anon;