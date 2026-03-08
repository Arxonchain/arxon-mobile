 # Arxon Mining App - Complete Self-Hosting Guide
 
 This guide walks you through hosting Arxon on your own Supabase project with full data migration.
 
 ---
 
 ## Table of Contents
 1. [Prerequisites](#prerequisites)
 2. [Create Supabase Project](#step-1-create-supabase-project)
 3. [Run Database Migrations](#step-2-run-database-migrations)
 4. [Configure Authentication](#step-3-configure-authentication)
 5. [Set Up Storage Buckets](#step-4-set-up-storage-buckets)
 6. [Deploy Edge Functions](#step-5-deploy-edge-functions)
 7. [Import User Data](#step-6-import-user-data)
 8. [Deploy Frontend](#step-7-deploy-frontend)
 9. [Post-Deployment Checklist](#step-8-post-deployment-checklist)
 
 ---
 
 ## Prerequisites
 
 - Supabase account (free tier works)
 - GitHub account
 - Vercel account (or Netlify)
 - Node.js 18+ installed locally
 - Your exported user CSV file
 
 ---
 
 ## Step 1: Create Supabase Project
 
 1. Go to [supabase.com](https://supabase.com) and sign in
 2. Click **New Project**
 3. Choose your organization
 4. Fill in:
    - **Name**: `arxon-production` (or your preference)
    - **Database Password**: Save this securely!
    - **Region**: Choose closest to your users
 5. Click **Create Project** and wait for setup (~2 mins)
 
 ### Get Your Keys
 
 Go to **Settings → API** and copy:
 - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
 - **anon/public key** (starts with `eyJ...`)
 - **service_role key** (KEEP SECRET - for backend only)
 
 ---
 
 ## Step 2: Run Database Migrations
 
 Go to **SQL Editor** in your Supabase dashboard and run these scripts IN ORDER:
 
 ### 2.1 Create App Role Enum
 
 ```sql
 -- Create app role enum
 CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
 
 -- Create has_role function
 CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
   SELECT EXISTS (
     SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
   )
 $$;
 ```
 
 ### 2.2 Create Core Tables
 
 ```sql
 -- User roles table
 CREATE TABLE public.user_roles (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   role app_role NOT NULL,
   created_at TIMESTAMPTZ DEFAULT now()
 );
 CREATE UNIQUE INDEX user_roles_unique ON public.user_roles(user_id, role);
 
 -- Profiles table
 CREATE TABLE public.profiles (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL UNIQUE,
   username TEXT,
   avatar_url TEXT,
   referral_code TEXT UNIQUE,
   nexus_address TEXT UNIQUE,
   created_at TIMESTAMPTZ DEFAULT now(),
   updated_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- User points table
 CREATE TABLE public.user_points (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL UNIQUE,
   total_points NUMERIC DEFAULT 0,
   mining_points NUMERIC DEFAULT 0,
   task_points NUMERIC DEFAULT 0,
   social_points NUMERIC DEFAULT 0,
   referral_points NUMERIC DEFAULT 0,
   daily_streak INTEGER DEFAULT 0,
   last_checkin_date DATE,
   referral_bonus_percentage INTEGER DEFAULT 0,
   x_post_boost_percentage INTEGER DEFAULT 0,
   created_at TIMESTAMPTZ DEFAULT now(),
   updated_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Mining sessions table
 CREATE TABLE public.mining_sessions (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   started_at TIMESTAMPTZ DEFAULT now(),
   ended_at TIMESTAMPTZ,
   arx_mined NUMERIC DEFAULT 0,
   is_active BOOLEAN DEFAULT true,
   credited_at TIMESTAMPTZ
 );
 
 -- Daily checkins table
 CREATE TABLE public.daily_checkins (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   checkin_date DATE DEFAULT CURRENT_DATE,
   points_awarded NUMERIC DEFAULT 0,
   streak_day INTEGER DEFAULT 1,
   created_at TIMESTAMPTZ DEFAULT now(),
   UNIQUE(user_id, checkin_date)
 );
 
 -- Referrals table
 CREATE TABLE public.referrals (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   referrer_id UUID NOT NULL,
   referred_id UUID NOT NULL,
   referral_code_used TEXT NOT NULL,
   points_awarded NUMERIC DEFAULT 0,
   created_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Mining settings table
 CREATE TABLE public.mining_settings (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   public_mining_enabled BOOLEAN DEFAULT true,
   claiming_enabled BOOLEAN DEFAULT false,
   arena_public_access BOOLEAN DEFAULT false,
   block_reward INTEGER DEFAULT 1000,
   consensus_mode TEXT DEFAULT 'PoW',
   updated_at TIMESTAMPTZ DEFAULT now(),
   updated_by UUID
 );
 
 -- Insert default mining settings
 INSERT INTO public.mining_settings (id) VALUES (gen_random_uuid());
 ```
 
 ### 2.3 Create Arena Tables
 
 ```sql
 -- Arena battles
 CREATE TABLE public.arena_battles (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   title TEXT NOT NULL,
   description TEXT,
   side_a_name TEXT NOT NULL,
   side_a_color TEXT DEFAULT '#00D4FF',
   side_a_image TEXT,
   side_a_power NUMERIC DEFAULT 0,
   side_b_name TEXT NOT NULL,
   side_b_color TEXT DEFAULT '#FF00FF',
   side_b_image TEXT,
   side_b_power NUMERIC DEFAULT 0,
   side_c_name TEXT,
   side_c_color TEXT DEFAULT '#FFD700',
   side_c_image TEXT,
   side_c_power NUMERIC DEFAULT 0,
   category TEXT DEFAULT 'sports',
   starts_at TIMESTAMPTZ DEFAULT now(),
   ends_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
   is_active BOOLEAN DEFAULT true,
   winner_side TEXT,
   winner_boost_percentage INTEGER DEFAULT 500,
   prize_pool NUMERIC DEFAULT 0,
   bonus_percentage NUMERIC DEFAULT 200,
   total_participants INTEGER DEFAULT 0,
   duration_hours INTEGER DEFAULT 24,
   outcome_verified BOOLEAN DEFAULT false,
   outcome_verified_at TIMESTAMPTZ,
   outcome_verified_by UUID,
   losing_pool_distributed BOOLEAN DEFAULT false,
   total_rewards_distributed NUMERIC DEFAULT 0,
   resolution_source TEXT,
   outcome_type TEXT DEFAULT 'prediction',
   ai_side_a_probability NUMERIC DEFAULT 50,
   ai_side_b_probability NUMERIC DEFAULT 50,
   ai_prediction_text TEXT,
   ai_confidence TEXT DEFAULT 'moderate',
   ai_last_updated TIMESTAMPTZ,
   created_at TIMESTAMPTZ DEFAULT now(),
   created_by UUID
 );
 
 -- Arena members
 CREATE TABLE public.arena_members (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL UNIQUE,
   club TEXT NOT NULL,
   fingerprint_verified BOOLEAN DEFAULT false,
   fingerprint_hash TEXT,
   total_votes INTEGER DEFAULT 0,
   total_wins INTEGER DEFAULT 0,
   current_win_streak INTEGER DEFAULT 0,
   best_win_streak INTEGER DEFAULT 0,
   joined_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Arena votes
 CREATE TABLE public.arena_votes (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   battle_id UUID NOT NULL REFERENCES public.arena_battles(id),
   user_id UUID NOT NULL,
   side TEXT NOT NULL,
   power_spent NUMERIC NOT NULL,
   early_stake_multiplier NUMERIC DEFAULT 1.0,
   verified_with_fingerprint BOOLEAN DEFAULT false,
   locked_until TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
   created_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Arena earnings
 CREATE TABLE public.arena_earnings (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   battle_id UUID NOT NULL REFERENCES public.arena_battles(id),
   stake_amount NUMERIC DEFAULT 0,
   bonus_earned NUMERIC DEFAULT 0,
   pool_share_earned NUMERIC DEFAULT 0,
   streak_bonus NUMERIC DEFAULT 0,
   total_earned NUMERIC DEFAULT 0,
   is_winner BOOLEAN DEFAULT false,
   created_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Arena boosts
 CREATE TABLE public.arena_boosts (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   battle_id UUID NOT NULL REFERENCES public.arena_battles(id),
   boost_percentage INTEGER NOT NULL,
   expires_at TIMESTAMPTZ NOT NULL,
   created_at TIMESTAMPTZ DEFAULT now()
 );
 ```
 
 ### 2.4 Create Utility Functions
 
 ```sql
 -- Generate referral code
 CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS TEXT
 LANGUAGE plpgsql
 SET search_path TO 'public'
 AS $$
 DECLARE
   chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   code TEXT := 'ARX-';
   i INTEGER;
 BEGIN
   FOR i IN 1..6 LOOP
     code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
   END LOOP;
   RETURN code;
 END;
 $$;
 
 -- Generate nexus address
 CREATE OR REPLACE FUNCTION public.generate_nexus_address(p_username TEXT)
 RETURNS TEXT
 LANGUAGE plpgsql
 SET search_path TO 'public'
 AS $$
 DECLARE
   random_suffix TEXT;
   new_address TEXT;
   address_exists BOOLEAN;
 BEGIN
   LOOP
     random_suffix := lpad(floor(random() * 10000)::text, 4, '0');
     new_address := 'ARX-P-' || COALESCE(LOWER(REGEXP_REPLACE(p_username, '[^a-zA-Z0-9]', '', 'g')), 'user') || random_suffix;
     SELECT EXISTS(SELECT 1 FROM profiles WHERE nexus_address = new_address) INTO address_exists;
     EXIT WHEN NOT address_exists;
   END LOOP;
   RETURN new_address;
 END;
 $$;
 
 -- Assign referral code trigger
 CREATE OR REPLACE FUNCTION public.assign_referral_code()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
 DECLARE
   new_code TEXT;
   code_exists BOOLEAN;
 BEGIN
   IF NEW.referral_code IS NULL THEN
     LOOP
       new_code := generate_referral_code();
       SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
       EXIT WHEN NOT code_exists;
     END LOOP;
     NEW.referral_code := new_code;
   END IF;
   RETURN NEW;
 END;
 $$;
 
 -- Assign nexus address trigger
 CREATE OR REPLACE FUNCTION public.assign_nexus_address()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
 BEGIN
   IF NEW.nexus_address IS NULL THEN
     NEW.nexus_address := generate_nexus_address(COALESCE(NEW.username, 'user'));
   END IF;
   RETURN NEW;
 END;
 $$;
 
 -- Handle new user signup
 CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
 BEGIN
   INSERT INTO public.profiles (user_id, username)
   VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
   INSERT INTO public.user_points (user_id) VALUES (NEW.id);
   RETURN NEW;
 END;
 $$;
 
 -- Create triggers
 CREATE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 
 CREATE TRIGGER assign_referral_code_trigger
   BEFORE INSERT ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();
 
 CREATE TRIGGER assign_nexus_address_trigger
   BEFORE INSERT ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.assign_nexus_address();
 ```
 
 ### 2.5 Enable Row Level Security
 
 ```sql
 -- Enable RLS on all tables
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.mining_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.arena_votes ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.arena_earnings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.arena_boosts ENABLE ROW LEVEL SECURITY;
 
 -- Profiles policies
 CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
 CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
 
 -- User points policies
 CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Admins can view all points" ON public.user_points FOR SELECT USING (has_role(auth.uid(), 'admin'));
 CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Admins can update all points" ON public.user_points FOR UPDATE USING (has_role(auth.uid(), 'admin'));
 
 -- Mining sessions policies
 CREATE POLICY "Users can view own sessions" ON public.mining_sessions FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Users can insert own sessions" ON public.mining_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Users can update own sessions" ON public.mining_sessions FOR UPDATE USING (auth.uid() = user_id);
 
 -- Daily checkins policies
 CREATE POLICY "Users can view own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Users can insert own checkins" ON public.daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
 
 -- Mining settings policies
 CREATE POLICY "Anyone can read settings" ON public.mining_settings FOR SELECT USING (true);
 CREATE POLICY "Admins can update settings" ON public.mining_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
 
 -- User roles policies
 CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));
 
 -- Arena battles policies
 CREATE POLICY "Anyone can view battles" ON public.arena_battles FOR SELECT USING (true);
 CREATE POLICY "Admins can manage battles" ON public.arena_battles FOR ALL USING (has_role(auth.uid(), 'admin'));
 
 -- Arena members policies
 CREATE POLICY "Anyone can view members" ON public.arena_members FOR SELECT USING (true);
 CREATE POLICY "Users can create own membership" ON public.arena_members FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Users can update own membership" ON public.arena_members FOR UPDATE USING (auth.uid() = user_id);
 
 -- Arena votes policies
 CREATE POLICY "Users can view own votes" ON public.arena_votes FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Users can cast votes" ON public.arena_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
 
 -- Arena earnings policies
 CREATE POLICY "Users can view all earnings" ON public.arena_earnings FOR SELECT USING (true);
 
 -- Arena boosts policies
 CREATE POLICY "Users can view own boosts" ON public.arena_boosts FOR SELECT USING (auth.uid() = user_id);
 ```
 
 ---
 
 ## Step 3: Configure Authentication
 
 In Supabase Dashboard → **Authentication → URL Configuration**:
 
 1. **Site URL**: `https://your-domain.com`
 2. **Redirect URLs** (add all):
    - `https://your-domain.com/auth/confirm`
    - `https://your-domain.com/reset-password`
    - `https://your-domain.com/change-password`
 
 In **Authentication → Email Templates**, customize:
 - Confirmation email
 - Password reset email
 - Magic link email
 
 ---
 
 ## Step 4: Set Up Storage Buckets
 
 Go to **Storage** and create buckets:
 
 1. **avatars** (Public)
    - Click "New Bucket"
    - Name: `avatars`
    - Check "Public bucket"
 
 2. **task-screenshots** (Public)
    - Name: `task-screenshots`
    - Check "Public bucket"
 
 Add storage policies in **SQL Editor**:
 
 ```sql
 -- Avatar upload policy
 CREATE POLICY "Anyone can view avatars"
 ON storage.objects FOR SELECT
 USING (bucket_id = 'avatars');
 
 CREATE POLICY "Users can upload own avatar"
 ON storage.objects FOR INSERT
 WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
 
 CREATE POLICY "Users can update own avatar"
 ON storage.objects FOR UPDATE
 USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
 ```
 
 ---
 
 ## Step 5: Deploy Edge Functions
 
 ### Option A: Using Supabase CLI (Recommended)
 
 1. Install Supabase CLI:
 ```bash
 npm install -g supabase
 ```
 
 2. Login and link project:
 ```bash
 supabase login
 supabase link --project-ref YOUR_PROJECT_ID
 ```
 
 3. Set secrets:
 ```bash
 supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 supabase secrets set SUPABASE_ANON_KEY=your-anon-key
 ```
 
 4. Deploy functions:
 ```bash
 supabase functions deploy
 ```
 
 ### Option B: Manual Deployment
 
 Go to **Edge Functions** in dashboard and deploy each function from the `supabase/functions/` folder.
 
 ---
 
 ## Step 6: Import User Data
 
 ### 6.1 Create Your First Admin
 
 1. Sign up on your new app normally
 2. Run in SQL Editor:
 ```sql
 -- Replace with your email
 INSERT INTO public.user_roles (user_id, role)
 SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'your-admin@email.com';
 ```
 
 ### 6.2 Import Users from CSV
 
 Use the admin panel at `/admin/users` or call the import function:
 
 ```javascript
 // Example: Import users via API
 const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/import-users-csv', {
   method: 'POST',
   headers: {
     'Authorization': 'Bearer YOUR_ADMIN_JWT',
     'Content-Type': 'application/json'
   },
   body: JSON.stringify({
     csvData: `email,total_points,mining_points,...
 user1@example.com,100,50,...`,
     dryRun: false  // Set to true first to preview
   })
 });
 ```
 
 Users will need to use "Forgot Password" to access their accounts.
 
 ---
 
 ## Step 7: Deploy Frontend
 
 ### 7.1 Push to GitHub
 
 ```bash
 git init
 git add .
 git commit -m "Initial commit"
 git remote add origin https://github.com/YOUR_USERNAME/arxon-app.git
 git push -u origin main
 ```
 
 ### 7.2 Deploy on Vercel
 
 1. Go to [vercel.com](https://vercel.com)
 2. Import your GitHub repository
 3. Set environment variables:
    - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
    - `VITE_SUPABASE_PUBLISHABLE_KEY` = `your-anon-key`
 4. Deploy!
 
 ### 7.3 Connect Custom Domain
 
 1. In Vercel, go to **Settings → Domains**
 2. Add your domain (e.g., `arxonchain.xyz`)
 3. Update DNS records as instructed
 4. Update Supabase **Site URL** to match
 
 ---
 
 ## Step 8: Post-Deployment Checklist
 
 - [ ] Test signup/login flow
 - [ ] Test password reset
 - [ ] Test mining session (start/stop)
 - [ ] Test daily check-in
 - [ ] Verify leaderboard loads
 - [ ] Check Arena battles display
 - [ ] Verify admin panel access
 - [ ] Test user data export
 - [ ] Monitor Edge Function logs
 - [ ] Set up error alerting (optional)
 
 ---
 
 ## Local Development
 
 ```bash
 # Clone repo
 git clone https://github.com/YOUR_USERNAME/arxon-app.git
 cd arxon-app
 
 # Install dependencies
 npm install
 
 # Create .env.local
 echo "VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" > .env.local
 echo "VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key" >> .env.local
 
 # Start dev server
 npm run dev
 ```
 
 ---
 
 ## Troubleshooting
 
 ### "Invalid login credentials"
 - Check email confirmation is enabled/disabled correctly
 - Verify the user exists in auth.users
 
 ### RLS policy errors
 - Ensure user is authenticated before accessing protected data
 - Check the has_role function exists
 
 ### Edge functions returning 500
 - Check secrets are set correctly
 - View function logs in Supabase Dashboard
 
 ### Missing user points
 - Run the handle_new_user trigger manually for existing users
 - Check if user_points record exists
 
 ---
 
 ## Support
 
 For issues, check:
 1. Supabase Dashboard → Logs
 2. Vercel → Function Logs
 3. Browser DevTools → Console & Network