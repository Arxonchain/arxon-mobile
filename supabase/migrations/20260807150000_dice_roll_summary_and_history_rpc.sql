-- Dice Roll: lifetime stats + merged play history (free rolls + house matches)
CREATE OR REPLACE FUNCTION public.get_dice_summary(p_limit INTEGER DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_lifetime_won NUMERIC;
  v_lifetime_staked NUMERIC;
  v_wins INTEGER;
  v_house_matches INTEGER;
  v_free_rolls INTEGER;
  v_history JSONB;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_lifetime_won
  FROM public.points_ledger WHERE user_id = v_user AND category IN ('dice_win', 'dice_free_roll');

  SELECT COALESCE(SUM(-amount), 0) INTO v_lifetime_staked
  FROM public.points_ledger WHERE user_id = v_user AND category = 'dice_stake';

  SELECT COUNT(*) INTO v_wins FROM public.dice_matches WHERE created_by = v_user AND winner_id = v_user;
  SELECT COUNT(*) INTO v_house_matches FROM public.dice_matches WHERE created_by = v_user AND mode = 'house' AND status = 'complete';
  SELECT COUNT(*) INTO v_free_rolls FROM public.points_ledger WHERE user_id = v_user AND category = 'dice_free_roll';

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_history
  FROM (
    SELECT
      m.id::text AS id,
      'house'::text AS kind,
      m.stake AS stake,
      m.pot AS pot,
      (m.winner_id = v_user) AS won,
      CASE WHEN m.winner_id = v_user THEN m.pot - m.stake ELSE -m.stake END AS net,
      m.completed_at AS at
    FROM public.dice_matches m
    WHERE m.created_by = v_user AND m.mode = 'house' AND m.status = 'complete'
    UNION ALL
    SELECT
      l.id::text AS id,
      'free_roll'::text AS kind,
      NULL::integer AS stake,
      NULL::integer AS pot,
      true AS won,
      l.amount AS net,
      l.created_at AS at
    FROM public.points_ledger l
    WHERE l.user_id = v_user AND l.category = 'dice_free_roll'
    ORDER BY at DESC
    LIMIT p_limit
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'lifetime_net', v_lifetime_won - v_lifetime_staked,
    'lifetime_won', v_lifetime_won,
    'lifetime_staked', v_lifetime_staked,
    'wins', v_wins,
    'house_matches', v_house_matches,
    'free_rolls_claimed', v_free_rolls,
    'history', v_history
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dice_summary(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dice_summary(INTEGER) TO authenticated;
