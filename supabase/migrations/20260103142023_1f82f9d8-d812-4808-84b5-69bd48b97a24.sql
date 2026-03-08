-- Add admin RLS policy to user_points table so admins can view all user points
CREATE POLICY "Admins can view all user points"
ON public.user_points
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));