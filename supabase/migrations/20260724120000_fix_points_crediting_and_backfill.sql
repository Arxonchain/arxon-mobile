-- Fix points not adding to user balances (mobile + web).
-- Root causes addressed:
-- 1) validate_user_points_integrity omitted game_points from total_points
-- 2) Conflicting normalize triggers on user_points
-- 3) increment_user_points could no-op when user_points row missing
-- 4) Word Forge dictionary gaps blocked server credits
-- 5) Uncredited mining sessions left balances stale

-- ── 1. Consolidate total_points normalization (includes game_points) ─────────
CREATE OR REPLACE FUNCTION public.normalize_user_points_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_points := GREATEST(0,
    COALESCE(NEW.mining_points, 0)
    + COALESCE(NEW.task_points, 0)
    + COALESCE(NEW.social_points, 0)
    + COALESCE(NEW.referral_points, 0)
    + COALESCE(NEW.game_points, 0)
  );
  IF NEW.total_points > 10000000 THEN
    NEW.total_points := 10000000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_user_points ON public.user_points;
DROP TRIGGER IF EXISTS trg_normalize_user_points_totals ON public.user_points;
CREATE TRIGGER trg_normalize_user_points_totals
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.normalize_user_points_totals();

-- ── 2. Integrity trigger must include game_points ───────────────────────────
CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_is_service_role BOOLEAN := (current_user = 'service_role');
  v_allow_decrease BOOLEAN := v_is_service_role
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));
BEGIN
  IF TG_OP = 'UPDATE' AND NOT v_allow_decrease THEN
    IF NEW.mining_points < OLD.mining_points THEN NEW.mining_points := OLD.mining_points; END IF;
    IF NEW.task_points < OLD.task_points THEN NEW.task_points := OLD.task_points; END IF;
    IF NEW.social_points < OLD.social_points THEN NEW.social_points := OLD.social_points; END IF;
    IF NEW.referral_points < OLD.referral_points THEN NEW.referral_points := OLD.referral_points; END IF;
    IF NEW.game_points < OLD.game_points THEN NEW.game_points := OLD.game_points; END IF;
  END IF;

  NEW.mining_points := LEAST(GREATEST(COALESCE(NEW.mining_points, 0), 0), 1000000);
  NEW.task_points := LEAST(GREATEST(COALESCE(NEW.task_points, 0), 0), 100000);
  NEW.social_points := LEAST(GREATEST(COALESCE(NEW.social_points, 0), 0), 1000000);
  NEW.referral_points := LEAST(GREATEST(COALESCE(NEW.referral_points, 0), 0), 1000000);
  NEW.game_points := LEAST(GREATEST(COALESCE(NEW.game_points, 0), 0), 1000000);

  -- Let normalize trigger set total; keep categories consistent here for legacy paths
  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points + NEW.referral_points + NEW.game_points;
  IF NEW.total_points > 10000000 THEN NEW.total_points := 10000000; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_points ON public.user_points;
CREATE TRIGGER trg_validate_user_points
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.validate_user_points_integrity();

-- ── 3. Robust increment_user_points ─────────────────────────────────────────
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
  ELSE
    RAISE EXCEPTION 'Invalid point type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_points(UUID, NUMERIC, TEXT) TO service_role;

-- ── 4. Idempotent Word Forge word credits ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.word_forge_word_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL,
  word TEXT NOT NULL,
  payout NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, attempt_id, word)
);

ALTER TABLE public.word_forge_word_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own forge word credits"
  ON public.word_forge_word_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_word_forge_word_credits_user ON public.word_forge_word_credits(user_id);

-- ── 5. Backfill: Word Forge game_points from progress (conservative min 10/word) ─
WITH owed AS (
  SELECT
    wfp.user_id,
    GREATEST(0, (wfp.total_words * 10) - COALESCE(up.game_points, 0)) AS delta
  FROM public.word_forge_progress wfp
  JOIN public.user_points up ON up.user_id = wfp.user_id
  WHERE wfp.total_words > 0
    AND COALESCE(up.game_points, 0) < wfp.total_words * 10
)
UPDATE public.user_points up
SET
  game_points = up.game_points + owed.delta,
  updated_at = now()
FROM owed
WHERE up.user_id = owed.user_id
  AND owed.delta > 0;

-- ── 6. Backfill: fix any total_points drift ─────────────────────────────────
UPDATE public.user_points up
SET
  total_points = LEAST(10000000, GREATEST(0,
    COALESCE(mining_points, 0) + COALESCE(task_points, 0) + COALESCE(social_points, 0)
    + COALESCE(referral_points, 0) + COALESCE(game_points, 0)
  )),
  updated_at = now()
WHERE ABS(
  COALESCE(total_points, 0) - (
    COALESCE(mining_points, 0) + COALESCE(task_points, 0) + COALESCE(social_points, 0)
    + COALESCE(referral_points, 0) + COALESCE(game_points, 0)
  )
) > 1;
