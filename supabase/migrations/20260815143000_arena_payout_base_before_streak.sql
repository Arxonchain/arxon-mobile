-- Fix Arena payouts: every winning staker gets their proportional pool share first.
-- Streak bonus is paid only from leftover after all base shares (never zeros winners).
-- Also backfill battle c2bb0d2b-3018-444f-b698-41a7f5fccb06 via clawback+redistribute.

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
  v_desired_streak NUMERIC;
  v_streak_bonus NUMERIC;
  v_streak_pct NUMERIC;
  v_total_reward NUMERIC;
  v_sum_base NUMERIC := 0;
  v_sum_desired_streak NUMERIC := 0;
  v_leftover NUMERIC;
  v_streak_scale NUMERIC := 0;
  v_total_distributed NUMERIC := 0;
  v_current_streak INT;
  v_inserted UUID;
  v_left NUMERIC;
  v_chunk NUMERIC;
  v_dust NUMERIC;
  v_top_user UUID;
BEGIN
  IF NEW.winner_side IS NULL OR OLD.winner_side IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

  CREATE TEMP TABLE IF NOT EXISTS _arena_payout_work (
    user_id UUID PRIMARY KEY,
    power_spent NUMERIC NOT NULL,
    weight NUMERIC NOT NULL,
    current_streak INT NOT NULL,
    base_reward NUMERIC NOT NULL DEFAULT 0,
    desired_streak NUMERIC NOT NULL DEFAULT 0,
    streak_bonus NUMERIC NOT NULL DEFAULT 0,
    total_reward NUMERIC NOT NULL DEFAULT 0
  ) ON COMMIT DROP;
  DELETE FROM _arena_payout_work;

  -- Pass 1: guaranteed proportional base share for EVERY winner
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
    v_base_reward := FLOOR((v_weight / v_total_weight) * v_total_pool);
    v_net_profit := GREATEST(0, v_base_reward - v_vote.power_spent);

    v_current_streak := v_vote.current_win_streak + 1;
    v_streak_pct := CASE
      WHEN v_current_streak >= 10 THEN 1.0
      WHEN v_current_streak >= 5 THEN 0.5
      WHEN v_current_streak >= 3 THEN 0.25
      ELSE 0
    END;
    v_desired_streak := FLOOR(v_net_profit * v_streak_pct);

    INSERT INTO _arena_payout_work (
      user_id, power_spent, weight, current_streak, base_reward, desired_streak
    ) VALUES (
      v_vote.user_id, v_vote.power_spent, v_weight, v_current_streak, v_base_reward, v_desired_streak
    );

    v_sum_base := v_sum_base + v_base_reward;
    v_sum_desired_streak := v_sum_desired_streak + v_desired_streak;
  END LOOP;

  -- Pass 2: streak only from leftover after all bases (never consumes other winners' share)
  v_leftover := GREATEST(0, v_total_pool - v_sum_base);
  IF v_sum_desired_streak > 0 AND v_leftover > 0 THEN
    v_streak_scale := LEAST(1.0, v_leftover / v_sum_desired_streak);
  ELSE
    v_streak_scale := 0;
  END IF;

  UPDATE _arena_payout_work
  SET
    streak_bonus = FLOOR(desired_streak * v_streak_scale),
    total_reward = base_reward + FLOOR(desired_streak * v_streak_scale);

  SELECT COALESCE(SUM(total_reward), 0) INTO v_total_distributed FROM _arena_payout_work;

  -- Floor dust (if any) goes to top-weight winner — still within TOTAL_POOL
  v_dust := GREATEST(0, v_total_pool - v_total_distributed);
  IF v_dust > 0 THEN
    SELECT user_id INTO v_top_user
    FROM _arena_payout_work
    ORDER BY weight DESC, power_spent DESC
    LIMIT 1;

    IF v_top_user IS NOT NULL THEN
      UPDATE _arena_payout_work
      SET total_reward = total_reward + v_dust
      WHERE user_id = v_top_user;
      v_total_distributed := v_total_distributed + v_dust;
    END IF;
  END IF;

  -- Pass 3: write earnings + credit points
  FOR v_vote IN
    SELECT * FROM _arena_payout_work ORDER BY weight DESC, power_spent DESC
  LOOP
    v_total_reward := v_vote.total_reward;
    v_streak_bonus := v_vote.streak_bonus;
    v_current_streak := v_vote.current_streak;

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

-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: clawback streak-stolen overpay, credit unpaid winners to base share
-- Battle: c2bb0d2b-3018-444f-b698-41a7f5fccb06
-- Safe: all overpaid users still hold the excess in arena_points.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_battle_id UUID := 'c2bb0d2b-3018-444f-b698-41a7f5fccb06';
  v_total_pool NUMERIC;
  v_total_weight NUMERIC;
  r RECORD;
  v_delta NUMERIC;
  v_claw NUMERIC;
  v_actual_claw NUMERIC;
  v_left NUMERIC;
  v_chunk NUMERIC;
  v_sum_correct NUMERIC := 0;
  v_clawed NUMERIC := 0;
  v_credited NUMERIC := 0;
  v_winners_fixed INT := 0;
  v_shortfall NUMERIC := 0;
BEGIN
  SELECT COALESCE(prize_pool, 0) + COALESCE(side_a_power, 0) + COALESCE(side_b_power, 0) + COALESCE(side_c_power, 0)
  INTO v_total_pool
  FROM public.arena_battles
  WHERE id = v_battle_id
  FOR UPDATE;

  IF v_total_pool IS NULL THEN
    RAISE EXCEPTION 'Backfill battle not found';
  END IF;

  -- Idempotent: skip if no zeroed winners remain
  IF NOT EXISTS (
    SELECT 1 FROM public.arena_earnings
    WHERE battle_id = v_battle_id AND is_winner = true AND total_earned = 0
  ) THEN
    RAISE NOTICE 'Arena backfill skipped — no zeroed winners for %', v_battle_id;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(av.power_spent * COALESCE(av.early_stake_multiplier, 1.0)), 0)
  INTO v_total_weight
  FROM public.arena_votes av
  WHERE av.battle_id = v_battle_id AND av.side = 'b';

  IF v_total_weight <= 0 THEN
    RAISE EXCEPTION 'Backfill: zero winner weight';
  END IF;

  CREATE TEMP TABLE _arena_bf (
    user_id UUID PRIMARY KEY,
    power_spent NUMERIC NOT NULL,
    weight NUMERIC NOT NULL,
    paid NUMERIC NOT NULL,
    correct_base NUMERIC NOT NULL,
    delta NUMERIC NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _arena_bf (user_id, power_spent, weight, paid, correct_base, delta)
  SELECT
    av.user_id,
    av.power_spent,
    av.power_spent * COALESCE(av.early_stake_multiplier, 1.0),
    ae.total_earned,
    FLOOR((av.power_spent * COALESCE(av.early_stake_multiplier, 1.0) / v_total_weight) * v_total_pool),
    FLOOR((av.power_spent * COALESCE(av.early_stake_multiplier, 1.0) / v_total_weight) * v_total_pool) - ae.total_earned
  FROM public.arena_votes av
  JOIN public.arena_earnings ae ON ae.battle_id = av.battle_id AND ae.user_id = av.user_id
  WHERE av.battle_id = v_battle_id AND av.side = 'b' AND ae.is_winner = true;

  SELECT COALESCE(SUM(correct_base), 0) INTO v_sum_correct FROM _arena_bf;

  -- Floor dust to top-weight winner
  IF v_total_pool > v_sum_correct THEN
    UPDATE _arena_bf b
    SET correct_base = correct_base + (v_total_pool - v_sum_correct),
        delta = delta + (v_total_pool - v_sum_correct)
    WHERE user_id = (
      SELECT user_id FROM _arena_bf ORDER BY weight DESC, power_spent DESC LIMIT 1
    );
  END IF;

  -- Allow arena_points decreases under validate_user_points_integrity
  PERFORM set_config('app.arena_stake', 'true', true);

  -- 1) Claw back overpayments from arena_points only (not mining/task buckets)
  FOR r IN SELECT * FROM _arena_bf WHERE delta < 0 ORDER BY delta ASC LOOP
    v_claw := ABS(r.delta);
    v_actual_claw := 0;

    UPDATE public.user_points up
    SET arena_points = GREATEST(0, COALESCE(up.arena_points, 0) - v_claw),
        updated_at = now()
    WHERE up.user_id = r.user_id
      AND COALESCE(up.arena_points, 0) >= v_claw;

    IF FOUND THEN
      v_actual_claw := v_claw;
    ELSE
      -- Partial clawback if balance dipped
      SELECT LEAST(v_claw, COALESCE(arena_points, 0)) INTO v_actual_claw
      FROM public.user_points WHERE user_id = r.user_id;

      v_actual_claw := COALESCE(v_actual_claw, 0);
      IF v_actual_claw > 0 THEN
        UPDATE public.user_points
        SET arena_points = GREATEST(0, COALESCE(arena_points, 0) - v_actual_claw),
            updated_at = now()
        WHERE user_id = r.user_id;
      END IF;
      v_shortfall := v_shortfall + (v_claw - v_actual_claw);
    END IF;

    UPDATE public.arena_earnings
    SET total_earned = r.correct_base,
        pool_share_earned = r.correct_base,
        bonus_earned = r.correct_base - r.power_spent,
        streak_bonus = 0
    WHERE battle_id = v_battle_id AND user_id = r.user_id;

    UPDATE public.arena_staking_rewards
    SET total_reward = r.correct_base,
        loser_pool_share = r.correct_base,
        multiplier = CASE WHEN r.power_spent > 0 THEN r.correct_base / r.power_spent ELSE 0 END
    WHERE battle_id = v_battle_id AND user_id = r.user_id;

    IF v_actual_claw > 0 THEN
      PERFORM public.log_points_ledger_entry(
        r.user_id,
        -v_actual_claw,
        'arena_payout_clawback',
        'Arena streak-overpay clawback battle ' || v_battle_id::text || ' (-' || v_actual_claw::text || ' ARX-P)',
        'arena_battle',
        v_battle_id
      );
    END IF;

    v_clawed := v_clawed + v_actual_claw;
    v_winners_fixed := v_winners_fixed + 1;
  END LOOP;

  -- 2) Credit underpaid / zeroed winners up to correct base
  FOR r IN SELECT * FROM _arena_bf WHERE delta > 0 ORDER BY delta DESC LOOP
    v_delta := r.delta;
    v_left := v_delta;
    WHILE v_left > 0 LOOP
      v_chunk := LEAST(v_left, 500);
      PERFORM public.increment_user_points(r.user_id, v_chunk, 'arena');
      v_left := v_left - v_chunk;
    END LOOP;

    UPDATE public.arena_earnings
    SET total_earned = r.correct_base,
        pool_share_earned = r.correct_base,
        bonus_earned = r.correct_base - r.power_spent,
        streak_bonus = 0
    WHERE battle_id = v_battle_id AND user_id = r.user_id;

    INSERT INTO public.arena_staking_rewards (
      battle_id, user_id, original_stake, multiplier, stake_return,
      loser_pool_share, total_reward, is_winner
    ) VALUES (
      v_battle_id, r.user_id, r.power_spent,
      CASE WHEN r.power_spent > 0 THEN r.correct_base / r.power_spent ELSE 0 END,
      0, r.correct_base, r.correct_base, true
    )
    ON CONFLICT (battle_id, user_id) DO UPDATE
    SET total_reward = EXCLUDED.total_reward,
        loser_pool_share = EXCLUDED.loser_pool_share,
        multiplier = EXCLUDED.multiplier,
        original_stake = EXCLUDED.original_stake,
        is_winner = true;

    PERFORM public.log_points_ledger_entry(
      r.user_id,
      v_delta,
      'arena_payout_topup',
      'Arena base-share top-up battle ' || v_battle_id::text || ' (+' || v_delta::text || ' ARX-P)',
      'arena_battle',
      v_battle_id
    );

    v_credited := v_credited + v_delta;
    v_winners_fixed := v_winners_fixed + 1;
  END LOOP;

  -- 3) Zero phantom streak_bonus on already-correct rows
  UPDATE public.arena_earnings ae
  SET streak_bonus = 0
  FROM _arena_bf b
  WHERE ae.battle_id = v_battle_id
    AND ae.user_id = b.user_id
    AND b.delta = 0
    AND ae.streak_bonus <> 0;

  UPDATE public.arena_battles
  SET total_rewards_distributed = (
        SELECT COALESCE(SUM(total_earned), 0)
        FROM public.arena_earnings
        WHERE battle_id = v_battle_id AND is_winner = true
      ),
      resolution_source = COALESCE(resolution_source, '') ||
        ' | payout_fix_v3_base_before_streak clawed=' || v_clawed::text ||
        ' credited=' || v_credited::text ||
        ' shortfall=' || v_shortfall::text
  WHERE id = v_battle_id;

  RAISE NOTICE 'Arena backfill done battle=% clawed=% credited=% shortfall=% fixed=%',
    v_battle_id, v_clawed, v_credited, v_shortfall, v_winners_fixed;

  IF EXISTS (
    SELECT 1 FROM public.arena_earnings
    WHERE battle_id = v_battle_id AND is_winner = true AND total_earned = 0
  ) THEN
    RAISE EXCEPTION 'Backfill failed: zeroed winners remain';
  END IF;

  IF (
    SELECT COALESCE(SUM(total_earned), 0)
    FROM public.arena_earnings
    WHERE battle_id = v_battle_id AND is_winner = true
  ) > v_total_pool THEN
    RAISE EXCEPTION 'Backfill failed: winner payouts exceed pool';
  END IF;
END;
$$;
