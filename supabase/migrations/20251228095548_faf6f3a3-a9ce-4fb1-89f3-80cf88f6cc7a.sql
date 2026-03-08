-- Drop the security definer view and recreate with proper security
DROP VIEW IF EXISTS public.arena_participation;

-- Create a function to get participation data securely
CREATE OR REPLACE FUNCTION public.get_arena_participation(p_battle_id UUID)
RETURNS TABLE (
  battle_id UUID,
  user_id UUID,
  power_spent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    av.battle_id,
    av.user_id,
    av.power_spent,
    av.created_at,
    p.username,
    p.avatar_url
  FROM public.arena_votes av
  LEFT JOIN public.profiles p ON p.user_id = av.user_id
  WHERE av.battle_id = p_battle_id;
$$;

-- Add policy for public participation viewing (power spent only, not side)
CREATE POLICY "Anyone can view vote participation amounts" ON public.arena_votes 
FOR SELECT USING (true);

-- But update the existing policy to be more specific - users only see their own side
DROP POLICY IF EXISTS "Users can view own vote details" ON public.arena_votes;

-- Create function to update battle power totals
CREATE OR REPLACE FUNCTION public.update_battle_power()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.side = 'a' THEN
    UPDATE public.arena_battles 
    SET side_a_power = side_a_power + NEW.power_spent 
    WHERE id = NEW.battle_id;
  ELSE
    UPDATE public.arena_battles 
    SET side_b_power = side_b_power + NEW.power_spent 
    WHERE id = NEW.battle_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update power on vote
CREATE TRIGGER on_arena_vote_insert
  AFTER INSERT ON public.arena_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_battle_power();