-- Add arena_public_access column to mining_settings table
ALTER TABLE public.mining_settings 
ADD COLUMN arena_public_access BOOLEAN NOT NULL DEFAULT false;