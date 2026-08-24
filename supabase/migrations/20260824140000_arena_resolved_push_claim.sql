-- One FCM resolved-push blast per battle (prevents stale background jobs re-sending old battles).

ALTER TABLE public.arena_battles
  ADD COLUMN IF NOT EXISTS resolved_push_at timestamptz;

COMMENT ON COLUMN public.arena_battles.resolved_push_at IS
  'Set when the first arena_push_blast chunk (offset 0) successfully claims FCM send for this resolve.';

-- Battles fully resolved before this deploy already received in-app + FCM.
UPDATE public.arena_battles
SET resolved_push_at = COALESCE(resolved_notified_at, outcome_verified_at, updated_at)
WHERE winner_side IS NOT NULL
  AND resolved_push_at IS NULL
  AND COALESCE(resolved_notified_at, outcome_verified_at, updated_at) < date '2026-08-24';

CREATE OR REPLACE FUNCTION public.claim_arena_battle_resolved_push(p_battle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.arena_battles
  SET resolved_push_at = now()
  WHERE id = p_battle_id
    AND winner_side IS NOT NULL
    AND resolved_push_at IS NULL;
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.claim_arena_battle_resolved_push(uuid) IS
  'Returns true only for the first resolved FCM blast (offset 0 worker).';

REVOKE ALL ON FUNCTION public.claim_arena_battle_resolved_push(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_arena_battle_resolved_push(uuid) TO service_role, postgres;
