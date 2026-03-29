-- ════════════════════════════════════════════════════════════════════════
--  ARXON NOTIFICATIONS — Run this in your Supabase SQL Editor
--  Extends user_notifications to support arena win/loss & announcements
-- ════════════════════════════════════════════════════════════════════════

-- Add new notification types if not already present (alter check constraint)
-- First check existing constraint name
DO $$
BEGIN
  -- Ensure user_notifications table exists with the right columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_notifications' AND column_name='notification_type'
  ) THEN
    RAISE NOTICE 'user_notifications table does not have notification_type column';
  END IF;
END $$;

-- Function: notify a user of an arena win
CREATE OR REPLACE FUNCTION notify_arena_win(
  p_user_id UUID,
  p_amount NUMERIC,
  p_battle_title TEXT DEFAULT 'Arena Battle'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, title, message, notification_type, amount)
  VALUES (
    p_user_id,
    '🏆 Arena Victory!',
    'You won the battle "' || p_battle_title || '". ' || p_amount::TEXT || ' ARX-P has been credited to your balance!',
    'arena_win',
    p_amount
  );
END;
$$;

-- Function: notify a user of an arena loss
CREATE OR REPLACE FUNCTION notify_arena_loss(
  p_user_id UUID,
  p_amount NUMERIC,
  p_battle_title TEXT DEFAULT 'Arena Battle'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, title, message, notification_type, amount)
  VALUES (
    p_user_id,
    '💧 Arena Battle Result',
    'Your team lost the battle "' || p_battle_title || '". ' || ABS(p_amount)::TEXT || ' ARX-P has been deducted from your balance.',
    'arena_loss',
    -p_amount
  );
END;
$$;

-- Function: broadcast a new battle notification to all users
CREATE OR REPLACE FUNCTION notify_new_arena_battle(
  p_battle_title TEXT,
  p_description TEXT DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, title, message, notification_type)
  SELECT 
    id,
    '⚔️ New Arena Battle!',
    'A new battle has been added: "' || p_battle_title || '". ' || COALESCE(p_description, '') || ' Stake your ARX-P now!',
    'arena_new_battle'
  FROM auth.users;
END;
$$;

-- Function: broadcast an announcement to all users
CREATE OR REPLACE FUNCTION broadcast_announcement(
  p_title TEXT,
  p_message TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_notifications (user_id, title, message, notification_type)
  SELECT id, p_title, p_message, 'announcement'
  FROM auth.users;
END;
$$;

-- Enable realtime on user_notifications so push hook picks up inserts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Done!
-- Usage examples:
--   SELECT notify_arena_win('user-uuid', 5000, 'BTC vs ETH');
--   SELECT notify_arena_loss('user-uuid', 1000, 'BTC vs ETH');
--   SELECT notify_new_arena_battle('DOGE vs PEPE', 'Which meme coin wins?');
--   SELECT broadcast_announcement('📢 Mainnet Update', 'Arxon mainnet launches Q3 2026!');
