-- Fix security linter: ensure views run with invoker permissions (RLS of the querying user)

ALTER VIEW public.leaderboard_view SET (security_invoker = true);
ALTER VIEW public.yapper_leaderboard_view SET (security_invoker = true);
ALTER VIEW public.arena_team_leaderboard SET (security_invoker = true);
