-- Bump four-tx daily claim to 5000 ARX-P.

ALTER TABLE public.daily_four_tx_claim ALTER COLUMN amount SET DEFAULT 5000;

CREATE OR REPLACE FUNCTION public.claim_daily_four_tx(
  p_wallet text,
  p_utc_date date,
  p_shield_hash text,
  p_private_hash text,
  p_unshield_self_hash text,
  p_unshield_other_hash text,
  p_unshield_self_payout text,
  p_unshield_other_payout text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_amount numeric := 5000;
  v_id uuid;
  v_result public.user_points%ROWTYPE;
  v_hash text := '^0x[0-9a-fA-F]{64}$';
  v_addr text := '^0x[0-9a-fA-F]{40}$';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_utc_date IS DISTINCT FROM v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim must be for the current UTC day');
  END IF;

  IF p_wallet IS NULL OR p_wallet !~ v_addr
     OR p_unshield_self_payout IS NULL OR p_unshield_self_payout !~ v_addr
     OR p_unshield_other_payout IS NULL OR p_unshield_other_payout !~ v_addr THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid address');
  END IF;

  IF lower(p_unshield_self_payout) IS DISTINCT FROM lower(p_wallet) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unshield-to-you payout must be your 0x');
  END IF;

  IF lower(p_unshield_other_payout) = lower(p_wallet) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unshield-to-other must be a different 0x');
  END IF;

  IF p_shield_hash IS NULL OR p_shield_hash !~ v_hash
     OR p_private_hash IS NULL OR p_private_hash !~ v_hash
     OR p_unshield_self_hash IS NULL OR p_unshield_self_hash !~ v_hash
     OR p_unshield_other_hash IS NULL OR p_unshield_other_hash !~ v_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tx hash');
  END IF;

  IF lower(p_shield_hash) = lower(p_private_hash)
     OR lower(p_shield_hash) = lower(p_unshield_self_hash)
     OR lower(p_shield_hash) = lower(p_unshield_other_hash)
     OR lower(p_private_hash) = lower(p_unshield_self_hash)
     OR lower(p_private_hash) = lower(p_unshield_other_hash)
     OR lower(p_unshield_self_hash) = lower(p_unshield_other_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Four distinct txs required');
  END IF;

  INSERT INTO public.user_points (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.daily_four_tx_claim (
      user_id, utc_date, wallet,
      shield_hash, private_hash, unshield_self_hash, unshield_other_hash,
      unshield_self_payout, unshield_other_payout, amount
    ) VALUES (
      v_user_id, v_today, lower(p_wallet),
      lower(p_shield_hash), lower(p_private_hash), lower(p_unshield_self_hash), lower(p_unshield_other_hash),
      lower(p_unshield_self_payout), lower(p_unshield_other_payout), v_amount
    )
    ON CONFLICT (user_id, utc_date) DO NOTHING
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'One of these txs was already claimed');
  END;

  IF v_id IS NULL THEN
    SELECT * INTO v_result FROM public.user_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'points', 0,
      'user_points', row_to_json(v_result)
    );
  END IF;

  UPDATE public.user_points
  SET mining_points = GREATEST(COALESCE(mining_points, 0), 0) + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_result;

  IF v_result IS NULL THEN
    DELETE FROM public.daily_four_tx_claim WHERE id = v_id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to credit ARX-P');
  END IF;

  PERFORM public.log_points_ledger_entry(
    v_user_id,
    v_amount,
    'mining',
    'Four-tx test claim (+' || v_amount || ' ARX-P)',
    'daily_four_tx_claim',
    v_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'points', v_amount,
    'user_points', row_to_json(v_result)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_four_tx(text, date, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_four_tx(text, date, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_four_tx(text, date, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_four_tx(text, date, text, text, text, text, text, text) TO service_role;
