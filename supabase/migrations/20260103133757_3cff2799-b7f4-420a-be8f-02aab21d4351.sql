-- Clamp mining session accrual to prevent exploit/overflow
CREATE OR REPLACE FUNCTION public.clamp_mining_sessions_arx_mined()
RETURNS trigger AS $$
BEGIN
  IF NEW.arx_mined IS NULL THEN
    NEW.arx_mined := 0;
  END IF;
  NEW.arx_mined := LEAST(GREATEST(NEW.arx_mined, 0), 480);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_clamp_mining_sessions_arx_mined ON public.mining_sessions;
CREATE TRIGGER trg_clamp_mining_sessions_arx_mined
BEFORE INSERT OR UPDATE ON public.mining_sessions
FOR EACH ROW EXECUTE FUNCTION public.clamp_mining_sessions_arx_mined();


-- Normalize user_points to prevent numeric-as-string concatenation bugs from poisoning totals
CREATE OR REPLACE FUNCTION public.normalize_user_points_totals()
RETURNS trigger AS $$
BEGIN
  NEW.mining_points := COALESCE(NEW.mining_points, 0);
  NEW.task_points := COALESCE(NEW.task_points, 0);
  NEW.social_points := COALESCE(NEW.social_points, 0);
  NEW.referral_points := COALESCE(NEW.referral_points, 0);

  NEW.mining_points := GREATEST(NEW.mining_points, 0);
  NEW.task_points := GREATEST(NEW.task_points, 0);
  NEW.social_points := GREATEST(NEW.social_points, 0);
  NEW.referral_points := GREATEST(NEW.referral_points, 0);

  -- Hard safety caps (prevents insane values from ever being persisted again)
  NEW.mining_points := LEAST(NEW.mining_points, 1000000000);
  NEW.task_points := LEAST(NEW.task_points, 1000000000);
  NEW.social_points := LEAST(NEW.social_points, 1000000000);
  NEW.referral_points := LEAST(NEW.referral_points, 1000000000);

  NEW.total_points := NEW.mining_points + NEW.task_points + NEW.social_points + NEW.referral_points;
  NEW.updated_at := COALESCE(NEW.updated_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_user_points_totals ON public.user_points;
CREATE TRIGGER trg_normalize_user_points_totals
BEFORE INSERT OR UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.normalize_user_points_totals();


-- Safe, atomic point increments done server-side (prevents JS string concatenation + multi-device race issues)
CREATE OR REPLACE FUNCTION public.increment_user_points(
  p_user_id uuid,
  p_amount numeric,
  p_type text
)
RETURNS public.user_points
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.user_points;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Safety cap per call
  IF p_amount > 10000 THEN
    RAISE EXCEPTION 'amount_too_large';
  END IF;

  IF p_type NOT IN ('mining','task','social','referral') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;

  UPDATE public.user_points
  SET
    mining_points = mining_points + CASE WHEN p_type='mining' THEN p_amount ELSE 0 END,
    task_points = task_points + CASE WHEN p_type='task' THEN p_amount ELSE 0 END,
    social_points = social_points + CASE WHEN p_type='social' THEN p_amount ELSE 0 END,
    referral_points = referral_points + CASE WHEN p_type='referral' THEN p_amount ELSE 0 END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, mining_points, task_points, social_points, referral_points, updated_at)
    VALUES (
      p_user_id,
      CASE WHEN p_type='mining' THEN p_amount ELSE 0 END,
      CASE WHEN p_type='task' THEN p_amount ELSE 0 END,
      CASE WHEN p_type='social' THEN p_amount ELSE 0 END,
      CASE WHEN p_type='referral' THEN p_amount ELSE 0 END,
      now()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;