-- Create a function to get exact user rank efficiently using COUNT
-- This works for ANY number of users without row limits
CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_points_val numeric;
  user_created_at timestamptz;
  user_rank integer;
BEGIN
  -- Get the user's total points and created_at for tie-breaking
  SELECT up.total_points, up.created_at
  INTO user_points_val, user_created_at
  FROM user_points up
  WHERE up.user_id = p_user_id;
  
  -- If user has no points record, they're at the end
  IF user_points_val IS NULL THEN
    SELECT COUNT(*) + 1 INTO user_rank FROM user_points;
    RETURN user_rank;
  END IF;
  
  -- Count how many users have more points, or same points but earlier created_at (tie-breaker)
  -- Rank = number of users ahead + 1
  SELECT COUNT(*) + 1 INTO user_rank
  FROM user_points up2
  WHERE up2.total_points > user_points_val
     OR (up2.total_points = user_points_val AND up2.created_at < user_created_at AND up2.user_id != p_user_id);
  
  RETURN user_rank;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid) TO authenticated;