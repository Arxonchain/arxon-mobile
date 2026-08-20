-- New-battle FCM fan-out (app closed tray alerts)
-- Applies on Mining App only (oztccmrhiawleucdluwb)

ALTER TABLE public.arena_battles
  ADD COLUMN IF NOT EXISTS created_push_at timestamptz;

COMMENT ON COLUMN public.arena_battles.created_push_at IS
  'When FCM/web-push was broadcast for arena_new_battle (null = pending).';

-- Battles that need a created-battle push (live now, in-app notified, push not yet sent)
CREATE OR REPLACE FUNCTION public.list_arena_battles_pending_created_push(p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, title text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.title
  FROM public.arena_battles b
  WHERE b.is_active IS TRUE
    AND b.winner_side IS NULL
    AND b.starts_at <= now()
    AND b.created_push_at IS NULL
    AND (
      b.created_notified_at IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.user_notifications n
        WHERE n.battle_id = b.id AND n.notification_type = 'arena_new_battle'
        LIMIT 1
      )
    )
  ORDER BY b.starts_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

REVOKE ALL ON FUNCTION public.list_arena_battles_pending_created_push(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_arena_battles_pending_created_push(integer) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.mark_arena_battle_created_push(p_battle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.arena_battles
  SET created_push_at = now()
  WHERE id = p_battle_id
    AND created_push_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_arena_battle_created_push(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_arena_battle_created_push(uuid) TO service_role, postgres;

-- Ensure in-app rows exist even if the create trigger was skipped
CREATE OR REPLACE FUNCTION public.ensure_arena_new_battle_notifications(p_battle_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle public.arena_battles%ROWTYPE;
  v_inserted integer := 0;
BEGIN
  SELECT * INTO v_battle FROM public.arena_battles WHERE id = p_battle_id;
  IF NOT FOUND OR v_battle.is_active IS NOT TRUE THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_notifications (user_id, notification_type, title, message, battle_id, data)
  SELECT
    p.user_id,
    'arena_new_battle',
    '⚔️ New Arena Battle!',
    'A new prediction market is live: "' || v_battle.title || '". Stake your ARX-P now!',
    v_battle.id,
    jsonb_build_object('battle_id', v_battle.id, 'title', v_battle.title, 'url', '/arena/prediction-market')
  FROM public.profiles p
  ON CONFLICT (user_id, battle_id, notification_type)
    WHERE battle_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.arena_battles
  SET created_notified_at = COALESCE(created_notified_at, now())
  WHERE id = p_battle_id;

  RETURN v_inserted;
END;
$$;

-- Also invoke edge for FCM created-battle fan-out every minute (service role via vault optional).
-- Preferred: Dashboard → Edge Functions → Schedules → notify-arena-battle-created every * * * * *
-- Fallback cron keeps SQL end-notifications; push is handled by notify-arena-battle-ends edge when scheduled.

SELECT cron.unschedule('notify-arena-pending-created-push')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-arena-pending-created-push');

