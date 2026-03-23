use native HTML input type="datetime-local# F4a — Batch A: CSV Raw Export Ingestion and Data Grid View

**Date:** 2026-03-22
**Branch:** `feature/f4a/data_input_csv`

## What was created

### `supabase/migrations/20260322123000_create_raw_exports.sql` (new)
- Added `raw_exports` table for raw CSV/API export chunks
- Includes metadata fields:
  - `import_type`, `description`, `source_file_name`
  - `export_start_date`, `export_end_date`
  - `row_count`, `column_list`, `status`, `created_at`
- Stores full parsed export data in `payload_jsonb`
- Added index for per-user/per-source listing
- Added RLS policies for select/insert/update/delete ownership checks

### `app/src/store/rawExportsSlice.ts` (new)
- New Redux slice for raw exports
- Added thunks:
  - `fetchRawExportsByDataSource`
  - `createCsvRawExport`
  - `fetchRawExportById`
- Added per-source loading/error/creating state and selected chunk state
- Added type model including export date range fields

### `app/src/services/rawExportsService.ts` (new)
- Added CSV parse and persistence service using `papaparse`
- Added list/get/create methods for `raw_exports`
- Enforces CSV extension and 1MB size limit for F4a
- Persists inferred columns, row count, full payload JSON, and export date range

### `app/src/pages/RawExportDataPage.tsx` (new)
- New route page to display one raw export as a full table grid
- Reads headers from `column_list` and rows from `payload_jsonb`
- Includes back button to return to Data Sources

## What was modified

### `app/src/pages/DataSourcesPage.tsx`
- Refactored source row interactions:
  - explicit `Edit` button
  - explicit `Expand/Collapse` button
- Added expandable raw export panel per data source
- Added disabled `Import with API (Coming in F4b)` button
- Implemented `Import CSV` form with:
  - file input
  - description
  - import type dropdown
  - export start date
  - export end date
- Added date-range validation (`start <= end`)
- Added raw export chunk list and per-chunk actions:
  - `View details`
  - `View data`
- Updated details modal to show export date range

### `app/src/App.tsx`
- Added route for raw export data page:
  - `/data-sources/raw-exports/:rawExportId`

### `app/src/store/index.ts`
- Registered `rawExports` reducer in Redux store

### `app/src/styles/App.css`
- Added styles for:
  - source row action layout
  - expandable chunk panel
  - CSV import form
  - raw export list table
  - raw export data grid page
- Added readability polish:
  - sticky table headers
  - subtle zebra striping on table rows

### `app/package.json` and `app/package-lock.json`
- Added dependencies:
  - `papaparse`
  - `@types/papaparse`

### `features/f4a_data_input_csv.md`
- Updated design decisions and implementation details to match delivered behavior
- Added explicit `View details` / `View data` flows and data-grid route
- Added export date range requirement and schema/form notes

## Manual steps performed during implementation

- Attempted `npx supabase db push` initially failed due migration history mismatch (`data_sources` already existed)
- Repaired remote migration history with:
  - `npx supabase migration repair --status applied 20250101000000`
- Re-ran `npx supabase db push` successfully

## Issues encountered

- Initial migration push failed because early SQL had been applied manually outside migration history
- Resolved by marking the historical migration as applied, then applying pending migration normally

## Verification

- `npm run typecheck` in `app/` passed
- `npm run build` in `app/` passed
- `npx supabase db push` succeeded after migration repair
