-- Unblock Admin "Create Market": do not fan-out notifications inside the INSERT trigger.
-- In-app + FCM fan-out is handled by edge notify-arena-battle-created / cron.

CREATE OR REPLACE FUNCTION public.trg_fn_notify_arena_battle_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentionally lightweight. Heavy inserts + FCM run in edge functions so
  -- admin INSERT does not hang for minutes.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_arena_battle_created ON public.arena_battles;
CREATE TRIGGER trg_notify_arena_battle_created
  AFTER INSERT OR UPDATE OF is_active ON public.arena_battles
  FOR EACH ROW
  WHEN (NEW.is_active IS TRUE)
  EXECUTE FUNCTION public.trg_fn_notify_arena_battle_created();
