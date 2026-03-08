-- Enable realtime for all activity tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mining_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_submissions;