
-- Trigger to handle arena vote side effects:
-- 1. Deduct points from user
-- 2. Update battle pool power
-- 3. Increment total_participants
CREATE OR REPLACE FUNCTION public.handle_arena_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduct points from user
  UPDATE user_points
  SET total_points = total_points - NEW.power_spent,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  -- Update battle pool power based on side
  IF NEW.side = 'a' THEN
    UPDATE arena_battles
    SET side_a_power = side_a_power + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  ELSIF NEW.side = 'b' THEN
    UPDATE arena_battles
    SET side_b_power = side_b_power + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  ELSIF NEW.side = 'c' THEN
    UPDATE arena_battles
    SET side_c_power = COALESCE(side_c_power, 0) + NEW.power_spent,
        total_participants = COALESCE(total_participants, 0) + 1
    WHERE id = NEW.battle_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_arena_vote_insert ON arena_votes;
CREATE TRIGGER on_arena_vote_insert
  AFTER INSERT ON arena_votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_arena_vote();
