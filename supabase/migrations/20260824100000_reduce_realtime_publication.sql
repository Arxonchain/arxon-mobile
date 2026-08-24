-- Reduce Realtime WAL fan-out: drop tables with no client postgres_changes
-- subscriptions (or replaced by polling). Filtered subs still need publication
-- rows for tables we keep.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'points_audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.points_audit_log;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_earnings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.arena_earnings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'daily_checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.daily_checkins;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_tasks;
  END IF;
END $$;
