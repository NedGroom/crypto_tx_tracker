-- Migration: Create raw_exports table for CSV/API raw data chunks
-- Feature: F4a Data Input (CSV)

create table public.raw_exports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  ingest_method text not null check (ingest_method in ('csv', 'api')),
  import_type text not null,
  description text,
  source_file_name text,
  export_start_date date,
  export_end_date date,
  row_count integer,
  column_list jsonb not null default '[]'::jsonb,
  payload_jsonb jsonb not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

-- Fast per-source listing for the current user
create index idx_raw_exports_user_source_created
  on public.raw_exports (user_id, data_source_id, created_at desc);

alter table public.raw_exports enable row level security;

create policy "Users can view own raw exports"
  on public.raw_exports for select
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can insert own raw exports"
  on public.raw_exports for insert
  with check (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can update own raw exports"
  on public.raw_exports for update
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can delete own raw exports"
  on public.raw_exports for delete
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
