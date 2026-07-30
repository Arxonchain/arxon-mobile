-- Game module security & correctness fixes (Arena + Word Forge)

-- ── 1. Arena points bucket (winnings separate from mining) ───────────────────
ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS arena_points NUMERIC NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.normalize_user_points_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_points := GREATEST(0,
    COALESCE(NEW.mining_points, 0)
    + COALESCE(NEW.task_points, 0)
    + COALESCE(NEW.social_points, 0)
    + COALESCE(NEW.referral_points, 0)
    + COALESCE(NEW.game_points, 0)
    + COALESCE(NEW.arena_points, 0)
  );
  IF NEW.total_points > 10000000 THEN
    NEW.total_points := 10000000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_is_service_role BOOLEAN := (current_user = 'service_role');
  v_arena_stake BOOLEAN := (current_setting('app.arena_stake', true) = 'true');
  v_allow_decrease BOOLEAN := v_is_service_role
    OR v_arena_stake
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));
BEGIN
  IF TG_OP = 'UPDATE' AND NOT v_allow_decrease THEN
    IF NEW.mining_points < OLD.mining_points THEN NEW.mining_points := OLD.mining_points; END IF;
    IF NEW.task_points < OLD.task_points THEN NEW.task_points := OLD.task_points; END IF;
    IF NEW.social_points < OLD.social_points THEN NEW.social_points := OLD.social_points; END IF;
    IF NEW.referral_points < OLD.referral_points THEN NEW.referral_points := OLD.referral_points; END IF;
    IF NEW.game_points < OLD.game_points THEN NEW.game_points := OLD.game_points; END IF;
    IF NEW.arena_points < OLD.arena_points THEN NEW.arena_points := OLD.arena_points; END IF;
  END IF;

  NEW.mining_points := LEAST(GREATEST(COALESCE(NEW.mining_points, 0), 0), 1000000);
  NEW.task_points := LEAST(GREATEST(COALESCE(NEW.task_points, 0), 0), 100000);
  NEW.social_points := LEAST(GREATEST(COALESCE(NEW.social_points, 0), 0), 1000000);
  NEW.referral_points := LEAST(GREATEST(COALESCE(NEW.referral_points, 0), 0), 1000000);
  NEW.game_points := LEAST(GREATEST(COALESCE(NEW.game_points, 0), 0), 1000000);
  NEW.arena_points := LEAST(GREATEST(COALESCE(NEW.arena_points, 0), 0), 1000000);

  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points
    + NEW.referral_points + NEW.game_points + NEW.arena_points;
  IF NEW.total_points > 10000000 THEN NEW.total_points := 10000000; END IF;

  RETURN NEW;
END;
$$;

-- ── 2. increment_user_points: arena type + ensure row exists ─────────────────
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
  v_max_task_increment NUMERIC := 10000;
  v_capped_amount NUMERIC;
  v_result user_points;
BEGIN
  INSERT INTO public.user_points (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_type = 'task' THEN
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_task_increment);
  ELSE
    v_capped_amount := LEAST(GREATEST(p_amount, 0), v_max_increment);
  END IF;

  IF v_capped_amount <= 0 THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = p_user_id;
    RETURN v_result;
  END IF;

  IF p_type = 'mining' THEN
    UPDATE user_points SET mining_points = GREATEST(mining_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points SET task_points = GREATEST(task_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points SET social_points = GREATEST(social_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points SET referral_points = GREATEST(referral_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'game' THEN
    UPDATE user_points SET game_points = GREATEST(game_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSIF p_type = 'arena' THEN
    UPDATE user_points SET arena_points = GREATEST(arena_points, 0) + v_capped_amount, updated_at = now()
    WHERE user_id = p_user_id RETURNING * INTO v_result;
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;

-- ── 3. Deduct points for arena stake (multi-bucket) ──────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_user_points_for_arena(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_left NUMERIC := p_amount;
  m NUMERIC; t NUMERIC; s NUMERIC; r NUMERIC; g NUMERIC; a NUMERIC;
  take NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid stake amount'; END IF;
  PERFORM set_config('app.arena_stake', 'true', true);

  SELECT mining_points, task_points, social_points, referral_points, game_points, arena_points
  INTO m, t, s, r, g, a
  FROM public.user_points WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points'; END IF;
  IF (m + t + s + r + g + a) < p_amount THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  take := LEAST(v_left, m); m := m - take; v_left := v_left - take;
  take := LEAST(v_left, t); t := t - take; v_left := v_left - take;
  take := LEAST(v_left, s); s := s - take; v_left := v_left - take;
  take := LEAST(v_left, r); r := r - take; v_left := v_left - take;
  take := LEAST(v_left, g); g := g - take; v_left := v_left - take;
  take := LEAST(v_left, a); a := a - take; v_left := v_left - take;
  IF v_left > 0 THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  UPDATE public.user_points SET
    mining_points = m, task_points = t, social_points = s,
    referral_points = r, game_points = g, arena_points = a,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points_for_arena(UUID, NUMERIC) TO service_role;

-- ── 4. Atomic arena vote RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cast_arena_vote(
  p_battle_id UUID,
  p_side TEXT,
  p_amount NUMERIC
)
RETURNS public.arena_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_battle public.arena_battles%ROWTYPE;
  v_vote public.arena_votes%ROWTYPE;
  v_multiplier NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_side NOT IN ('a', 'b', 'c') THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum stake is 1000 ARX-P'; END IF;
  IF p_amount > 100000 THEN RAISE EXCEPTION 'Maximum stake is 100000 ARX-P'; END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.arena_votes WHERE battle_id = p_battle_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'You already voted on this prediction';
  END IF;

  SELECT * INTO v_battle FROM public.arena_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Battle not found'; END IF;
  IF v_battle.winner_side IS NOT NULL THEN RAISE EXCEPTION 'Voting is closed'; END IF;
  IF NOW() < v_battle.starts_at THEN RAISE EXCEPTION 'Voting has not started yet'; END IF;
  IF NOW() > v_battle.ends_at OR NOT v_battle.is_active THEN RAISE EXCEPTION 'Voting is closed'; END IF;

  PERFORM public.deduct_user_points_for_arena(v_user_id, p_amount);

  v_multiplier := public.calculate_early_stake_multiplier(p_battle_id, NOW());

  INSERT INTO public.arena_votes (battle_id, user_id, side, power_spent, early_stake_multiplier)
  VALUES (p_battle_id, v_user_id, p_side, p_amount, v_multiplier)
  RETURNING * INTO v_vote;

  IF p_side = 'a' THEN
    UPDATE public.arena_battles SET
      side_a_power = side_a_power + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  ELSIF p_side = 'b' THEN
    UPDATE public.arena_battles SET
      side_b_power = side_b_power + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  ELSE
    UPDATE public.arena_battles SET
      side_c_power = COALESCE(side_c_power, 0) + p_amount,
      total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = p_battle_id;
  END IF;

  RETURN v_vote;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_arena_vote(UUID, TEXT, NUMERIC) TO authenticated;

-- Remove broken AFTER trigger that only touched total_points
DROP TRIGGER IF EXISTS on_arena_vote_insert ON public.arena_votes;

-- Votes only via cast_arena_vote RPC (no direct client INSERT)
DROP POLICY IF EXISTS "Users can cast their own votes" ON public.arena_votes;

-- ── 5. Side C constraint ─────────────────────────────────────────────────────
ALTER TABLE public.arena_votes DROP CONSTRAINT IF EXISTS arena_votes_side_check;
ALTER TABLE public.arena_votes
  ADD CONSTRAINT arena_votes_side_check CHECK (side IN ('a', 'b', 'c'));

ALTER TABLE public.arena_votes DROP CONSTRAINT IF EXISTS arena_votes_power_spent_check;
ALTER TABLE public.arena_votes
  ADD CONSTRAINT arena_votes_power_spent_check CHECK (power_spent >= 1000 AND power_spent <= 100000);

-- ── 6. Word Forge leaderboard view fix + index ───────────────────────────────
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
LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
WHERE p.best_level > 1 OR p.total_words > 0;

CREATE INDEX IF NOT EXISTS idx_word_forge_progress_leaderboard
  ON public.word_forge_progress (best_level DESC, total_words DESC);

-- ── 7. Word Forge progress: users read-only; stats via service role ──────────
DROP POLICY IF EXISTS "Users upsert own forge progress" ON public.word_forge_progress;
DROP POLICY IF EXISTS "Users update own forge progress" ON public.word_forge_progress;

CREATE POLICY "Users read own forge progress"
  ON public.word_forge_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Consumables-only sync for clients (stats updated by edge functions)
CREATE OR REPLACE FUNCTION public.sync_word_forge_consumables(
  p_hints_left INT,
  p_shuffles_left INT,
  p_tutorial_completed BOOLEAN,
  p_daily_completed_date DATE DEFAULT NULL,
  p_daily_streak INT DEFAULT NULL,
  p_unlocked_skins INT DEFAULT NULL
)
RETURNS public.word_forge_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.word_forge_progress%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.word_forge_progress (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.word_forge_progress SET
    hints_left = LEAST(GREATEST(COALESCE(p_hints_left, hints_left), 0), 10),
    shuffles_left = LEAST(GREATEST(COALESCE(p_shuffles_left, shuffles_left), 0), 10),
    tutorial_completed = COALESCE(p_tutorial_completed, tutorial_completed),
    daily_completed_date = COALESCE(p_daily_completed_date, daily_completed_date),
    daily_streak = CASE WHEN p_daily_streak IS NOT NULL THEN GREATEST(0, p_daily_streak) ELSE daily_streak END,
    unlocked_skins = CASE WHEN p_unlocked_skins IS NOT NULL THEN LEAST(GREATEST(p_unlocked_skins, 1), 5) ELSE unlocked_skins END,
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_word_forge_consumables(INT, INT, BOOLEAN, DATE, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_word_forge_stats(
  p_user_id UUID,
  p_words_delta INT DEFAULT 0,
  p_best_streak INT DEFAULT NULL,
  p_longest_word TEXT DEFAULT NULL,
  p_best_level INT DEFAULT NULL,
  p_current_level INT DEFAULT NULL,
  p_session_high INT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.word_forge_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.word_forge_progress SET
    total_words = total_words + GREATEST(0, COALESCE(p_words_delta, 0)),
    best_streak = CASE WHEN p_best_streak IS NOT NULL THEN GREATEST(best_streak, p_best_streak) ELSE best_streak END,
    longest_word = CASE
      WHEN p_longest_word IS NOT NULL AND length(p_longest_word) > length(longest_word) THEN p_longest_word
      ELSE longest_word
    END,
    best_level = CASE WHEN p_best_level IS NOT NULL THEN GREATEST(best_level, p_best_level) ELSE best_level END,
    current_level = CASE WHEN p_current_level IS NOT NULL THEN GREATEST(current_level, p_current_level) ELSE current_level END,
    session_high = CASE WHEN p_session_high IS NOT NULL THEN GREATEST(session_high, p_session_high) ELSE session_high END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_word_forge_stats(UUID, INT, INT, TEXT, INT, INT, INT) TO service_role;

-- ── 8. Daily completion + hint claims ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.word_forge_daily_completions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  bonus_awarded NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, completion_date)
);

ALTER TABLE public.word_forge_daily_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own daily completions"
  ON public.word_forge_daily_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.word_forge_hint_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_key TEXT NOT NULL,
  reward INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_key)
);

ALTER TABLE public.word_forge_hint_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own hint claims"
  ON public.word_forge_hint_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_word_forge_hint_claims_user ON public.word_forge_hint_claims(user_id);

-- hint_task_claims column on progress for cloud merge
ALTER TABLE public.word_forge_progress
  ADD COLUMN IF NOT EXISTS hint_task_claims JSONB NOT NULL DEFAULT '{}'::jsonb;
