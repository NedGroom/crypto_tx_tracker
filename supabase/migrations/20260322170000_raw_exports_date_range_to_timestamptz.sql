-- Migration: Change raw_exports export date range from date to timestamptz
-- Feature: F4a datetime picker support

alter table public.raw_exports
  alter column export_start_date type timestamptz
  using (case when export_start_date is null then null else export_start_date::timestamptz end);

alter table public.raw_exports
  alter column export_end_date type timestamptz
  using (case when export_end_date is null then null else export_end_date::timestamptz end);
