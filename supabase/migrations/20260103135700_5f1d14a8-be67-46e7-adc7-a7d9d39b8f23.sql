-- Fix SECURITY DEFINER view warnings by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard_view;
DROP VIEW IF EXISTS public.yapper_leaderboard_view;

-- Recreate leaderboard view with SECURITY INVOKER
CREATE VIEW public.leaderboard_view 
WITH (security_invoker = true) AS
SELECT 
  p.username,
  p.avatar_url,
  up.user_id,
  up.total_points,
  up.daily_streak
FROM public.user_points up
LEFT JOIN public.profiles p ON p.user_id = up.user_id
ORDER BY up.total_points DESC;

-- Recreate yapper leaderboard view with SECURITY INVOKER
CREATE VIEW public.yapper_leaderboard_view 
WITH (security_invoker = true) AS
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

-- Grant select on views
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;
GRANT SELECT ON public.yapper_leaderboard_view TO authenticated;
GRANT SELECT ON public.yapper_leaderboard_view TO anon;