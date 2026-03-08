-- Add new columns to arena_battles for the two-pool system
ALTER TABLE public.arena_battles 
ADD COLUMN IF NOT EXISTS prize_pool numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_percentage numeric DEFAULT 200,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'sports',
ADD COLUMN IF NOT EXISTS resolution_source text,
ADD COLUMN IF NOT EXISTS total_participants integer DEFAULT 0;

-- Create arena_earnings table to track user earnings from battles
CREATE TABLE IF NOT EXISTS public.arena_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  battle_id uuid NOT NULL REFERENCES public.arena_battles(id) ON DELETE CASCADE,
  stake_amount numeric NOT NULL DEFAULT 0,
  bonus_earned numeric NOT NULL DEFAULT 0,
  pool_share_earned numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arena_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for arena_earnings
CREATE POLICY "Users can view their own earnings"
  ON public.arena_earnings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all earnings for leaderboard"
  ON public.arena_earnings
  FOR SELECT
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_arena_earnings_user ON public.arena_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_earnings_battle ON public.arena_earnings(battle_id);
CREATE INDEX IF NOT EXISTS idx_arena_battles_category ON public.arena_battles(category);
CREATE INDEX IF NOT EXISTS idx_arena_battles_ends_at ON public.arena_battles(ends_at);

-- Create view for arena leaderboard (highest earners)
CREATE OR REPLACE VIEW public.arena_earnings_leaderboard AS
SELECT 
  ae.user_id,
  p.username,
  p.avatar_url,
  COUNT(DISTINCT ae.battle_id) as total_battles,
  SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END) as total_wins,
  SUM(ae.stake_amount) as total_staked,
  SUM(ae.total_earned) as total_earned,
  SUM(ae.bonus_earned) as total_bonus_earned,
  SUM(ae.pool_share_earned) as total_pool_share_earned,
  ROUND((SUM(CASE WHEN ae.is_winner THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(DISTINCT ae.battle_id), 0) * 100), 1) as win_rate
FROM public.arena_earnings ae
LEFT JOIN public.profiles p ON p.user_id = ae.user_id
GROUP BY ae.user_id, p.username, p.avatar_url
ORDER BY total_earned DESC;

-- Function to update participant count on vote
CREATE OR REPLACE FUNCTION public.update_battle_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.arena_battles 
  SET total_participants = (
    SELECT COUNT(DISTINCT user_id) 
    FROM public.arena_votes 
    WHERE battle_id = NEW.battle_id
  )
  WHERE id = NEW.battle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for participant count
DROP TRIGGER IF EXISTS update_participant_count_trigger ON public.arena_votes;
CREATE TRIGGER update_participant_count_trigger
AFTER INSERT ON public.arena_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_battle_participant_count();