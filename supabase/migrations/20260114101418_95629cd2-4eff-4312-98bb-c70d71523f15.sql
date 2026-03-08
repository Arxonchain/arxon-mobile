
-- Create arena_members table for club assignments and fingerprint verification
CREATE TABLE public.arena_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  club TEXT NOT NULL CHECK (club IN ('alpha', 'omega')),
  fingerprint_verified BOOLEAN NOT NULL DEFAULT false,
  fingerprint_hash TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_votes INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;

-- Users can view all members (for leaderboards)
CREATE POLICY "Anyone can view arena members"
ON public.arena_members
FOR SELECT
USING (true);

-- Users can insert their own membership
CREATE POLICY "Users can create their own membership"
ON public.arena_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY "Users can update their own membership"
ON public.arena_members
FOR UPDATE
USING (auth.uid() = user_id);

-- Add club column to arena_votes if not exists
ALTER TABLE public.arena_votes ADD COLUMN IF NOT EXISTS verified_with_fingerprint BOOLEAN DEFAULT false;

-- Enable realtime for arena_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_members;
