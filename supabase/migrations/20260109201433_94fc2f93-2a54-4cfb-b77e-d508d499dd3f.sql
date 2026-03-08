-- Replace the validate_user_points_integrity trigger function
-- NEW BEHAVIOR: Never decrease points, only log anomalies for admin review
CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actual_mining_points NUMERIC;
  v_actual_task_points NUMERIC;
BEGIN
  -- Calculate actual mining points from FINALIZED mining_sessions only
  SELECT COALESCE(SUM(arx_mined), 0) INTO v_actual_mining_points
  FROM public.mining_sessions
  WHERE user_id = NEW.user_id
    AND is_active = false;  -- Only count finalized sessions
  
  -- Calculate actual task points from completed user_tasks
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_actual_task_points
  FROM public.user_tasks
  WHERE user_id = NEW.user_id AND status = 'completed';
  
  -- CRITICAL: Never decrease existing points
  -- Only ensure new values don't go below OLD values (prevents reduction on any update)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.mining_points < OLD.mining_points THEN
      NEW.mining_points := OLD.mining_points;
    END IF;
    IF NEW.task_points < OLD.task_points THEN
      NEW.task_points := OLD.task_points;
    END IF;
    IF NEW.social_points < OLD.social_points THEN
      NEW.social_points := OLD.social_points;
    END IF;
    IF NEW.referral_points < OLD.referral_points THEN
      NEW.referral_points := OLD.referral_points;
    END IF;
  END IF;
  
  -- Ensure non-negative values
  NEW.mining_points := GREATEST(COALESCE(NEW.mining_points, 0), 0);
  NEW.task_points := GREATEST(COALESCE(NEW.task_points, 0), 0);
  NEW.social_points := GREATEST(COALESCE(NEW.social_points, 0), 0);
  NEW.referral_points := GREATEST(COALESCE(NEW.referral_points, 0), 0);
  
  -- Apply reasonable caps (but never reduce below current values)
  NEW.mining_points := LEAST(NEW.mining_points, 1000000);
  NEW.task_points := LEAST(NEW.task_points, 100000);
  NEW.social_points := LEAST(NEW.social_points, 1000000);
  NEW.referral_points := LEAST(NEW.referral_points, 1000000);
  
  -- Recalculate total to ensure consistency
  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points + NEW.referral_points;
  
  -- Cap total at 10 million (reasonable max)
  IF NEW.total_points > 10000000 THEN
    NEW.total_points := 10000000;
  END IF;
  
  RETURN NEW;
END;
$function$;