-- P1: Single admin stats RPC — no full-table client reads for dashboard aggregates.

CREATE OR REPLACE FUNCTION public.get_admin_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_eight_hours_ago timestamptz := now() - interval '8 hours';
  v_total_users bigint;
  v_active_miners bigint;
  v_total_referrals bigint;
  v_today_signups bigint;
  v_total_miners_ever bigint;
  v_total_sessions bigint;
  v_total_sessions_arx_mined numeric;
  v_today_mining_points numeric;
  v_total_mining_points numeric;
  v_total_points numeric;
  v_total_task_points numeric;
  v_total_social_points numeric;
  v_total_referral_points numeric;
  v_user_points_rows bigint;
  v_total_arena_earnings numeric;
  v_total_checkin_points numeric;
  v_claiming_enabled boolean;
  v_block_reward numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;

  SELECT COUNT(*) INTO v_active_miners
  FROM public.mining_sessions ms
  WHERE ms.is_active = true
    AND ms.started_at >= v_eight_hours_ago;

  SELECT
    COUNT(DISTINCT ms.user_id),
    COUNT(*)::bigint,
    COALESCE(SUM(ms.arx_mined), 0)
  INTO v_total_miners_ever, v_total_sessions, v_total_sessions_arx_mined
  FROM public.mining_sessions ms;

  SELECT COALESCE(SUM(ms.arx_mined), 0) INTO v_today_mining_points
  FROM public.mining_sessions ms
  WHERE ms.started_at >= v_today_start;

  SELECT
    COALESCE(SUM(up.mining_points), 0),
    COALESCE(SUM(up.total_points), 0),
    COALESCE(SUM(up.task_points), 0),
    COALESCE(SUM(up.social_points), 0),
    COALESCE(SUM(up.referral_points), 0),
    COUNT(*)::bigint
  INTO
    v_total_mining_points,
    v_total_points,
    v_total_task_points,
    v_total_social_points,
    v_total_referral_points,
    v_user_points_rows
  FROM public.user_points up;

  SELECT COUNT(*) INTO v_total_referrals FROM public.referrals;

  SELECT COALESCE(SUM(ae.total_earned), 0) INTO v_total_arena_earnings
  FROM public.arena_earnings ae;

  SELECT COALESCE(SUM(dc.points_awarded), 0) INTO v_total_checkin_points
  FROM public.daily_checkins dc;

  SELECT COUNT(*) INTO v_today_signups
  FROM public.profiles p
  WHERE p.created_at >= v_today_start;

  SELECT ms.claiming_enabled, ms.block_reward
  INTO v_claiming_enabled, v_block_reward
  FROM public.mining_settings ms
  LIMIT 1;

  RETURN jsonb_build_object(
    'totalUsers', COALESCE(v_total_users, 0),
    'activeMiners', COALESCE(v_active_miners, 0),
    'totalMiningPoints', COALESCE(v_total_mining_points, 0),
    'totalPoints', COALESCE(v_total_points, 0),
    'totalReferrals', COALESCE(v_total_referrals, 0),
    'claimingEnabled', COALESCE(v_claiming_enabled, false),
    'blockReward', COALESCE(v_block_reward, 1000),
    'totalMinersEver', COALESCE(v_total_miners_ever, 0),
    'totalTaskPoints', COALESCE(v_total_task_points, 0),
    'totalSocialPoints', COALESCE(v_total_social_points, 0),
    'totalReferralPoints', COALESCE(v_total_referral_points, 0),
    'totalCheckinPoints', COALESCE(v_total_checkin_points, 0),
    'totalArenaEarnings', COALESCE(v_total_arena_earnings, 0),
    'totalSessions', COALESCE(v_total_sessions, 0),
    'totalSessionsArxMined', COALESCE(v_total_sessions_arx_mined, 0),
    'avgPointsPerUser', CASE
      WHEN COALESCE(v_user_points_rows, 0) > 0
        THEN ROUND(v_total_points / v_user_points_rows)
      ELSE 0
    END,
    'todaySignups', COALESCE(v_today_signups, 0),
    'todayMiningPoints', COALESCE(v_today_mining_points, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_global_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_global_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_global_stats() TO service_role;
