-- Update the trigger function to handle side C votes
CREATE OR REPLACE FUNCTION public.update_battle_power()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.side = 'a' THEN
    UPDATE public.arena_battles 
    SET side_a_power = side_a_power + NEW.power_spent 
    WHERE id = NEW.battle_id;
  ELSIF NEW.side = 'c' THEN
    UPDATE public.arena_battles 
    SET side_c_power = COALESCE(side_c_power, 0) + NEW.power_spent 
    WHERE id = NEW.battle_id;
  ELSE
    UPDATE public.arena_battles 
    SET side_b_power = side_b_power + NEW.power_spent 
    WHERE id = NEW.battle_id;
  END IF;
  RETURN NEW;
END;
$function$;