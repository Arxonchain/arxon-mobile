
-- Add nexus_address to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nexus_address text UNIQUE;

-- Create function to generate nexus address
CREATE OR REPLACE FUNCTION public.generate_nexus_address(p_username text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  random_suffix text;
  new_address text;
  address_exists boolean;
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

-- Trigger to auto-generate nexus address on profile creation
CREATE OR REPLACE FUNCTION public.assign_nexus_address()
RETURNS trigger
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

DROP TRIGGER IF EXISTS trg_assign_nexus_address ON public.profiles;
CREATE TRIGGER trg_assign_nexus_address
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_nexus_address();

-- Update existing profiles without nexus addresses
UPDATE public.profiles
SET nexus_address = generate_nexus_address(COALESCE(username, 'user'))
WHERE nexus_address IS NULL;

-- Create nexus_transactions table
CREATE TABLE public.nexus_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 10),
  sender_address text NOT NULL,
  receiver_address text NOT NULL,
  hide_amount boolean NOT NULL DEFAULT false,
  hide_usernames boolean NOT NULL DEFAULT false,
  private_mode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on nexus_transactions
ALTER TABLE public.nexus_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for nexus_transactions
CREATE POLICY "Users can view public transactions"
  ON public.nexus_transactions
  FOR SELECT
  USING (private_mode = false OR auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create their own transactions"
  ON public.nexus_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all transactions"
  ON public.nexus_transactions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create nexus_boosts table for 24h mining boosts
CREATE TABLE public.nexus_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.nexus_transactions(id),
  boost_percentage integer NOT NULL DEFAULT 20,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on nexus_boosts
ALTER TABLE public.nexus_boosts ENABLE ROW LEVEL SECURITY;

-- RLS policies for nexus_boosts
CREATE POLICY "Users can view their own nexus boosts"
  ON public.nexus_boosts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nexus boosts"
  ON public.nexus_boosts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nexus boosts"
  ON public.nexus_boosts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create nexus_privacy_settings table for default toggles
CREATE TABLE public.nexus_privacy_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  hide_amount boolean NOT NULL DEFAULT false,
  hide_usernames boolean NOT NULL DEFAULT false,
  private_mode boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on nexus_privacy_settings
ALTER TABLE public.nexus_privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for nexus_privacy_settings
CREATE POLICY "Users can view their own privacy settings"
  ON public.nexus_privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
  ON public.nexus_privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
  ON public.nexus_privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get today's send count for a user
CREATE OR REPLACE FUNCTION public.get_daily_send_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.nexus_transactions
  WHERE sender_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + interval '1 day';
$$;

-- Function to process nexus transfer
CREATE OR REPLACE FUNCTION public.send_nexus_transfer(
  p_sender_id uuid,
  p_receiver_address text,
  p_amount numeric,
  p_hide_amount boolean DEFAULT false,
  p_hide_usernames boolean DEFAULT false,
  p_private_mode boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_receiver_id uuid;
  v_sender_address text;
  v_sender_points numeric;
  v_daily_count integer;
  v_transaction_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Validate amount
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer amount is 10 ARX-P');
  END IF;

  -- Get receiver by address
  SELECT user_id INTO v_receiver_id
  FROM public.profiles
  WHERE nexus_address = p_receiver_address;

  IF v_receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient address not found');
  END IF;

  -- Cannot send to self
  IF v_receiver_id = p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send to yourself');
  END IF;

  -- Get sender address
  SELECT nexus_address INTO v_sender_address
  FROM public.profiles
  WHERE user_id = p_sender_id;

  -- Check daily limit
  v_daily_count := get_daily_send_count(p_sender_id);
  IF v_daily_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Daily transfer limit reached (5/day)');
  END IF;

  -- Check sender balance
  SELECT total_points INTO v_sender_points
  FROM public.user_points
  WHERE user_id = p_sender_id;

  IF v_sender_points IS NULL OR v_sender_points < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct from sender
  UPDATE public.user_points
  SET 
    social_points = social_points - p_amount,
    updated_at = now()
  WHERE user_id = p_sender_id;

  -- Add to receiver
  INSERT INTO public.user_points (user_id, social_points, updated_at)
  VALUES (v_receiver_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    social_points = user_points.social_points + p_amount,
    updated_at = now();

  -- Create transaction record
  INSERT INTO public.nexus_transactions (
    sender_id, receiver_id, amount, sender_address, receiver_address,
    hide_amount, hide_usernames, private_mode
  )
  VALUES (
    p_sender_id, v_receiver_id, p_amount, v_sender_address, p_receiver_address,
    p_hide_amount, p_hide_usernames, p_private_mode
  )
  RETURNING id INTO v_transaction_id;

  -- Create unclaimed boost for sender
  INSERT INTO public.nexus_boosts (user_id, transaction_id, boost_percentage, claimed)
  VALUES (p_sender_id, v_transaction_id, 20, false);

  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'message', 'Transfer successful'
  );
END;
$$;

-- Function to claim nexus reward
CREATE OR REPLACE FUNCTION public.claim_nexus_reward(p_transaction_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_boost_id uuid;
  v_user_id uuid;
  v_claimed boolean;
BEGIN
  -- Get boost record
  SELECT id, user_id, claimed INTO v_boost_id, v_user_id, v_claimed
  FROM public.nexus_boosts
  WHERE transaction_id = p_transaction_id;

  IF v_boost_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Boost not found');
  END IF;

  IF auth.uid() <> v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF v_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Reward already claimed');
  END IF;

  -- Mark as claimed
  UPDATE public.nexus_boosts
  SET claimed = true, expires_at = now() + interval '24 hours'
  WHERE id = v_boost_id;

  -- Add 5 ARX-P bonus
  UPDATE public.user_points
  SET 
    social_points = social_points + 5,
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Reward claimed! +5 ARX-P and 20% boost for 24h');
END;
$$;

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.nexus_transactions;
