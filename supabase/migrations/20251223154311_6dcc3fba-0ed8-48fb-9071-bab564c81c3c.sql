-- Add referral_bonus_percentage to user_points table to track mining rate boost from referrals
ALTER TABLE public.user_points 
ADD COLUMN referral_bonus_percentage integer NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_points.referral_bonus_percentage IS 'Mining rate boost percentage earned from referrals (e.g., 5 means 5% boost)';