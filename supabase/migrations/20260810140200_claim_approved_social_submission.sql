-- Secure social claim + flag for social status updates from DEFINER

CREATE OR REPLACE FUNCTION public.claim_approved_social_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sub public.social_submissions%ROWTYPE;
  v_points NUMERIC := 50;
  v_boost_add NUMERIC := 50; -- +50% mining boost (= +5 ARX-P/hr on base 10)
  v_result public.user_points%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM set_config('app.allow_social_claim', 'true', true);

  SELECT * INTO v_sub
  FROM public.social_submissions
  WHERE id = p_submission_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not approved');
  END IF;

  IF COALESCE(v_sub.points_awarded, 0) > 0 THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'already_claimed', true, 'points', 0, 'user_points', row_to_json(v_result));
  END IF;

  UPDATE public.social_submissions
  SET points_awarded = v_points,
      reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = p_submission_id
    AND COALESCE(points_awarded, 0) = 0;

  IF NOT FOUND THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'already_claimed', true, 'points', 0, 'user_points', row_to_json(v_result));
  END IF;

  SELECT * INTO v_result FROM public.increment_user_points(v_user_id, v_points, 'social');
  IF v_result IS NULL THEN
    UPDATE public.social_submissions SET points_awarded = 0 WHERE id = p_submission_id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to award points');
  END IF;

  UPDATE public.user_points
  SET x_post_boost_percentage = COALESCE(x_post_boost_percentage, 0) + v_boost_add,
      updated_at = now()
  WHERE user_id = v_user_id;

  PERFORM public.log_points_ledger_entry(
    v_user_id, v_points, 'social',
    'Social post claim (+' || v_points || ' ARX-P)',
    'social_submission', p_submission_id
  );

  SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'boost_added', v_boost_add,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_approved_social_submission(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_approved_social_submission(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_approved_social_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_approved_social_submission(uuid) TO service_role;

-- Allow DEFINER claim path to update points_awarded
CREATE OR REPLACE FUNCTION public.protect_social_submission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF current_setting('app.allow_social_claim', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
      RETURN NEW;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded THEN
      RAISE EXCEPTION 'Cannot modify submission status or points';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
