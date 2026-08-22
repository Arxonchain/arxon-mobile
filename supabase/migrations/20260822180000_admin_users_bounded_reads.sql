-- P1: Bounded admin user list — no full-table mining_sessions reads on the client.

CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_active
  ON public.mining_sessions (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id
  ON public.referrals (referrer_id);

CREATE OR REPLACE FUNCTION public.get_admin_user_session_filter_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all bigint;
  v_active bigint;
  v_completed bigint;
  v_never bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_all FROM public.profiles;

  SELECT COUNT(DISTINCT ms.user_id) INTO v_active
  FROM public.mining_sessions ms
  WHERE ms.is_active = true;

  SELECT COUNT(*) INTO v_completed
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.mining_sessions ms
    WHERE ms.user_id = p.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.mining_sessions ms
    WHERE ms.user_id = p.user_id AND ms.is_active = true
  );

  v_never := v_all - (
    SELECT COUNT(DISTINCT ms.user_id)
    FROM public.mining_sessions ms
  );

  RETURN jsonb_build_object(
    'all', COALESCE(v_all, 0),
    'active', COALESCE(v_active, 0),
    'completed', COALESCE(v_completed, 0),
    'never', GREATEST(COALESCE(v_never, 0), 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_users(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_session_filter text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_filter text := COALESCE(NULLIF(trim(p_session_filter), ''), 'all');
  v_total bigint;
  v_users jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF v_filter NOT IN ('all', 'active', 'completed', 'never') THEN
    RAISE EXCEPTION 'invalid session filter: %', v_filter;
  END IF;

  WITH ms AS (
    SELECT
      ms.user_id,
      COUNT(*)::bigint AS total_sessions,
      COUNT(*) FILTER (WHERE ms.is_active)::bigint AS active_sessions,
      COUNT(*) FILTER (WHERE NOT ms.is_active)::bigint AS completed_sessions,
      COALESCE(SUM(ms.arx_mined), 0) AS total_arx_mined,
      BOOL_OR(ms.is_active) AS has_active,
      MAX(COALESCE(ms.ended_at, ms.started_at)) AS last_active
    FROM public.mining_sessions ms
    GROUP BY ms.user_id
  ),
  refs AS (
    SELECT r.referrer_id AS user_id, COUNT(*)::bigint AS referral_count
    FROM public.referrals r
    GROUP BY r.referrer_id
  ),
  arena AS (
    SELECT
      av.user_id,
      COUNT(*)::bigint AS vote_count,
      COALESCE(SUM(av.power_spent), 0) AS total_power_spent
    FROM public.arena_votes av
    GROUP BY av.user_id
  ),
  base AS (
    SELECT
      p.user_id,
      p.username,
      p.referral_code,
      p.created_at,
      up.total_points,
      up.mining_points,
      up.task_points,
      up.social_points,
      up.referral_points,
      up.daily_streak,
      up.referral_bonus_percentage,
      up.x_post_boost_percentage,
      uw.wallet_address,
      xp.id AS x_id,
      xp.username AS x_username,
      xp.profile_url AS x_profile_url,
      xp.boost_percentage AS x_boost_percentage,
      xp.average_engagement AS x_average_engagement,
      xp.viral_bonus AS x_viral_bonus,
      xp.qualified_posts_today AS x_qualified_posts_today,
      xp.historical_scanned AS x_historical_scanned,
      xp.historical_posts_count AS x_historical_posts_count,
      xp.historical_arx_p_total AS x_historical_arx_p_total,
      xp.historical_boost_total AS x_historical_boost_total,
      xp.last_scanned_at AS x_last_scanned_at,
      xp.created_at AS x_created_at,
      COALESCE(ms.total_sessions, 0) AS total_sessions,
      COALESCE(ms.active_sessions, 0) AS active_sessions,
      COALESCE(ms.completed_sessions, 0) AS completed_sessions,
      COALESCE(ms.total_arx_mined, 0) AS total_arx_mined,
      COALESCE(ms.has_active, false) AS active_session,
      ms.last_active,
      COALESCE(refs.referral_count, 0) AS referral_count,
      COALESCE(arena.vote_count, 0) AS arena_votes,
      COALESCE(arena.total_power_spent, 0) AS arena_power_spent
    FROM public.profiles p
    LEFT JOIN public.user_points up ON up.user_id = p.user_id
    LEFT JOIN public.user_wallets uw ON uw.user_id = p.user_id AND uw.is_primary = true
    LEFT JOIN public.x_profiles xp ON xp.user_id = p.user_id
    LEFT JOIN ms ON ms.user_id = p.user_id
    LEFT JOIN refs ON refs.user_id = p.user_id
    LEFT JOIN arena ON arena.user_id = p.user_id
    WHERE (
      v_search IS NULL OR
      p.username ILIKE '%' || v_search || '%' OR
      p.user_id::text ILIKE '%' || v_search || '%' OR
      p.referral_code ILIKE '%' || v_search || '%' OR
      uw.wallet_address ILIKE '%' || v_search || '%'
    )
    AND (
      v_filter = 'all' OR
      (v_filter = 'active' AND COALESCE(ms.has_active, false)) OR
      (v_filter = 'completed' AND NOT COALESCE(ms.has_active, false) AND COALESCE(ms.total_sessions, 0) > 0) OR
      (v_filter = 'never' AND COALESCE(ms.total_sessions, 0) = 0)
    )
  ),
  page AS (
    SELECT *
    FROM base
    ORDER BY total_points DESC NULLS LAST, created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM base),
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', page.user_id,
            'email', 'hidden@email.com',
            'username', COALESCE(page.username, 'Anonymous'),
            'created_at', page.created_at,
            'wallet', page.wallet_address,
            'total_points', COALESCE(page.total_points, 0),
            'mining_points', COALESCE(page.mining_points, 0),
            'task_points', COALESCE(page.task_points, 0),
            'social_points', COALESCE(page.social_points, 0),
            'referral_points', COALESCE(page.referral_points, 0),
            'daily_streak', COALESCE(page.daily_streak, 0),
            'referral_code', page.referral_code,
            'referral_count', page.referral_count,
            'total_sessions', page.total_sessions,
            'active_session', page.active_session,
            'completed_sessions', page.completed_sessions,
            'last_active', page.last_active,
            'total_arx_mined', page.total_arx_mined,
            'arena_votes', page.arena_votes,
            'arena_power_spent', page.arena_power_spent,
            'referral_bonus_percentage', COALESCE(page.referral_bonus_percentage, 0),
            'x_post_boost_percentage', COALESCE(page.x_post_boost_percentage, 0),
            'x_profile', CASE
              WHEN page.x_id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'id', page.x_id,
                'username', page.x_username,
                'profile_url', page.x_profile_url,
                'boost_percentage', page.x_boost_percentage,
                'average_engagement', page.x_average_engagement,
                'viral_bonus', page.x_viral_bonus,
                'qualified_posts_today', page.x_qualified_posts_today,
                'historical_scanned', page.x_historical_scanned,
                'historical_posts_count', page.x_historical_posts_count,
                'historical_arx_p_total', page.x_historical_arx_p_total,
                'historical_boost_total', page.x_historical_boost_total,
                'last_scanned_at', page.x_last_scanned_at,
                'created_at', page.x_created_at
              )
            END
          )
          ORDER BY page.total_points DESC NULLS LAST, page.created_at DESC
        )
        FROM page
      ),
      '[]'::jsonb
    )
  INTO v_total, v_users;

  RETURN jsonb_build_object(
    'total_count', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'users', COALESCE(v_users, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_user_session_filter_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_user_session_filter_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_session_filter_counts() TO service_role;

REVOKE ALL ON FUNCTION public.list_admin_users(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_users(integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users(integer, integer, text, text) TO service_role;
