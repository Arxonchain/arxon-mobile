-- Update send_nexus_transfer function with:
-- 1. One-time transaction rule (users can only transact once with each other)
-- 2. 3-day (72 hour) boost duration instead of 24 hours
-- 3. Bonus equals sent amount instead of fixed 5 ARX-P

CREATE OR REPLACE FUNCTION public.send_nexus_transfer(
  p_sender_id UUID,
  p_receiver_address TEXT,
  p_amount NUMERIC,
  p_hide_amount BOOLEAN DEFAULT FALSE,
  p_hide_usernames BOOLEAN DEFAULT FALSE,
  p_private_mode BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_id UUID;
  v_sender_address TEXT;
  v_sender_balance NUMERIC;
  v_daily_count INTEGER;
  v_transaction_id UUID;
  v_existing_transaction BOOLEAN;
BEGIN
  -- Validate minimum amount
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is 10 ARX-P');
  END IF;

  -- Get sender's nexus address
  SELECT nexus_address INTO v_sender_address
  FROM profiles
  WHERE user_id = p_sender_id;

  IF v_sender_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender address not found');
  END IF;

  -- Get receiver's user_id from their nexus address
  SELECT user_id INTO v_receiver_id
  FROM profiles
  WHERE nexus_address = p_receiver_address;

  IF v_receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient address not found');
  END IF;

  -- Cannot send to self
  IF v_receiver_id = p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send to yourself');
  END IF;

  -- Check one-time transaction rule: check if sender has ever sent to receiver OR receiver has ever sent to sender
  SELECT EXISTS(
    SELECT 1 FROM nexus_transactions
    WHERE (sender_id = p_sender_id AND receiver_id = v_receiver_id)
       OR (sender_id = v_receiver_id AND receiver_id = p_sender_id)
  ) INTO v_existing_transaction;

  IF v_existing_transaction THEN
    RETURN json_build_object('success', false, 'error', 'You have already transacted with this user. Find a new miner!');
  END IF;

  -- Check daily limit
  SELECT COUNT(*) INTO v_daily_count
  FROM nexus_transactions
  WHERE sender_id = p_sender_id
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';

  IF v_daily_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Daily transfer limit reached (5/5)');
  END IF;

  -- Check sender balance
  SELECT total_points INTO v_sender_balance
  FROM user_points
  WHERE user_id = p_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct from sender
  UPDATE user_points
  SET total_points = total_points - p_amount,
      updated_at = NOW()
  WHERE user_id = p_sender_id;

  -- Add to receiver
  INSERT INTO user_points (user_id, total_points)
  VALUES (v_receiver_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_points.total_points + p_amount,
      updated_at = NOW();

  -- Create transaction record
  INSERT INTO nexus_transactions (
    sender_id,
    receiver_id,
    sender_address,
    receiver_address,
    amount,
    hide_amount,
    hide_usernames,
    private_mode,
    status
  )
  VALUES (
    p_sender_id,
    v_receiver_id,
    v_sender_address,
    p_receiver_address,
    p_amount,
    p_hide_amount,
    p_hide_usernames,
    p_private_mode,
    'completed'
  )
  RETURNING id INTO v_transaction_id;

  -- Create pending boost (3 days / 72 hours) with bonus equal to sent amount
  INSERT INTO nexus_boosts (
    user_id,
    transaction_id,
    boost_percentage,
    expires_at,
    claimed
  )
  VALUES (
    p_sender_id,
    v_transaction_id,
    20,
    NOW() + INTERVAL '72 hours',
    false
  );

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'message', 'Transfer successful'
  );
END;
$$;

-- Update claim_nexus_reward to give bonus equal to the sent amount
CREATE OR REPLACE FUNCTION public.claim_nexus_reward(p_transaction_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boost_id UUID;
  v_user_id UUID;
  v_already_claimed BOOLEAN;
  v_transaction_amount NUMERIC;
BEGIN
  -- Get the boost record and check if already claimed
  SELECT nb.id, nb.user_id, nb.claimed, nt.amount
  INTO v_boost_id, v_user_id, v_already_claimed, v_transaction_amount
  FROM nexus_boosts nb
  JOIN nexus_transactions nt ON nt.id = nb.transaction_id
  WHERE nb.transaction_id = p_transaction_id;

  IF v_boost_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;

  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Reward already claimed');
  END IF;

  -- Mark boost as claimed
  UPDATE nexus_boosts
  SET claimed = true
  WHERE id = v_boost_id;

  -- Award bonus points equal to the sent amount
  INSERT INTO user_points (user_id, total_points, social_points)
  VALUES (v_user_id, v_transaction_amount, v_transaction_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_points.total_points + v_transaction_amount,
      social_points = user_points.social_points + v_transaction_amount,
      updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'message', 'Reward claimed! +' || v_transaction_amount || ' ARX-P and 20% mining boost for 3 days',
    'bonus_amount', v_transaction_amount
  );
END;
$$;