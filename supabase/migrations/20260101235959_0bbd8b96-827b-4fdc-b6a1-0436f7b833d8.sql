-- 1) Ensure realtime emits full rows where we rely on payload.new
ALTER TABLE public.user_points REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.x_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.x_post_rewards REPLICA IDENTITY FULL;
ALTER TABLE public.arena_boosts REPLICA IDENTITY FULL;

-- 2) Enable realtime streams for missing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'referrals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'x_post_rewards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.x_post_rewards;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_boosts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_boosts;
  END IF;
END $$;

-- 3) Allow admins to see referral rows in admin screens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND policyname = 'Admins can view all referrals'
  ) THEN
    CREATE POLICY "Admins can view all referrals"
    ON public.referrals
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 4) Backfill referral rewards so existing referrals immediately grant boosts/ARX-P
WITH referral_totals AS (
  SELECT
    referrer_id AS user_id,
    COUNT(*)::int AS cnt
  FROM public.referrals
  GROUP BY referrer_id
),
insert_missing AS (
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
  SELECT
    rt.user_id,
    LEAST(rt.cnt * 5, 50),
    (rt.cnt * 100)::numeric,
    (rt.cnt * 100)::numeric,
    0,
    0,
    0,
    0,
    0
  FROM referral_totals rt
  LEFT JOIN public.user_points up ON up.user_id = rt.user_id
  WHERE up.user_id IS NULL
  RETURNING user_id
),
updates AS (
  SELECT
    up.user_id,
    LEAST(rt.cnt * 5, 50) AS new_boost,
    (rt.cnt * 100)::numeric AS new_ref_points
  FROM public.user_points up
  JOIN referral_totals rt ON rt.user_id = up.user_id
)
UPDATE public.user_points up
SET
  referral_bonus_percentage = u.new_boost,
  total_points = (up.total_points - up.referral_points + u.new_ref_points),
  referral_points = u.new_ref_points,
  updated_at = now()
FROM updates u
WHERE up.user_id = u.user_id;
