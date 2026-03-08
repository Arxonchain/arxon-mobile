
-- Update the send_nexus_transfer function with new limits (1-10 ARX-P)
CREATE OR REPLACE FUNCTION public.send_nexus_transfer(p_sender_id uuid, p_receiver_address text, p_amount numeric, p_hide_amount boolean DEFAULT false, p_hide_usernames boolean DEFAULT false, p_private_mode boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receiver_id UUID;
  v_sender_address TEXT;
  v_sender_balance NUMERIC;
  v_daily_count INTEGER;
  v_transaction_id UUID;
  v_existing_transaction BOOLEAN;
BEGIN
  -- Validate minimum amount
  IF p_amount < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer is 1 ARX-P');
  END IF;

  -- Validate maximum amount
  IF p_amount > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum transfer is 10 ARX-P');
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
$function$;
