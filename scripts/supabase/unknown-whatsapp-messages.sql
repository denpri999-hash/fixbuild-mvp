-- FixBuild — unknown_whatsapp_messages (unrouted webhook payloads)
-- Run manually in Supabase SQL Editor if table doesn't exist.

create table if not exists public.unknown_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  id_instance text,
  raw_body text,
  sender_phone text,
  message_text text,
  created_at timestamp default now()
);

