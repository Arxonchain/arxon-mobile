-- Fix live-battle push recovery after create trigger was made lightweight (20260820143000).
-- Pending push must not require created_notified_at / in-app rows — edge ensures those before FCM.

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
  ORDER BY b.starts_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

COMMENT ON FUNCTION public.list_arena_battles_pending_created_push(integer) IS
  'Active arena battles that started but have not received the FCM new-battle broadcast yet.';
