
-- First drop the existing function, then recreate with same return type
DROP FUNCTION IF EXISTS public.increment_user_points(UUID, NUMERIC, TEXT);

-- Create a comprehensive trigger to validate user_points against actual data
CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_actual_mining_points NUMERIC;
  v_actual_task_points NUMERIC;
  v_max_mining_limit NUMERIC := 100000;
  v_max_task_limit NUMERIC := 1000;
  v_max_social_limit NUMERIC := 100000;
  v_max_referral_limit NUMERIC := 100000;
BEGIN
  -- Calculate actual mining points from mining_sessions
  SELECT COALESCE(SUM(arx_mined), 0) INTO v_actual_mining_points
  FROM public.mining_sessions
  WHERE user_id = NEW.user_id;
  
  -- Calculate actual task points from completed user_tasks
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_actual_task_points
  FROM public.user_tasks
  WHERE user_id = NEW.user_id AND status = 'completed';
  
  -- Enforce mining points cannot exceed actual + 50% tolerance for boosts
  IF NEW.mining_points > v_actual_mining_points * 1.5 + 100 THEN
    NEW.mining_points := v_actual_mining_points;
  END IF;
  
  -- Enforce task points cannot exceed actual + small buffer
  IF NEW.task_points > v_actual_task_points + 50 THEN
    NEW.task_points := v_actual_task_points;
  END IF;
  
  -- Enforce reasonable caps
  IF NEW.mining_points > v_max_mining_limit THEN
    NEW.mining_points := v_max_mining_limit;
  END IF;
  
  IF NEW.task_points > v_max_task_limit THEN
    NEW.task_points := v_max_task_limit;
  END IF;
  
  IF NEW.social_points > v_max_social_limit THEN
    NEW.social_points := v_max_social_limit;
  END IF;
  
  IF NEW.referral_points > v_max_referral_limit THEN
    NEW.referral_points := v_max_referral_limit;
  END IF;
  
  -- Recalculate total to ensure consistency
  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points + NEW.referral_points;
  
  -- Cap total at 1 billion
  IF NEW.total_points > 1000000000 THEN
    NEW.total_points := 1000000000;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_validate_user_points ON public.user_points;

CREATE TRIGGER trg_validate_user_points
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_points_integrity();

-- Recreate increment_user_points with the original return type but stricter validation
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
    UPDATE user_points
    SET 
      mining_points = LEAST(mining_points + v_capped_amount, 100000),
      total_points = LEAST(total_points + v_capped_amount, 1000000000),
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;
  ELSIF p_type = 'task' THEN
    UPDATE user_points
    SET 
      task_points = LEAST(task_points + v_capped_amount, 1000),
      total_points = LEAST(total_points + v_capped_amount, 1000000000),
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;
  ELSIF p_type = 'social' THEN
    UPDATE user_points
    SET 
      social_points = LEAST(social_points + v_capped_amount, 100000),
      total_points = LEAST(total_points + v_capped_amount, 1000000000),
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;
  ELSIF p_type = 'referral' THEN
    UPDATE user_points
    SET 
      referral_points = LEAST(referral_points + v_capped_amount, 100000),
      total_points = LEAST(total_points + v_capped_amount, 1000000000),
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;
  ELSE
    UPDATE user_points
    SET 
      total_points = LEAST(total_points + v_capped_amount, 1000000000),
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;
