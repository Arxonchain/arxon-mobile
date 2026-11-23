-- 30-day account deletion requests. Writes go through the account-deletion
-- edge function (service role). Users/admins may only read their rows.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'completed')),
  confirmation TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  reviewed_by UUID,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  admin_note TEXT,
  UNIQUE (user_id, requested_at)
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx
  ON public.account_deletion_requests (status, scheduled_for);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_open_user_idx
  ON public.account_deletion_requests (user_id)
  WHERE status IN ('pending', 'approved');

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
