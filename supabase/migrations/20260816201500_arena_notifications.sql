-- Arena / Prediction Market notifications: in-app history + secure RLS + triggers + cron

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS battle_id uuid REFERENCES public.arena_battles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_battle_type
  ON public.user_notifications(battle_id, notification_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_battle_type_user
  ON public.user_notifications(user_id, battle_id, notification_type)
  WHERE battle_id IS NOT NULL;

ALTER TABLE public.arena_battles
  ADD COLUMN IF NOT EXISTS created_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_notified_at timestamptz;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;

REVOKE INSERT, DELETE ON public.user_notifications FROM anon, authenticated, PUBLIC;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role, postgres;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.insert_user_notification(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_amount numeric DEFAULT 0,
  p_battle_id uuid DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.user_notifications (
    user_id, notification_type, title, message, amount, battle_id, data
  ) VALUES (
    p_user_id, p_notification_type, p_title, p_message, COALESCE(p_amount, 0), p_battle_id, COALESCE(p_data, '{}'::jsonb)
  )
  ON CONFLICT (user_id, battle_id, notification_type)
    WHERE battle_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_user_notification(uuid, text, text, text, numeric, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_notification(uuid, text, text, text, numeric, uuid, jsonb) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.trg_fn_notify_arena_battle_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS NOT TRUE OR NEW.created_notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, notification_type, title, message, battle_id, data)
  SELECT
    p.user_id,
    'arena_new_battle',
    '⚔️ New Arena Battle!',
    'A new prediction market is live: "' || NEW.title || '". Stake your ARX-P now!',
    NEW.id,
    jsonb_build_object('battle_id', NEW.id, 'title', NEW.title, 'url', '/arena/prediction-market')
  FROM public.profiles p
  ON CONFLICT (user_id, battle_id, notification_type)
    WHERE battle_id IS NOT NULL
  DO NOTHING;

  NEW.created_notified_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_arena_battle_created ON public.arena_battles;
CREATE TRIGGER trg_notify_arena_battle_created
  BEFORE INSERT OR UPDATE OF is_active ON public.arena_battles
  FOR EACH ROW
  WHEN (NEW.is_active IS TRUE)
  EXECUTE FUNCTION public.trg_fn_notify_arena_battle_created();

CREATE OR REPLACE FUNCTION public.notify_arena_battles_ended()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle record;
  v_count integer := 0;
BEGIN
  FOR v_battle IN
    SELECT id, title, ends_at
    FROM public.arena_battles
    WHERE is_active = true
      AND ends_at <= now()
      AND end_notified_at IS NULL
  LOOP
    INSERT INTO public.user_notifications (user_id, notification_type, title, message, battle_id, data)
    SELECT
      av.user_id,
      'arena_battle_end',
      '⏱️ Battle Closed',
      'Staking closed for "' || v_battle.title || '". Results coming soon — check Arena!',
      v_battle.id,
      jsonb_build_object('battle_id', v_battle.id, 'ends_at', v_battle.ends_at, 'url', '/arena/prediction-market')
    FROM public.arena_votes av
    WHERE av.battle_id = v_battle.id
    ON CONFLICT (user_id, battle_id, notification_type)
      WHERE battle_id IS NOT NULL
    DO NOTHING;

    UPDATE public.arena_battles SET end_notified_at = now() WHERE id = v_battle.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_arena_battles_ended() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_arena_battles_ended() TO service_role, postgres;

SELECT cron.unschedule('notify-arena-battles-ended')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-arena-battles-ended');

SELECT cron.schedule(
  'notify-arena-battles-ended',
  '* * * * *',
  $$SELECT public.notify_arena_battles_ended();$$
);

CREATE OR REPLACE FUNCTION public.notify_arena_battle_resolved(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle public.arena_battles%ROWTYPE;
  v_winner_name text;
  v_winners integer := 0;
  v_losers integer := 0;
  v_resolved integer := 0;
  r record;
BEGIN
  SELECT * INTO v_battle FROM public.arena_battles WHERE id = p_battle_id;
  IF NOT FOUND OR v_battle.winner_side IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'battle_not_resolved');
  END IF;

  v_winner_name := CASE v_battle.winner_side
    WHEN 'a' THEN v_battle.side_a_name
    WHEN 'b' THEN v_battle.side_b_name
    WHEN 'c' THEN COALESCE(v_battle.side_c_name, 'Draw')
    ELSE 'Void'
  END;

  FOR r IN
    SELECT ae.user_id, ae.is_winner, ae.total_earned, ae.stake_amount, av.side
    FROM public.arena_earnings ae
    JOIN public.arena_votes av ON av.battle_id = ae.battle_id AND av.user_id = ae.user_id
    WHERE ae.battle_id = p_battle_id
  LOOP
    IF r.is_winner THEN
      PERFORM public.insert_user_notification(
        r.user_id, 'arena_win', '🏆 Arena Victory!',
        'You won "' || v_battle.title || '" on ' || v_winner_name || '. +' || r.total_earned::text || ' ARX-P credited!',
        r.total_earned, p_battle_id,
        jsonb_build_object('battle_id', p_battle_id, 'winner_side', v_battle.winner_side, 'url', '/arena/prediction-market')
      );
      v_winners := v_winners + 1;
    ELSE
      PERFORM public.insert_user_notification(
        r.user_id, 'arena_loss', '💧 Arena Battle Result',
        'Your pick lost in "' || v_battle.title || '". ' || r.stake_amount::text || ' ARX-P stake lost.',
        -ABS(r.stake_amount), p_battle_id,
        jsonb_build_object('battle_id', p_battle_id, 'winner_side', v_battle.winner_side, 'url', '/arena/prediction-market')
      );
      v_losers := v_losers + 1;
    END IF;

    PERFORM public.insert_user_notification(
      r.user_id, 'arena_battle_resolved', '📊 Battle Resolved',
      '"' || v_battle.title || '" resolved — winner: ' || v_winner_name || '.',
      0, p_battle_id,
      jsonb_build_object('battle_id', p_battle_id, 'winner_name', v_winner_name, 'url', '/arena/prediction-market')
    );
    v_resolved := v_resolved + 1;
  END LOOP;

  UPDATE public.arena_battles SET resolved_notified_at = COALESCE(resolved_notified_at, now()) WHERE id = p_battle_id;

  RETURN jsonb_build_object('ok', true, 'battle_id', p_battle_id, 'winners', v_winners, 'losers', v_losers, 'resolved_rows', v_resolved);
END;
$$;

CREATE OR REPLACE FUNCTION public.blast_arena_battle_notifications(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.notify_arena_battle_resolved(p_battle_id);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_arena_battle_resolved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.blast_arena_battle_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_arena_battle_resolved(uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.blast_arena_battle_notifications(uuid) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.trg_fn_notify_arena_battle_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.winner_side IS NOT NULL AND OLD.winner_side IS NULL AND NEW.resolved_notified_at IS NULL THEN
    PERFORM public.notify_arena_battle_resolved(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_arena_battle_resolved ON public.arena_battles;
CREATE TRIGGER trg_notify_arena_battle_resolved
  AFTER UPDATE OF winner_side ON public.arena_battles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_notify_arena_battle_resolved();
