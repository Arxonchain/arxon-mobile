-- Fix search_path for increment_user_points RPC
DROP FUNCTION IF EXISTS public.increment_user_points(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.increment_user_points(
  p_user_id uuid,
  p_amount numeric,
  p_type text
)
RETURNS public.user_points
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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