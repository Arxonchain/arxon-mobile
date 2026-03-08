-- Add RLS policy to prevent double-claiming on social_submissions
-- Users can only update their own submissions if points_awarded is still 0

CREATE POLICY "Users can update unclaimed submissions" 
ON public.social_submissions 
FOR UPDATE 
USING (auth.uid() = user_id AND points_awarded = 0)
WITH CHECK (auth.uid() = user_id);