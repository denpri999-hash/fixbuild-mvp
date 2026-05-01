-- FixBuild — Tenant isolation (company_id + RLS)
-- Run manually in Supabase SQL editor.
--
-- IMPORTANT:
-- - Take a Supabase snapshot/backup before running.
-- - Run in a transaction if your setup permits it.
-- - Review RLS policies carefully for your auth model.

-- 2.1 companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp default now()
);

insert into public.companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Company')
on conflict (id) do nothing;

-- 2.2 company_users
create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_id uuid references public.companies(id),
  role text default 'admin',
  created_at timestamp default now()
);

create index if not exists idx_company_users_user_id on public.company_users(user_id);
create index if not exists idx_company_users_company_id on public.company_users(company_id);

-- 2.3 add company_id to tables (safe)
alter table if exists public.tasks add column if not exists company_id uuid references public.companies(id);
alter table if exists public.problems add column if not exists company_id uuid references public.companies(id);
alter table if exists public.problem_history add column if not exists company_id uuid references public.companies(id);
alter table if exists public.problem_media add column if not exists company_id uuid references public.companies(id);
alter table if exists public.projects add column if not exists company_id uuid references public.companies(id);
alter table if exists public.employees add column if not exists company_id uuid references public.companies(id);
alter table if exists public.whatsapp_instances add column if not exists company_id uuid references public.companies(id);

-- 2.4 backfill demo data
update public.tasks set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.problems set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.problem_history set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.problem_media set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.projects set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.employees set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.whatsapp_instances set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;

-- 2.5 set NOT NULL (after verification)
alter table public.tasks alter column company_id set not null;
alter table public.problems alter column company_id set not null;
alter table public.problem_history alter column company_id set not null;
alter table public.problem_media alter column company_id set not null;
alter table public.projects alter column company_id set not null;
alter table public.employees alter column company_id set not null;
alter table public.whatsapp_instances alter column company_id set not null;

-- helper to read current tenant
create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id
  from public.company_users
  where user_id = auth.uid()
  limit 1
$$;

-- 3. RLS (repeatable)
-- NOTE: This assumes client access is via auth.uid().

-- tasks
alter table public.tasks enable row level security;
drop policy if exists company_isolation_select on public.tasks;
drop policy if exists company_isolation_insert on public.tasks;
drop policy if exists company_isolation_update on public.tasks;
create policy company_isolation_select on public.tasks for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.tasks for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.tasks for update using (company_id = public.current_company_id());

-- problems
alter table public.problems enable row level security;
drop policy if exists company_isolation_select on public.problems;
drop policy if exists company_isolation_insert on public.problems;
drop policy if exists company_isolation_update on public.problems;
create policy company_isolation_select on public.problems for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.problems for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.problems for update using (company_id = public.current_company_id());

-- problem_history
alter table public.problem_history enable row level security;
drop policy if exists company_isolation_select on public.problem_history;
drop policy if exists company_isolation_insert on public.problem_history;
drop policy if exists company_isolation_update on public.problem_history;
create policy company_isolation_select on public.problem_history for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.problem_history for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.problem_history for update using (company_id = public.current_company_id());

-- problem_media
alter table public.problem_media enable row level security;
drop policy if exists company_isolation_select on public.problem_media;
drop policy if exists company_isolation_insert on public.problem_media;
drop policy if exists company_isolation_update on public.problem_media;
create policy company_isolation_select on public.problem_media for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.problem_media for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.problem_media for update using (company_id = public.current_company_id());

-- projects
alter table public.projects enable row level security;
drop policy if exists company_isolation_select on public.projects;
drop policy if exists company_isolation_insert on public.projects;
drop policy if exists company_isolation_update on public.projects;
create policy company_isolation_select on public.projects for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.projects for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.projects for update using (company_id = public.current_company_id());

-- employees
alter table public.employees enable row level security;
drop policy if exists company_isolation_select on public.employees;
drop policy if exists company_isolation_insert on public.employees;
drop policy if exists company_isolation_update on public.employees;
create policy company_isolation_select on public.employees for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.employees for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.employees for update using (company_id = public.current_company_id());

-- whatsapp_instances
alter table public.whatsapp_instances enable row level security;
drop policy if exists company_isolation_select on public.whatsapp_instances;
drop policy if exists company_isolation_insert on public.whatsapp_instances;
drop policy if exists company_isolation_update on public.whatsapp_instances;
create policy company_isolation_select on public.whatsapp_instances for select using (company_id = public.current_company_id());
create policy company_isolation_insert on public.whatsapp_instances for insert with check (company_id = public.current_company_id());
create policy company_isolation_update on public.whatsapp_instances for update using (company_id = public.current_company_id());

