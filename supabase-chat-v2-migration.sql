-- ════════════════════════════════════════════════════════════════════════════
-- ARXON CHAT v2 — Run in Supabase Dashboard > SQL Editor
-- Adds: reply_to, image uploads, read receipts
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add columns (safe - uses IF NOT EXISTS)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url   TEXT,
  ADD COLUMN IF NOT EXISTS read_by     UUID[] DEFAULT '{}';

-- 2. Increase message length limit from 500 to 2000
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_check CHECK (char_length(message) <= 2000);

-- 3. Function to mark a message as read
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id UUID, p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.chat_messages
  SET read_by = array_append(read_by, p_user_id)
  WHERE id = p_message_id
    AND NOT (p_user_id = ANY(COALESCE(read_by, '{}')));
END;
$$;

-- 4. Chat images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images', 'chat-images', true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for chat images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='chat_images_insert'
  ) THEN
    CREATE POLICY "chat_images_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='chat_images_select'
  ) THEN
    CREATE POLICY "chat_images_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'chat-images');
  END IF;
END $$;

-- 6. Make sure realtime is enabled on chat_messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Done! ✅
