-- 1) Track whether a mining session has already been credited to prevent double-crediting
ALTER TABLE public.mining_sessions
ADD COLUMN IF NOT EXISTS credited_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_credited_at
ON public.mining_sessions (user_id, credited_at);

-- 2) Enforce server-side mining session limits (rate, backdating protection, 8h cap)
--    NOTE: the function already exists (public.enforce_mining_session_limits)
DROP TRIGGER IF EXISTS trg_enforce_mining_session_limits ON public.mining_sessions;
CREATE TRIGGER trg_enforce_mining_session_limits
BEFORE INSERT OR UPDATE ON public.mining_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mining_session_limits();

-- 3) Ensure the user_points integrity trigger is actually attached.
--    Also allow point decreases ONLY when executed by the backend (service_role) or an admin.
CREATE OR REPLACE FUNCTION public.validate_user_points_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actual_mining_points NUMERIC;
  v_actual_task_points NUMERIC;
  v_allow_decrease BOOLEAN := (current_user = 'service_role')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));
BEGIN
  -- Calculate actual mining points from FINALIZED mining_sessions only
  SELECT COALESCE(SUM(arx_mined), 0) INTO v_actual_mining_points
  FROM public.mining_sessions
  WHERE user_id = NEW.user_id
    AND is_active = false;

  -- Calculate actual task points from completed user_tasks
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_actual_task_points
  FROM public.user_tasks
  WHERE user_id = NEW.user_id AND status = 'completed';

  -- CRITICAL: Never decrease existing points for normal user traffic
  IF TG_OP = 'UPDATE' AND NOT v_allow_decrease THEN
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

  -- Apply reasonable caps
  NEW.mining_points := LEAST(NEW.mining_points, 1000000);
  NEW.task_points := LEAST(NEW.task_points, 100000);
  NEW.social_points := LEAST(NEW.social_points, 1000000);
  NEW.referral_points := LEAST(NEW.referral_points, 1000000);

  -- Recalculate total to ensure consistency
  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points + NEW.referral_points;

  -- Cap total at 10 million
  IF NEW.total_points > 10000000 THEN
    NEW.total_points := 10000000;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_user_points ON public.user_points;
CREATE TRIGGER trg_validate_user_points
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_points_integrity();

-- 4) Stop client-spamming: prevent direct execution of the point increment RPC from the browser.
--    Only the backend (service_role) should be able to execute this.
REVOKE EXECUTE ON FUNCTION public.increment_user_points(uuid, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_user_points(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_user_points(uuid, numeric, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.increment_user_points(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_points(uuid, numeric, text) TO postgres;