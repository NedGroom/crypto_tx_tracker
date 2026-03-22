-- Migration: Create data_sources table with Row-Level Security
-- Feature: F3.5 Backend Persistence

create table public.data_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  platform_id text not null,
  custom_platform_name text,
  display_name text not null,
  credentials_encrypted text,  -- encrypted JSON string, or null
  created_at  timestamptz not null default now()
);

-- Index for fast per-user lookups
create index idx_data_sources_user_id on public.data_sources (user_id);

-- Row-Level Security: each user can only see/modify their own rows
alter table public.data_sources enable row level security;

create policy "Users can view own data sources"
  on public.data_sources for select
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can insert own data sources"
  on public.data_sources for insert
  with check (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can update own data sources"
  on public.data_sources for update
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can delete own data sources"
  on public.data_sources for delete
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
