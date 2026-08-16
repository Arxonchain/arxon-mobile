-- Delete duplicate arena notifications for battle 7af24605-79b3-4af0-956a-e98cb4681964
-- Run in Supabase SQL Editor (or via scripts/deploy-arena-backend.mjs migration apply)

-- After migration 20260816201500 is applied:
SELECT public.cleanup_arena_battle_notifications('7af24605-79b3-4af0-956a-e98cb4681964'::uuid);

-- Pre-migration fallback (if battle_id column does not exist yet):
-- DELETE FROM public.user_notifications
-- WHERE notification_type IN ('arena_win', 'arena_loss', 'arena_battle_resolved', 'arena_resolved')
--   AND message ILIKE '%7af24605-79b3-4af0-956a-e98cb4681964%';
