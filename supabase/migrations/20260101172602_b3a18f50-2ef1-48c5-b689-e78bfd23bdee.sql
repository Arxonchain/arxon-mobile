-- Add separate column for X post boost percentage (from social submissions)
ALTER TABLE public.user_points 
ADD COLUMN IF NOT EXISTS x_post_boost_percentage integer NOT NULL DEFAULT 0;

-- Add comment to clarify the columns
COMMENT ON COLUMN public.user_points.referral_bonus_percentage IS 'Mining boost percentage from referrals only (capped at 50%)';
COMMENT ON COLUMN public.user_points.x_post_boost_percentage IS 'Mining boost percentage from X post submissions (social yapping)';