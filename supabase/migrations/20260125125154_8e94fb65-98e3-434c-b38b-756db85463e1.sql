-- Add third side (draw) support to arena_battles
ALTER TABLE public.arena_battles 
ADD COLUMN IF NOT EXISTS side_c_name text,
ADD COLUMN IF NOT EXISTS side_c_image text,
ADD COLUMN IF NOT EXISTS side_c_color text DEFAULT '#FFD700',
ADD COLUMN IF NOT EXISTS side_c_power numeric DEFAULT 0;

-- Update the Barca vs Oviedo match to include Draw option
UPDATE public.arena_battles 
SET 
  side_c_name = 'Draw',
  side_c_color = '#888888',
  side_c_power = 0
WHERE title = 'FC Barcelona vs Real Oviedo' 
  AND is_active = true;