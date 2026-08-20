-- Atomic claim so admin invoke + cron cannot double-broadcast the same battle.

CREATE OR REPLACE FUNCTION public.claim_arena_battle_created_push(p_battle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  UPDATE public.arena_battles
  SET created_push_at = now()
  WHERE id = p_battle_id
    AND created_push_at IS NULL
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

COMMENT ON FUNCTION public.claim_arena_battle_created_push(uuid) IS
  'Sets created_push_at if still null; returns true only for the winner (one FCM broadcast).';

REVOKE ALL ON FUNCTION public.claim_arena_battle_created_push(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_arena_battle_created_push(uuid) TO service_role, postgres;
