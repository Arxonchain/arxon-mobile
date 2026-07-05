-- TASKS_CONTENT_FIX.sql
-- Run in Supabase SQL Editor to update seeded task copy and URLs.
-- Safe to re-run (idempotent).

UPDATE public.tasks
SET
  title = 'Follow Arxon on X',
  description = 'Follow our official X account @arxoninfra',
  external_url = 'https://x.com/arxoninfra'
WHERE external_url ILIKE '%Arxonarx%'
   OR external_url ILIKE '%twitter.com/Arxonarx%'
   OR description ILIKE '%@Arxonarx%';

UPDATE public.tasks
SET external_url = 'https://discord.gg/7FXxFDTqwj'
WHERE title ILIKE '%Discord%'
  AND external_url IS NOT NULL
  AND external_url NOT ILIKE '%7FXxFDTqwj%';
