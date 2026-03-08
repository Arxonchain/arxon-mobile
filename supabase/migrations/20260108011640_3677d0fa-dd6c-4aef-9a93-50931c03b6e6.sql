-- Add requires_screenshot flag to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS requires_screenshot boolean NOT NULL DEFAULT false;

-- Update the 3 specific tasks to require screenshot verification
UPDATE public.tasks 
SET requires_screenshot = true 
WHERE id IN (
  'a4d8be54-fa42-452c-b973-d931a89daa6d',  -- Follow & Turn Notis On
  '53303ed7-5121-4b64-a2bd-84e06ca1a48b',  -- Join Discord & Turn Notis On
  '2b0ccfc6-ecfb-448e-8992-be597bf5bb1b'   -- Complete Profile
);

-- Ensure user_tasks has proper proof storage
ALTER TABLE public.user_tasks 
ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Create storage bucket for task screenshots if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-screenshots', 'task-screenshots', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to task-screenshots bucket
CREATE POLICY "Users can upload task screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to task screenshots
CREATE POLICY "Task screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-screenshots');

-- Prevent users from claiming same task twice - add unique constraint
ALTER TABLE public.user_tasks 
DROP CONSTRAINT IF EXISTS user_tasks_user_task_unique;

ALTER TABLE public.user_tasks
ADD CONSTRAINT user_tasks_user_task_unique UNIQUE (user_id, task_id);

-- Enable real-time for profiles table if not already enabled
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable real-time for mining_sessions if not already 
ALTER TABLE public.mining_sessions REPLICA IDENTITY FULL;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mining_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mining_sessions;
  END IF;
END $$;