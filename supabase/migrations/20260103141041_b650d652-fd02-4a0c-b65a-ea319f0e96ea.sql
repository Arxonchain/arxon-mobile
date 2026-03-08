-- Drop and recreate leaderboard_view as a SECURITY DEFINER view to bypass RLS
-- This allows anyone to see the leaderboard while keeping underlying tables protected

DROP VIEW IF EXISTS public.leaderboard_view;
CREATE VIEW public.leaderboard_view WITH (security_invoker = false) AS
SELECT 
    p.username,
    p.avatar_url,
    up.user_id,
    up.total_points,
    up.daily_streak
FROM user_points up
LEFT JOIN profiles p ON p.user_id = up.user_id
ORDER BY up.total_points DESC;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Drop and recreate yapper_leaderboard_view as a SECURITY DEFINER view
DROP VIEW IF EXISTS public.yapper_leaderboard_view;
CREATE VIEW public.yapper_leaderboard_view WITH (security_invoker = false) AS
SELECT 
    xp.user_id,
    xp.username,
    p.avatar_url,
    xp.boost_percentage,
    xp.qualified_posts_today,
    xp.average_engagement,
    xp.viral_bonus,
    up.social_points
FROM x_profiles xp
LEFT JOIN profiles p ON p.user_id = xp.user_id
LEFT JOIN user_points up ON up.user_id = xp.user_id
ORDER BY up.social_points DESC NULLS LAST;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.yapper_leaderboard_view TO authenticated;
GRANT SELECT ON public.yapper_leaderboard_view TO anon;