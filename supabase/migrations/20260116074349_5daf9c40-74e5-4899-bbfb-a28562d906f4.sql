-- Add new columns to arena_battles for verifiable outcome battles
ALTER TABLE public.arena_battles 
ADD COLUMN IF NOT EXISTS outcome_type TEXT DEFAULT 'prediction', -- 'prediction' for verifiable outcomes
ADD COLUMN IF NOT EXISTS outcome_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS outcome_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS outcome_verified_by UUID,
ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS last_duration_hours INTEGER, -- to prevent consecutive same durations
ADD COLUMN IF NOT EXISTS losing_pool_distributed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_rewards_distributed NUMERIC DEFAULT 0;

-- Create a battle queue table for rotation system
CREATE TABLE IF NOT EXISTS public.arena_battle_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  side_a_name TEXT NOT NULL,
  side_b_name TEXT NOT NULL,
  side_a_color TEXT DEFAULT '#4ade80',
  side_b_color TEXT DEFAULT '#f87171',
  duration_hours INTEGER NOT NULL,
  priority INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.arena_battle_queue ENABLE ROW LEVEL SECURITY;

-- Policies for battle queue
CREATE POLICY "Anyone can view battle queue"
  ON public.arena_battle_queue FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage battle queue"
  ON public.arena_battle_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create arena_staking_rewards table to track individual rewards
CREATE TABLE IF NOT EXISTS public.arena_staking_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.arena_battles(id),
  user_id UUID NOT NULL,
  original_stake NUMERIC NOT NULL,
  multiplier NUMERIC DEFAULT 0,
  stake_return NUMERIC DEFAULT 0,
  loser_pool_share NUMERIC DEFAULT 0,
  total_reward NUMERIC DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arena_staking_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for staking rewards
CREATE POLICY "Users can view their own rewards"
  ON public.arena_staking_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rewards"
  ON public.arena_staking_rewards FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to give instant 25% mining boost when staking
CREATE OR REPLACE FUNCTION public.apply_instant_arena_boost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get battle end time
  SELECT ends_at INTO v_battle_ends_at
  FROM public.arena_battles
  WHERE id = NEW.battle_id;

  -- Create instant 25% mining boost that lasts until battle ends
  INSERT INTO public.arena_boosts (
    user_id,
    battle_id,
    boost_percentage,
    expires_at
  ) VALUES (
    NEW.user_id,
    NEW.battle_id,
    25, -- Instant 25% boost for all stakers
    v_battle_ends_at
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger for instant boost
DROP TRIGGER IF EXISTS on_arena_vote_instant_boost ON public.arena_votes;
CREATE TRIGGER on_arena_vote_instant_boost
  AFTER INSERT ON public.arena_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_instant_arena_boost();