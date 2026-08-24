-- Redeploy backfill_undercredited_arena_battle with explicit WHERE on every UPDATE
-- (Supabase pg_safeupdate rejects bare UPDATE on temp tables).

CREATE OR REPLACE FUNCTION public.backfill_undercredited_arena_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle public.arena_battles%ROWTYPE;
  v_total_pool NUMERIC;
  v_total_weight NUMERIC := 0;
  v_sum_base NUMERIC := 0;
  v_sum_desired_streak NUMERIC := 0;
  v_leftover NUMERIC;
  v_streak_scale NUMERIC := 0;
  v_total_distributed NUMERIC := 0;
  v_dust NUMERIC;
  v_top_user UUID;
  r RECORD;
  v_credited NUMERIC := 0;
  v_users_fixed INT := 0;
  v_credit NUMERIC;
BEGIN
  SELECT * INTO v_battle
  FROM public.arena_battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found: %', p_battle_id;
  END IF;

  IF v_battle.winner_side IS NULL OR v_battle.winner_side = 'none' THEN
    RETURN jsonb_build_object('battle_id', p_battle_id, 'skipped', true, 'reason', 'no_winner');
  END IF;

  v_total_pool := COALESCE(v_battle.prize_pool, 0)
                + COALESCE(v_battle.side_a_power, 0)
                + COALESCE(v_battle.side_b_power, 0)
                + COALESCE(v_battle.side_c_power, 0);

  DROP TABLE IF EXISTS _arena_bf_payout;
  CREATE TEMP TABLE _arena_bf_payout (
    user_id UUID PRIMARY KEY,
    power_spent NUMERIC NOT NULL,
    weight NUMERIC NOT NULL,
    current_streak INT NOT NULL,
    base_reward NUMERIC NOT NULL DEFAULT 0,
    desired_streak NUMERIC NOT NULL DEFAULT 0,
    streak_bonus NUMERIC NOT NULL DEFAULT 0,
    total_reward NUMERIC NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  FOR r IN
    SELECT
      av.user_id,
      SUM(av.power_spent) AS power_spent,
      SUM(av.power_spent * COALESCE(av.early_stake_multiplier, 1.0)) AS weight,
      COALESCE(MAX(am.current_win_streak), 0) AS current_win_streak
    FROM public.arena_votes av
    LEFT JOIN public.arena_members am ON am.user_id = av.user_id
    WHERE av.battle_id = p_battle_id AND av.side = v_battle.winner_side
    GROUP BY av.user_id
    ORDER BY SUM(av.power_spent) DESC
  LOOP
    INSERT INTO _arena_bf_payout (user_id, power_spent, weight, current_streak)
    VALUES (
      r.user_id,
      r.power_spent,
      r.weight,
      r.current_win_streak + 1
    );
    v_total_weight := v_total_weight + r.weight;
  END LOOP;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('battle_id', p_battle_id, 'skipped', true, 'reason', 'zero_weight');
  END IF;

  UPDATE _arena_bf_payout p
  SET base_reward = FLOOR((p.weight / v_total_weight) * v_total_pool),
      desired_streak = FLOOR(
        GREATEST(0, FLOOR((p.weight / v_total_weight) * v_total_pool) - p.power_spent)
        * CASE
            WHEN p.current_streak >= 10 THEN 1.0
            WHEN p.current_streak >= 5 THEN 0.5
            WHEN p.current_streak >= 3 THEN 0.25
            ELSE 0
          END
      )
  WHERE p.user_id IS NOT NULL;

  SELECT COALESCE(SUM(base_reward), 0), COALESCE(SUM(desired_streak), 0)
  INTO v_sum_base, v_sum_desired_streak
  FROM _arena_bf_payout;

  v_leftover := GREATEST(0, v_total_pool - v_sum_base);
  IF v_sum_desired_streak > 0 AND v_leftover > 0 THEN
    v_streak_scale := LEAST(1.0, v_leftover / v_sum_desired_streak);
  END IF;

  UPDATE _arena_bf_payout p
  SET streak_bonus = FLOOR(p.desired_streak * v_streak_scale),
      total_reward = p.base_reward + FLOOR(p.desired_streak * v_streak_scale)
  WHERE p.user_id IS NOT NULL;

  SELECT COALESCE(SUM(total_reward), 0) INTO v_total_distributed FROM _arena_bf_payout;

  v_dust := GREATEST(0, v_total_pool - v_total_distributed);
  IF v_dust > 0 THEN
    SELECT user_id INTO v_top_user
    FROM _arena_bf_payout
    ORDER BY weight DESC, power_spent DESC
    LIMIT 1;

    IF v_top_user IS NOT NULL THEN
      UPDATE _arena_bf_payout
      SET total_reward = total_reward + v_dust
      WHERE user_id = v_top_user;
      v_total_distributed := v_total_distributed + v_dust;
    END IF;
  END IF;

  UPDATE public.arena_earnings ae
  SET points_credited_amount = CASE
    WHEN COALESCE(up.arena_points, 0) >= ae.total_earned THEN ae.total_earned
    WHEN COALESCE(up.arena_points, 0) > 0 THEN LEAST(ae.total_earned, COALESCE(up.arena_points, 0))
    ELSE COALESCE(ae.points_credited_amount, 0)
  END
  FROM public.user_points up
  WHERE ae.battle_id = p_battle_id
    AND ae.is_winner = true
    AND ae.user_id = up.user_id;

  FOR r IN SELECT * FROM _arena_bf_payout ORDER BY total_reward DESC LOOP
    INSERT INTO public.arena_earnings (
      battle_id, user_id, stake_amount, bonus_earned, pool_share_earned,
      streak_bonus, total_earned, is_winner, points_credited_amount
    ) VALUES (
      p_battle_id, r.user_id, r.power_spent,
      r.total_reward - r.power_spent,
      r.total_reward,
      r.streak_bonus,
      r.total_reward,
      true,
      0
    )
    ON CONFLICT (battle_id, user_id) DO UPDATE
    SET stake_amount = EXCLUDED.stake_amount,
        bonus_earned = EXCLUDED.bonus_earned,
        pool_share_earned = EXCLUDED.pool_share_earned,
        streak_bonus = EXCLUDED.streak_bonus,
        total_earned = EXCLUDED.total_earned,
        is_winner = true;

    INSERT INTO public.arena_staking_rewards (
      battle_id, user_id, original_stake, multiplier, stake_return,
      loser_pool_share, total_reward, is_winner
    ) VALUES (
      p_battle_id, r.user_id, r.power_spent,
      CASE WHEN r.power_spent > 0 THEN r.total_reward / r.power_spent ELSE 0 END,
      0, r.total_reward, r.total_reward, true
    )
    ON CONFLICT (battle_id, user_id) DO UPDATE
    SET original_stake = EXCLUDED.original_stake,
        multiplier = EXCLUDED.multiplier,
        loser_pool_share = EXCLUDED.loser_pool_share,
        total_reward = EXCLUDED.total_reward,
        is_winner = true;

    v_credit := public.credit_arena_battle_earnings(p_battle_id, r.user_id, r.total_reward);
    IF v_credit > 0 THEN
      v_credited := v_credited + v_credit;
      v_users_fixed := v_users_fixed + 1;
    END IF;
  END LOOP;

  UPDATE public.arena_battles
  SET total_rewards_distributed = (
        SELECT COALESCE(SUM(total_earned), 0)
        FROM public.arena_earnings
        WHERE battle_id = p_battle_id AND is_winner = true
      ),
      resolution_source = COALESCE(resolution_source, '') ||
        ' | payout_backfill_v4 credited=' || v_credited::text ||
        ' users=' || v_users_fixed::text
  WHERE id = p_battle_id;

  RETURN jsonb_build_object(
    'battle_id', p_battle_id,
    'credited', v_credited,
    'users_fixed', v_users_fixed,
    'total_pool', v_total_pool
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_undercredited_arena_battle(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_undercredited_arena_battle(UUID) TO service_role;
