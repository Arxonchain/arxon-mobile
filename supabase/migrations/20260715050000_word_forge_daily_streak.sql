-- Track consecutive daily-challenge completions for Word Forge
ALTER TABLE public.word_forge_progress
  ADD COLUMN IF NOT EXISTS daily_streak integer NOT NULL DEFAULT 0;
