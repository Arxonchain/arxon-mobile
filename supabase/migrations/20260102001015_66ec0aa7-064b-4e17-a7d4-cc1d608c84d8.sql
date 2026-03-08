-- Create trigger function to automatically award referral rewards
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_boost integer;
  new_boost integer;
  reward_points numeric := 100;
BEGIN
  -- Get current referral bonus percentage for the referrer
  SELECT COALESCE(referral_bonus_percentage, 0) INTO current_boost
  FROM public.user_points
  WHERE user_id = NEW.referrer_id;

  -- Calculate new boost (capped at 50%)
  new_boost := LEAST(COALESCE(current_boost, 0) + 5, 50);

  -- Upsert user_points for the referrer
  INSERT INTO public.user_points (
    user_id,
    referral_bonus_percentage,
    referral_points,
    total_points,
    daily_streak,
    mining_points,
    task_points,
    social_points,
    x_post_boost_percentage
  )
  VALUES (
    NEW.referrer_id,
    new_boost,
    reward_points,
    reward_points,
    0,
    0,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referral_bonus_percentage = new_boost,
    referral_points = user_points.referral_points + reward_points,
    total_points = user_points.total_points + reward_points,
    updated_at = now();

  -- Update the referral record with points awarded
  NEW.points_awarded := reward_points;

  RETURN NEW;
END;
$$;

-- Create the trigger on referrals table
DROP TRIGGER IF EXISTS on_new_referral ON public.referrals;
CREATE TRIGGER on_new_referral
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();