-- Add early_stake_multiplier column to arena_votes to track timing bonus
ALTER TABLE public.arena_votes 
ADD COLUMN IF NOT EXISTS early_stake_multiplier NUMERIC DEFAULT 1.0;

-- Add ai_probability columns to arena_battles for storing AI predictions  
ALTER TABLE public.arena_battles
ADD COLUMN IF NOT EXISTS ai_side_a_probability NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS ai_side_b_probability NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS ai_prediction_text TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS ai_last_updated TIMESTAMP WITH TIME ZONE;