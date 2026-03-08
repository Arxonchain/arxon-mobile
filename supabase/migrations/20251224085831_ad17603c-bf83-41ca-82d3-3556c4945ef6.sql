-- Ensure realtime delivers full UPDATE payloads for admin-forced session stops
ALTER TABLE public.mining_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.mining_settings REPLICA IDENTITY FULL;