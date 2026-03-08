-- Drop the existing function first, then recreate with new signature
DROP FUNCTION IF EXISTS public.get_arena_participation(uuid);

CREATE FUNCTION public.get_arena_participation(p_battle_id uuid)
 RETURNS TABLE(battle_id uuid, user_id uuid, power_spent numeric, side text, created_at timestamp with time zone, username text, avatar_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    av.battle_id,
    av.user_id,
    av.power_spent,
    av.side,
    av.created_at,
    p.username,
    p.avatar_url
  FROM public.arena_votes av
  LEFT JOIN public.profiles p ON p.user_id = av.user_id
  WHERE av.battle_id = p_battle_id
  ORDER BY av.power_spent DESC;
$function$;