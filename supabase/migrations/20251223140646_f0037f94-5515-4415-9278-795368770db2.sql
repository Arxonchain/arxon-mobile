-- Add public read policy for x_profiles leaderboard (only non-sensitive fields visible via app logic)
CREATE POLICY "Anyone can view X profiles for leaderboard" 
ON public.x_profiles 
FOR SELECT 
USING (true);

-- Fix founder_allocations - ensure only admins can read
CREATE POLICY "Admins can read founder allocations" 
ON public.founder_allocations 
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));