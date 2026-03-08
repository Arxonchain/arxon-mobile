-- Create the updated_at trigger function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User points tracking table
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points NUMERIC NOT NULL DEFAULT 0,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  mining_points NUMERIC NOT NULL DEFAULT 0,
  task_points NUMERIC NOT NULL DEFAULT 0,
  social_points NUMERIC NOT NULL DEFAULT 0,
  referral_points NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily check-ins table
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_awarded NUMERIC NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Tasks table (admin-defined tasks)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points_reward NUMERIC NOT NULL DEFAULT 0,
  task_type TEXT NOT NULL DEFAULT 'social',
  external_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_completions INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User task completions
CREATE TABLE public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  points_awarded NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Social submissions (X posts)
CREATE TABLE public.social_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'twitter',
  status TEXT NOT NULL DEFAULT 'pending',
  points_awarded NUMERIC NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User wallets (for Polkadot connection)
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'polkadot',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, wallet_address)
);

-- Enable RLS on all tables
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Leaderboard view" ON public.user_points FOR SELECT USING (true);

-- RLS Policies for daily_checkins
CREATE POLICY "Users can view their own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tasks (everyone can view active tasks)
CREATE POLICY "Anyone can view active tasks" ON public.tasks FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_tasks
CREATE POLICY "Users can view their own task completions" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit task completions" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own task submissions" ON public.user_tasks FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for social_submissions
CREATE POLICY "Users can view their own submissions" ON public.social_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create submissions" ON public.social_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all submissions" ON public.social_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallets" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own wallets" ON public.user_wallets FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at on user_points
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tasks
INSERT INTO public.tasks (title, description, points_reward, task_type, external_url) VALUES
  ('Follow Arxon on X', 'Follow our official X account @Arxonarx', 50, 'social', 'https://twitter.com/Arxonarx'),
  ('Join Arxon Discord', 'Join our community Discord server', 50, 'social', 'https://discord.gg/arxon'),
  ('Post about Arxon', 'Share a post about Arxon with #ArxonMining', 100, 'social', NULL),
  ('Invite a Friend', 'Refer a friend to join Arxon mining', 200, 'referral', NULL),
  ('Complete Profile', 'Add your username and connect wallet', 25, 'manual', NULL);