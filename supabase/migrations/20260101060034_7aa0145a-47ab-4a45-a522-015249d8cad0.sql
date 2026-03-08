-- 1. Fix profiles table: Only allow public access to username and avatar for authenticated users
-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON public.profiles;

-- Create a new restricted policy - only authenticated users can view basic profile info
CREATE POLICY "Authenticated users can view profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Fix arena_votes: Replace public vote exposure with aggregate-only access
-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view vote participation amounts" ON public.arena_votes;

-- Only allow users to view their own votes
CREATE POLICY "Users can view their own votes" 
ON public.arena_votes 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Fix x_post_rewards: Remove user INSERT ability (should only be via service role in edge functions)
-- Remove the current INSERT policy that allows any user
DROP POLICY IF EXISTS "System can insert post rewards" ON public.x_post_rewards;

-- Create admin-only INSERT policy (edge functions use service role which bypasses RLS)
CREATE POLICY "Admins can manage post rewards" 
ON public.x_post_rewards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));