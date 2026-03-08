-- Grant SELECT access to the arena_team_leaderboard view for all authenticated users
-- This is a public leaderboard view that should be accessible to everyone
GRANT SELECT ON public.arena_team_leaderboard TO authenticated;
GRANT SELECT ON public.arena_team_leaderboard TO anon;