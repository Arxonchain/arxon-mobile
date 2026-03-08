-- Enable REPLICA IDENTITY FULL for complete real-time sync
ALTER TABLE public.nexus_transactions REPLICA IDENTITY FULL;