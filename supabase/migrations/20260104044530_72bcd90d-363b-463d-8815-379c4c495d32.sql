-- Create atomic check-in function to handle streak logic safely
CREATE OR REPLACE FUNCTION public.perform_daily_checkin(p_user_id uuid)
RETURNS TABLE(
  success boolean,
  streak_day integer,
  points_awarded numeric,
  streak_boost integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
  v_last_checkin date;
  v_current_streak integer := 0;
  v_new_streak integer := 1;
  v_base_points numeric := 5;
  v_streak_bonus numeric := 0;
  v_total_points numeric := 0;
  v_new_boost integer := 0;
  v_already_checked boolean := false;
BEGIN
  -- Check if already checked in today
  SELECT EXISTS(
    SELECT 1 FROM public.daily_checkins 
    WHERE user_id = p_user_id AND checkin_date = v_today
  ) INTO v_already_checked;

  IF v_already_checked THEN
    RETURN QUERY SELECT false, 0, 0::numeric, 0, 'Already checked in today'::text;
    RETURN;
  END IF;

  -- Get last check-in date and current streak
  SELECT last_checkin_date, daily_streak 
  INTO v_last_checkin, v_current_streak
  FROM public.user_points 
  WHERE user_id = p_user_id;

  -- Calculate new streak
  IF v_last_checkin = v_yesterday THEN
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_new_streak := 1; -- Reset streak if missed a day
  END IF;

  -- Calculate points: base + streak bonus (1 point per streak day, capped at 30)
  v_streak_bonus := LEAST(v_new_streak, 30);
  v_total_points := v_base_points + v_streak_bonus;

  -- Calculate streak boost: +1% per day, capped at 30%
  v_new_boost := LEAST(v_new_streak, 30);

  -- Insert check-in record
  INSERT INTO public.daily_checkins (user_id, checkin_date, points_awarded, streak_day)
  VALUES (p_user_id, v_today, v_total_points, v_new_streak);

  -- Update user_points atomically
  UPDATE public.user_points
  SET 
    daily_streak = v_new_streak,
    last_checkin_date = v_today,
    task_points = task_points + v_total_points,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- If no row updated, insert new user_points record
  IF NOT FOUND THEN
    INSERT INTO public.user_points (user_id, daily_streak, last_checkin_date, task_points)
    VALUES (p_user_id, v_new_streak, v_today, v_total_points);
  END IF;

  RETURN QUERY SELECT true, v_new_streak, v_total_points, v_new_boost, 
    ('Checked in! Day ' || v_new_streak || ' streak')::text;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.perform_daily_checkin(uuid) TO authenticated;