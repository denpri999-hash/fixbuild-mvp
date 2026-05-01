-- FixBuild — company_settings (Telegram notifications)
-- Run manually in Supabase SQL Editor.

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) unique,
  telegram_enabled boolean default false,
  telegram_chat_id text default '',
  telegram_bot_token text default '',
  updated_at timestamp default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select on public.company_settings;
drop policy if exists company_settings_update on public.company_settings;

create policy company_settings_select
on public.company_settings for select
using (
  company_id = (
    select company_id from public.company_users
    where user_id = auth.uid() limit 1
  )
);

create policy company_settings_update
on public.company_settings for update
using (
  company_id = (
    select company_id from public.company_users
    where user_id = auth.uid() limit 1
  )
);

drop policy if exists settings_insert_own on public.company_settings;
create policy settings_insert_own
on public.company_settings for insert
with check (
  company_id = (
    select company_id from public.company_users
    where user_id = auth.uid()
    limit 1
  )
);

