-- Make distribute_arena_rewards idempotent and align with resolve-arena-battle v2.
-- Root cause: uq_arena_earnings_battle_user + plain INSERT caused 23505 when
-- earnings were already written (manual script / edge) before UPDATE winner_side,
-- or on any re-entry of the BEFORE UPDATE trigger.

CREATE OR REPLACE FUNCTION public.distribute_arena_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vote RECORD;
  v_prize_pool NUMERIC;
  v_total_stakes NUMERIC;
  v_total_pool NUMERIC;
  v_total_weight NUMERIC := 0;
  v_weight NUMERIC;
  v_base_reward NUMERIC;
  v_net_profit NUMERIC;
  v_streak_bonus NUMERIC;
  v_streak_pct NUMERIC;
  v_total_reward NUMERIC;
  v_total_distributed NUMERIC := 0;
  v_remaining NUMERIC;
  v_current_streak INT;
  v_inserted UUID;
  v_left NUMERIC;
  v_chunk NUMERIC;
BEGIN
  -- Only run when winner_side is first set
  IF NEW.winner_side IS NULL OR OLD.winner_side IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotent short-circuit: edge/manual already wrote earnings or marked distributed
  IF EXISTS (SELECT 1 FROM public.arena_earnings WHERE battle_id = NEW.id LIMIT 1)
     OR COALESCE(OLD.losing_pool_distributed, false) = true
     OR COALESCE(OLD.total_rewards_distributed, 0) > 0 THEN
    NEW.losing_pool_distributed := true;
    NEW.is_active := false;
    RETURN NEW;
  END IF;

  IF NEW.winner_side = 'none' THEN
    NEW.losing_pool_distributed := true;
    NEW.is_active := false;
    NEW.total_rewards_distributed := 0;
    RETURN NEW;
  END IF;

  -- v2 pool (same as resolve-arena-battle): prize + all side powers on the battle row
  v_prize_pool := COALESCE(NEW.prize_pool, 0);
  v_total_stakes := COALESCE(NEW.side_a_power, 0)
                 + COALESCE(NEW.side_b_power, 0)
                 + COALESCE(NEW.side_c_power, 0);
  v_total_pool := v_prize_pool + v_total_stakes;

  SELECT COALESCE(SUM(av.power_spent * COALESCE(av.early_stake_multiplier, 1.0)), 0)
  INTO v_total_weight
  FROM public.arena_votes av
  WHERE av.battle_id = NEW.id AND av.side = NEW.winner_side;

  IF v_total_weight <= 0 THEN
    NEW.losing_pool_distributed := true;
    NEW.is_active := false;
    NEW.total_rewards_distributed := 0;
    RETURN NEW;
  END IF;

  FOR v_vote IN
    SELECT
      av.user_id,
      av.power_spent,
      COALESCE(av.early_stake_multiplier, 1.0) AS early_stake_multiplier,
      COALESCE(am.current_win_streak, 0) AS current_win_streak
    FROM public.arena_votes av
    LEFT JOIN public.arena_members am ON am.user_id = av.user_id
    WHERE av.battle_id = NEW.id AND av.side = NEW.winner_side
    ORDER BY av.power_spent DESC, av.created_at ASC
  LOOP
    v_weight := v_vote.power_spent * v_vote.early_stake_multiplier;
    v_base_reward := (v_weight / v_total_weight) * v_total_pool;
    v_net_profit := GREATEST(0, v_base_reward - v_vote.power_spent);

    v_current_streak := v_vote.current_win_streak + 1;
    v_streak_pct := CASE
      WHEN v_current_streak >= 10 THEN 1.0
      WHEN v_current_streak >= 5 THEN 0.5
      WHEN v_current_streak >= 3 THEN 0.25
      ELSE 0
    END;

    v_streak_bonus := FLOOR(v_net_profit * v_streak_pct);
    v_total_reward := FLOOR(v_base_reward + v_streak_bonus);

    v_remaining := v_total_pool - v_total_distributed;
    IF v_total_reward > v_remaining THEN
      v_total_reward := FLOOR(v_remaining);
    END IF;
    IF v_total_reward < 0 THEN
      v_total_reward := 0;
    END IF;
    v_total_distributed := v_total_distributed + v_total_reward;

    v_inserted := NULL;
    INSERT INTO public.arena_earnings (
      user_id, battle_id, stake_amount, bonus_earned, pool_share_earned,
      streak_bonus, total_earned, is_winner
    ) VALUES (
      v_vote.user_id,
      NEW.id,
      v_vote.power_spent,
      v_total_reward - v_vote.power_spent,
      v_total_reward,
      v_streak_bonus,
      v_total_reward,
      true
    )
    ON CONFLICT (battle_id, user_id) DO NOTHING
    RETURNING id INTO v_inserted;

    -- Never double-credit points or win stats
    IF v_inserted IS NOT NULL THEN
      IF v_total_reward > 0 THEN
        v_left := v_total_reward;
        WHILE v_left > 0 LOOP
          v_chunk := LEAST(v_left, 500);
          PERFORM public.increment_user_points(v_vote.user_id, v_chunk, 'arena');
          v_left := v_left - v_chunk;
        END LOOP;
      END IF;

      UPDATE public.arena_members
      SET total_wins = total_wins + 1,
          current_win_streak = v_current_streak,
          best_win_streak = GREATEST(best_win_streak, v_current_streak)
      WHERE user_id = v_vote.user_id;
    END IF;
  END LOOP;

  -- Losers: zero earnings, no points; reset streak
  UPDATE public.arena_members am
  SET current_win_streak = 0
  WHERE EXISTS (
    SELECT 1 FROM public.arena_votes av
    WHERE av.battle_id = NEW.id
      AND av.user_id = am.user_id
      AND av.side IS DISTINCT FROM NEW.winner_side
  );

  INSERT INTO public.arena_earnings (
    user_id, battle_id, stake_amount, bonus_earned, pool_share_earned,
    streak_bonus, total_earned, is_winner
  )
  SELECT
    av.user_id, NEW.id, av.power_spent, 0, 0, 0, 0, false
  FROM public.arena_votes av
  WHERE av.battle_id = NEW.id
    AND av.side IS DISTINCT FROM NEW.winner_side
  ON CONFLICT (battle_id, user_id) DO NOTHING;

  NEW.losing_pool_distributed := true;
  NEW.total_rewards_distributed := v_total_distributed;
  NEW.is_active := false;

  RETURN NEW;
END;
$function$;
