-- ════════════════════════════════════════════════════════════════════════
--  ARXON CHAT — Run this SQL in your Supabase SQL Editor
--  Dashboard → SQL Editor → New query → paste → Run
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.chat_messages (
  id          uuid          default gen_random_uuid() primary key,
  channel     text          not null check (channel in ('general','alpha','omega','nexus_exchange')),
  user_id     uuid          not null references auth.users(id) on delete cascade,
  username    text,
  avatar_url  text,
  message     text          not null check (char_length(message) <= 500),
  created_at  timestamptz   default now()
);

-- Index for fast channel queries
create index if not exists chat_messages_channel_idx on public.chat_messages(channel, created_at desc);

-- Row-Level Security
alter table public.chat_messages enable row level security;

-- Read policy: all authenticated users can read general & nexus_exchange;
--              alpha/omega channels restricted to team members
create policy "chat_read" on public.chat_messages for select using (
  auth.uid() is not null and (
    channel in ('general', 'nexus_exchange')
    or (channel = 'alpha' and exists (
      select 1 from public.arena_members where user_id = auth.uid() and club = 'alpha'
    ))
    or (channel = 'omega' and exists (
      select 1 from public.arena_members where user_id = auth.uid() and club = 'omega'
    ))
  )
);

-- Write policy: authenticated users can insert their own messages
create policy "chat_insert" on public.chat_messages for insert with check (
  auth.uid() = user_id
  and (
    channel in ('general', 'nexus_exchange')
    or (channel = 'alpha' and exists (
      select 1 from public.arena_members where user_id = auth.uid() and club = 'alpha'
    ))
    or (channel = 'omega' and exists (
      select 1 from public.arena_members where user_id = auth.uid() and club = 'omega'
    ))
  )
);

-- Enable realtime for live updates
alter publication supabase_realtime add table public.chat_messages;

-- Done! The chat page will work once this is applied.
