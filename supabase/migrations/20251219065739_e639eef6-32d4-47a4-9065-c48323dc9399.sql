
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Mining settings table (admin controlled)
CREATE TABLE public.mining_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_mining_enabled BOOLEAN NOT NULL DEFAULT true,
    claiming_enabled BOOLEAN NOT NULL DEFAULT false,
    block_reward INTEGER NOT NULL DEFAULT 1000,
    consensus_mode TEXT NOT NULL DEFAULT 'PoW' CHECK (consensus_mode IN ('PoW', 'PoS')),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.mining_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mining settings"
ON public.mining_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can update mining settings"
ON public.mining_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default mining settings
INSERT INTO public.mining_settings (public_mining_enabled, claiming_enabled, block_reward, consensus_mode)
VALUES (true, false, 1000, 'PoW');

-- Announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
ON public.announcements FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Mining sessions table (for tracking miner activity)
CREATE TABLE public.mining_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    arx_mined DECIMAL(20, 8) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.mining_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
ON public.mining_sessions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.mining_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Claims table
CREATE TABLE public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    wallet_address TEXT NOT NULL,
    eligible_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    claimed_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    proof_status TEXT NOT NULL DEFAULT 'pending' CHECK (proof_status IN ('pending', 'verified', 'invalid')),
    last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims"
ON public.claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claims"
ON public.claims FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Founder allocations table
CREATE TABLE public.founder_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    allocation_percentage DECIMAL(5, 2) NOT NULL,
    total_allocation DECIMAL(20, 8) NOT NULL,
    claimed_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    vesting_type TEXT NOT NULL DEFAULT 'linear' CHECK (vesting_type IN ('linear', 'cliff', 'immediate')),
    next_unlock_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage founder allocations"
ON public.founder_allocations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Whitelist table for merkle eligibility
CREATE TABLE public.whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    eligible BOOLEAN NOT NULL DEFAULT true,
    merkle_proof TEXT,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whitelist"
ON public.whitelist FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
