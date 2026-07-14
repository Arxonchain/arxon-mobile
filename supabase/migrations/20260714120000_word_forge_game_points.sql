-- Word Forge dictionary table for server-side validation
CREATE TABLE IF NOT EXISTS public.word_forge_dictionary (
  word TEXT PRIMARY KEY
);

ALTER TABLE public.word_forge_dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dictionary" ON public.word_forge_dictionary FOR SELECT USING (true);

-- Word Forge: game_points category + cloud progress table

ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS game_points NUMERIC NOT NULL DEFAULT 0;

-- Update total_points trigger to include game_points
CREATE OR REPLACE FUNCTION public.normalize_user_points_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_points := COALESCE(NEW.mining_points, 0)
    + COALESCE(NEW.task_points, 0)
    + COALESCE(NEW.social_points, 0)
    + COALESCE(NEW.referral_points, 0)
    + COALESCE(NEW.game_points, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_user_points ON public.user_points;
CREATE TRIGGER trg_normalize_user_points
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.normalize_user_points_totals();

-- Word Forge progress (synced per user)
CREATE TABLE IF NOT EXISTS public.word_forge_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  best_level INT NOT NULL DEFAULT 1,
  current_level INT NOT NULL DEFAULT 1,
  total_words INT NOT NULL DEFAULT 0,
  session_high INT NOT NULL DEFAULT 0,
  hints_left INT NOT NULL DEFAULT 3,
  shuffles_left INT NOT NULL DEFAULT 2,
  best_streak INT NOT NULL DEFAULT 0,
  longest_word TEXT NOT NULL DEFAULT '',
  daily_completed_date DATE,
  tutorial_completed BOOLEAN NOT NULL DEFAULT false,
  unlocked_skins INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.word_forge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own forge progress"
  ON public.word_forge_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own forge progress"
  ON public.word_forge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own forge progress"
  ON public.word_forge_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Word Forge leaderboard view
CREATE OR REPLACE VIEW public.word_forge_leaderboard AS
SELECT
  p.user_id,
  pr.username,
  pr.avatar_url,
  p.best_level,
  p.total_words,
  p.best_streak,
  RANK() OVER (ORDER BY p.best_level DESC, p.total_words DESC) AS rank
FROM public.word_forge_progress p
LEFT JOIN public.profiles pr ON pr.id = p.user_id
WHERE p.best_level > 1 OR p.total_words > 0;

-- Update increment_user_points for game type
DROP FUNCTION IF EXISTS public.increment_user_points(UUID, NUMERIC, TEXT);

CREATE FUNCTION public.increment_user_points(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS user_points
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_increment NUMERIC := 500;
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_increment);

  IF p_type = 'mining' THEN
    UPDATE user_points SET
      mining_points = LEAST(mining_points + v_capped_amount, 100000),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points SET
      task_points = LEAST(task_points + v_capped_amount, 1000),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points SET
      social_points = LEAST(social_points + v_capped_amount, 100000),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points SET
      referral_points = LEAST(referral_points + v_capped_amount, 100000),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'game' THEN
    UPDATE user_points SET
      game_points = LEAST(game_points + v_capped_amount, 100000),
      updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;
