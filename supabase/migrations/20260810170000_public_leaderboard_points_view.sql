-- Phase 4: public leaderboard view instead of full user_points SELECT
CREATE OR REPLACE VIEW public.public_leaderboard_points
WITH (security_invoker = true) AS
SELECT user_id, total_points, updated_at
FROM public.user_points;

GRANT SELECT ON public.public_leaderboard_points TO anon, authenticated;

DROP POLICY IF EXISTS "Public leaderboard read" ON public.user_points;
DROP POLICY IF EXISTS "leaderboard_public_read" ON public.user_points;
