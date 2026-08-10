-- Harden EXECUTE privileges: no anon on user-facing RPCs; expire cron is service_role only.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'cast_arena_vote',
        'get_arena_participation',
        'sync_word_forge_consumables',
        'expire_open_dice_matches'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
    -- expire_open_dice_matches is safe housekeeping; clients call it on lobby refresh + cron
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
