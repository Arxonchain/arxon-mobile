-- Allow reading basic profile info (username, avatar_url) for leaderboard and referrals
CREATE POLICY "Anyone can view basic profile info"
ON public.profiles
FOR SELECT
USING (true);