-- Create function to calculate early stake multiplier based on timing
CREATE OR REPLACE FUNCTION public.calculate_early_stake_multiplier(
  p_battle_id UUID,
  p_vote_time TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_starts_at TIMESTAMP WITH TIME ZONE;
  v_ends_at TIMESTAMP WITH TIME ZONE;
  v_total_duration NUMERIC;
  v_elapsed NUMERIC;
  v_timing_ratio NUMERIC;
  v_multiplier NUMERIC;
BEGIN
  SELECT starts_at, ends_at 
  INTO v_starts_at, v_ends_at
  FROM public.arena_battles
  WHERE id = p_battle_id;

  IF v_starts_at IS NULL THEN
    RETURN 1.0;
  END IF;

  v_total_duration := EXTRACT(EPOCH FROM (v_ends_at - v_starts_at));
  IF v_total_duration <= 0 THEN
    RETURN 1.0;
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (p_vote_time - v_starts_at));
  IF v_elapsed < 0 THEN
    v_elapsed := 0;
  END IF;

  v_timing_ratio := v_elapsed / v_total_duration;
  IF v_timing_ratio > 1 THEN
    v_timing_ratio := 1;
  END IF;

  -- Early stake multiplier: 1.5x at start, decreasing to 1.0x at end
  v_multiplier := 1.5 - (0.5 * v_timing_ratio);
  
  RETURN ROUND(v_multiplier, 2);
END;
$$;

-- Create trigger to auto-calculate early stake multiplier on vote insert
CREATE OR REPLACE FUNCTION public.set_early_stake_multiplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.early_stake_multiplier := calculate_early_stake_multiplier(NEW.battle_id, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vote_set_early_multiplier ON public.arena_votes;
CREATE TRIGGER on_vote_set_early_multiplier
  BEFORE INSERT ON public.arena_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_early_stake_multiplier();