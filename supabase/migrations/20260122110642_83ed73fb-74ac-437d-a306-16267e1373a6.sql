
-- Disable triggers, reset points, re-enable triggers
ALTER TABLE user_points DISABLE TRIGGER trg_validate_user_points;
ALTER TABLE user_points DISABLE TRIGGER trg_normalize_user_points_totals;

-- Reset the test user's arena points to 0
UPDATE user_points 
SET 
  mining_points = 0,
  total_points = 131,
  updated_at = now()
WHERE user_id = 'e643f8f4-7850-415e-a6c5-2274929b449b';

-- Re-enable triggers
ALTER TABLE user_points ENABLE TRIGGER trg_validate_user_points;
ALTER TABLE user_points ENABLE TRIGGER trg_normalize_user_points_totals;
