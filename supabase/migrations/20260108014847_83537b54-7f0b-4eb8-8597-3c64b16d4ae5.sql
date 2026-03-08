-- Create audit log table for point reconciliation
CREATE TABLE public.points_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audit_type text NOT NULL DEFAULT 'reconciliation',
  
  -- Before values
  stored_mining_points numeric NOT NULL DEFAULT 0,
  stored_task_points numeric NOT NULL DEFAULT 0,
  stored_social_points numeric NOT NULL DEFAULT 0,
  stored_referral_points numeric NOT NULL DEFAULT 0,
  stored_total_points numeric NOT NULL DEFAULT 0,
  
  -- Computed (provable) values
  computed_mining_points numeric NOT NULL DEFAULT 0,
  computed_task_points numeric NOT NULL DEFAULT 0,
  computed_social_points numeric NOT NULL DEFAULT 0,
  computed_referral_points numeric NOT NULL DEFAULT 0,
  computed_checkin_points numeric NOT NULL DEFAULT 0,
  computed_total_points numeric NOT NULL DEFAULT 0,
  
  -- Differences
  mining_diff numeric NOT NULL DEFAULT 0,
  task_diff numeric NOT NULL DEFAULT 0,
  social_diff numeric NOT NULL DEFAULT 0,
  referral_diff numeric NOT NULL DEFAULT 0,
  total_diff numeric NOT NULL DEFAULT 0,
  
  -- Action taken
  action_taken text NOT NULL DEFAULT 'none', -- 'restored', 'none', 'flagged'
  points_restored numeric NOT NULL DEFAULT 0,
  
  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.points_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage audit logs
CREATE POLICY "Admins can manage audit logs"
  ON public.points_audit_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_points_audit_log_user_id ON public.points_audit_log(user_id);
CREATE INDEX idx_points_audit_log_created_at ON public.points_audit_log(created_at DESC);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_audit_log;