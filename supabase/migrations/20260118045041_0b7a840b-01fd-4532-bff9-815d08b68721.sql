-- Create arena email whitelist table
CREATE TABLE public.arena_email_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.arena_email_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify the whitelist
CREATE POLICY "Admins can manage arena whitelist" 
ON public.arena_email_whitelist 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert the initial whitelisted email
INSERT INTO public.arena_email_whitelist (email, notes)
VALUES ('bangzdk@gmail.com', 'Initial test user for arena feature');