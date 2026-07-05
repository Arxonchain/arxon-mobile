-- DEPTH_WATCH.sql — run in Supabase SQL Editor before enabling leaderboard persistence.

CREATE TABLE IF NOT EXISTS public.depth_watch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_reached int NOT NULL CHECK (level_reached >= 1),
  survival_seconds numeric NOT NULL CHECK (survival_seconds >= 0),
  character_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.depth_watch_unlocks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_depth_watch_runs_level ON public.depth_watch_runs (level_reached DESC, survival_seconds DESC);
CREATE INDEX IF NOT EXISTS idx_depth_watch_runs_user ON public.depth_watch_runs (user_id, created_at DESC);

ALTER TABLE public.depth_watch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depth_watch_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "depth_watch_runs_select" ON public.depth_watch_runs;
CREATE POLICY "depth_watch_runs_select" ON public.depth_watch_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "depth_watch_runs_insert_own" ON public.depth_watch_runs;
CREATE POLICY "depth_watch_runs_insert_own" ON public.depth_watch_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "depth_watch_unlocks_select_own" ON public.depth_watch_unlocks;
CREATE POLICY "depth_watch_unlocks_select_own" ON public.depth_watch_unlocks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "depth_watch_unlocks_insert_own" ON public.depth_watch_unlocks;
CREATE POLICY "depth_watch_unlocks_insert_own" ON public.depth_watch_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "depth_watch_unlocks_update_own" ON public.depth_watch_unlocks;
CREATE POLICY "depth_watch_unlocks_update_own" ON public.depth_watch_unlocks
  FOR UPDATE USING (auth.uid() = user_id);
