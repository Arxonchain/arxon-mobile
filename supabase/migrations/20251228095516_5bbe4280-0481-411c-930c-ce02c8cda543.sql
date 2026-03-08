-- Arena Battles table
CREATE TABLE public.arena_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  side_a_name TEXT NOT NULL,
  side_a_image TEXT,
  side_a_color TEXT NOT NULL DEFAULT '#00D4FF',
  side_b_name TEXT NOT NULL,
  side_b_image TEXT,
  side_b_color TEXT NOT NULL DEFAULT '#FF00FF',
  side_a_power NUMERIC NOT NULL DEFAULT 0,
  side_b_power NUMERIC NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  winner_side TEXT,
  winner_boost_percentage INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Arena Votes table (private voting)
CREATE TABLE public.arena_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.arena_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('a', 'b')),
  power_spent NUMERIC NOT NULL CHECK (power_spent >= 100),
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- User Badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  description TEXT,
  battle_id UUID REFERENCES public.arena_battles(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Arena boosts table (active boosts from winning)
CREATE TABLE public.arena_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_id UUID NOT NULL REFERENCES public.arena_battles(id) ON DELETE CASCADE,
  boost_percentage INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- Enable RLS
ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_boosts ENABLE ROW LEVEL SECURITY;

-- Arena battles policies (public read, admin write)
CREATE POLICY "Anyone can view arena battles" ON public.arena_battles FOR SELECT USING (true);
CREATE POLICY "Admins can manage arena battles" ON public.arena_battles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Arena votes policies (private voting, public participation)
CREATE POLICY "Users can cast their own votes" ON public.arena_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own vote details" ON public.arena_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all votes" ON public.arena_votes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- User badges policies
CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Arena boosts policies
CREATE POLICY "Users can view their own boosts" ON public.arena_boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage boosts" ON public.arena_boosts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create view for public vote participation (hides which side)
CREATE OR REPLACE VIEW public.arena_participation AS
SELECT 
  av.battle_id,
  av.user_id,
  av.power_spent,
  av.created_at,
  p.username,
  p.avatar_url
FROM public.arena_votes av
LEFT JOIN public.profiles p ON p.user_id = av.user_id;

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_battles;