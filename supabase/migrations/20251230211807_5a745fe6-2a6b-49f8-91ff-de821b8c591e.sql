-- Create table to store historical X post rewards
CREATE TABLE public.x_post_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  x_profile_id UUID NOT NULL,
  tweet_id TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  retweet_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  quote_count INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  arx_p_reward NUMERIC NOT NULL DEFAULT 0,
  boost_reward INTEGER NOT NULL DEFAULT 0,
  tweet_created_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tweet_id)
);

-- Add columns to x_profiles for historical rewards tracking
ALTER TABLE public.x_profiles 
ADD COLUMN IF NOT EXISTS historical_posts_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS historical_arx_p_total NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS historical_boost_total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS historical_scanned BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.x_post_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for x_post_rewards
CREATE POLICY "Users can view their own post rewards" 
ON public.x_post_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert post rewards" 
ON public.x_post_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_x_post_rewards_user_id ON public.x_post_rewards(user_id);
CREATE INDEX idx_x_post_rewards_x_profile_id ON public.x_post_rewards(x_profile_id);