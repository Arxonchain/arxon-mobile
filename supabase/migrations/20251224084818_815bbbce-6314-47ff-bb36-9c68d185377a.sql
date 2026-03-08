-- Allow admins to update all mining sessions (to stop them when mining is disabled)
CREATE POLICY "Admins can update all sessions" 
ON public.mining_sessions 
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));