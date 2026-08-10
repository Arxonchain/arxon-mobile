-- Word Forge: lock consumable sync + harden apply_word_forge_stats

CREATE OR REPLACE FUNCTION public.sync_word_forge_consumables(
  p_hints_left INT DEFAULT NULL,
  p_shuffles_left INT DEFAULT NULL,
  p_tutorial_completed BOOLEAN DEFAULT NULL,
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

  SELECT * INTO v_row FROM public.word_forge_progress WHERE user_id = v_user_id FOR UPDATE;

  -- Only allow decreasing (or equal) consumables from client — never refill via this RPC
  UPDATE public.word_forge_progress SET
    hints_left = CASE
      WHEN p_hints_left IS NULL THEN hints_left
      ELSE LEAST(hints_left, GREATEST(p_hints_left, 0), 10)
    END,
    shuffles_left = CASE
      WHEN p_shuffles_left IS NULL THEN shuffles_left
      ELSE LEAST(shuffles_left, GREATEST(p_shuffles_left, 0), 10)
    END,
    tutorial_completed = COALESCE(tutorial_completed, false) OR COALESCE(p_tutorial_completed, false),
    -- Ignore client daily_*/unlocked_skins (server edge functions only)
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_word_forge_consumables(INT, INT, BOOLEAN, DATE, INT, INT) TO authenticated;

-- apply_word_forge_stats: only allow monotonic best_level from service path; cap increases
CREATE OR REPLACE FUNCTION public.apply_word_forge_stats(
  p_user_id UUID,
  p_words_delta INT DEFAULT 0,
  p_best_streak INT DEFAULT NULL,
  p_longest_word TEXT DEFAULT NULL,
  p_best_level INT DEFAULT NULL,
  p_current_level INT DEFAULT NULL,
  p_session_high INT DEFAULT NULL
)
RETURNS public.word_forge_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.word_forge_progress%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  -- Only service_role (auth.uid null with service key) or matching user via edge service path
  IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM p_user_id
     AND NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.word_forge_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.word_forge_progress SET
    total_words = GREATEST(0, total_words + GREATEST(COALESCE(p_words_delta, 0), 0)),
    best_streak = CASE WHEN p_best_streak IS NOT NULL THEN GREATEST(best_streak, LEAST(p_best_streak, 50)) ELSE best_streak END,
    longest_word = CASE
      WHEN p_longest_word IS NOT NULL AND length(p_longest_word) > COALESCE(length(longest_word), 0)
      THEN upper(left(p_longest_word, 32)) ELSE longest_word END,
    -- Level advances only by +1 max per call from validated clears (service role typically)
    best_level = CASE
      WHEN p_best_level IS NOT NULL AND auth.role() = 'service_role'
      THEN LEAST(GREATEST(best_level, LEAST(p_best_level, best_level + 1, 999)), 999)
      ELSE best_level END,
    current_level = CASE
      WHEN p_current_level IS NOT NULL AND auth.role() = 'service_role'
      THEN LEAST(GREATEST(1, p_current_level), GREATEST(best_level, 1) + 1, 999)
      ELSE current_level END,
    session_high = CASE
      WHEN p_session_high IS NOT NULL AND auth.role() = 'service_role'
      THEN GREATEST(session_high, LEAST(p_session_high, session_high + 500, 100000))
      ELSE session_high END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_word_forge_stats(UUID, INT, INT, TEXT, INT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_word_forge_stats(UUID, INT, INT, TEXT, INT, INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.apply_word_forge_stats(UUID, INT, INT, TEXT, INT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_word_forge_stats(UUID, INT, INT, TEXT, INT, INT, INT) TO service_role;
