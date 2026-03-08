-- Add unique constraint for x_post_rewards to prevent duplicates on upsert
ALTER TABLE public.x_post_rewards ADD CONSTRAINT x_post_rewards_user_tweet_unique UNIQUE (user_id, tweet_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_x_post_rewards_user_id ON public.x_post_rewards(user_id);

-- Enable realtime for x_profiles so leaderboard can auto-update
ALTER PUBLICATION supabase_realtime ADD TABLE public.x_profiles;