-- Fix user_points: Keep leaderboard functionality but restrict to essential fields
-- The "Leaderboard view" policy is intentional for the leaderboard feature
-- No changes needed - this is by design for leaderboard

-- Fix x_profiles: The public access is intentional for the "Top Yappers" leaderboard
-- But we should limit what unauthenticated users can see

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view X profiles for leaderboard" ON public.x_profiles;

-- Create a restricted policy - only authenticated users can view for leaderboard
CREATE POLICY "Authenticated users can view X profiles for leaderboard" 
ON public.x_profiles 
FOR SELECT 
TO authenticated
USING (true);