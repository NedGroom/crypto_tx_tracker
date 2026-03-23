# F4a: Data Input (CSV) in Data Sources View

## 1. Introduction

F4a adds CSV import capability to each data source from the existing Data Sources page.

Each data source row will become expandable. The expanded panel shows a list of prior raw import chunks for that data source, plus two actions:
- Import with API (visible but deferred to F4b)
- Import CSV (implemented in F4a)

For each raw export chunk in that list, the UI will include:
- View details (metadata-only view, excluding full payload)
- View data (navigates to a dedicated table grid page)

When Import CSV is selected, the user can:
- Upload a CSV file
- Enter a description
- Choose an import type from a dropdown (including Other)

This feature introduces a new persistence model for raw source data using a `raw_exports` table. The table stores import metadata and the full export payload JSON to support later mapping/review features (F5+).

### Key question: should CSV content be stored as JSON in the table?

Decision for F4a: yes, we will store the full parsed CSV JSON directly in a relational JSON field.

For this stage we optimize for simpler implementation and easier querying during early mapping work. We still keep guardrails:
- Default upload size guidance remains conservative (for example, 500KB to 1MB per file)
- We monitor payload growth and can move to object storage later if imports become consistently large
- We keep explicit metadata columns (`row_count`, `column_list`, `import_type`) for efficient filtering without scanning payload JSON

## 2. Requirements

### 2.1 First Stage (F4a Scope)

1. Add expandable sections per data source in the Data Sources list.
2. Show a list of prior raw import chunks for the selected data source.
3. Add two buttons in expanded section:
   - `Import with API` (disabled with "Coming in F4b")
   - `Import CSV` (active)
4. CSV import form fields:
   - File input (`.csv`)
   - Description (text, optional)
   - Import type dropdown including `Other`
   - Export start datetime (optional, native `datetime-local` picker)
   - Export end datetime (optional, native `datetime-local` picker)
5. Persist CSV import metadata and full export JSON in backend (`raw_exports`).
6. Keep current edit behavior but move edit action to an explicit `Edit` button on each row.
7. Do not implement API import execution in F4a.
8. Keep auth/user isolation via existing Cognito + Supabase JWT + RLS model.
9. For each chunk row, include a `View details` action that shows all chunk fields except `payload_jsonb`.
10. For each chunk row, include a `View data` action that opens a new page showing full table-grid representation of `payload_jsonb` with headers from `column_list`.
11. Add a Back button on the data-grid page that returns to Data Sources.

### 2.2 Next Steps (Deferred to F4b+)

1. API import execution flow, credential-based requests, and scheduling.
2. Automated extraction profiles per platform/import type.
3. Full data normalization into typed staging tables.
4. Chunk-level retry and background job orchestration.
5. Advanced CSV validation and schema inference UX.

## 3. Design Options

### 3.1 Raw Payload Storage Strategy

| Row | Option A: Store full parsed JSON in `raw_exports.payload_jsonb` | Option B: Store raw file in Supabase Storage + metadata in `raw_exports` | Option C: Store both full JSON and original file |
|---|---|---|---|
| Method | Parse CSV client-side and save all rows as JSONB in one DB row | Upload original CSV to Storage; save object path, column list, counts, and preview JSON in DB | Upload file and also save full parsed JSON in DB |
| Pros | Simple reads; one table only; no storage bucket coordination | Scales better for large files; smaller DB rows; cheaper long-term query/storage profile | Maximum flexibility for future processing without re-reading file |
| Cons | Large row size for big files; slower writes; expensive vacuum/updates; potential row-size pain | Requires storage bucket + signed URL flow; two persistence surfaces | Highest storage duplication and cost; extra write complexity |
| Decision Criteria | Good if files are always small and low volume | Best if file size can vary and may include hundreds/thousands of rows | Useful only if immediate heavy JSON querying is required |
| Chosen | Yes |  |  |

Rationale:
- Current expected import sizes are manageable for JSONB payload storage.
- Keeping full payload in Postgres simplifies F4a and upcoming F5 mapping/review queries.
- Avoiding dual-surface persistence (DB + storage bucket) reduces implementation and support complexity for now.

### 3.2 `raw_exports` Schema Shape

| Row | Option A: Minimal metadata only | Option B: Metadata + full payload + inferred columns | Option C: Fully normalized child rows now |
|---|---|---|---|
| Method | Keep only IDs, timestamps, import type, description | Add row count, columns JSON, full payload JSON, status fields | Immediately split each imported CSV row into separate relational table rows |
| Pros | Fast to ship | Supports current UI and near-term review features | Strong queryability from day one |
| Cons | Too little data for useful preview UI | Slightly larger row and parsing logic | High complexity for F4a; overbuild before mapping design |
| Decision Criteria | Works only if UI remains very thin | Best tradeoff for F4a and F5 entry point | Better suited after F5 mapping model is finalized |
| Chosen |  | Yes |  |

Rationale:
- F4a requires visible chunk history and useful context in the expandable section.
- Metadata + full payload keeps implementation bounded while still supporting next milestone flows.

### 3.3 UI Interaction Pattern on Data Sources Page

| Row | Option A: Keep row click to edit and add expand icon | Option B: Replace row-click edit with explicit buttons and row expansion | Option C: Separate imports page entirely |
|---|---|---|---|
| Method | Existing click-to-edit remains; also add expandable imports area | Row contains explicit actions (`Edit`, `Expand`), avoiding click-mode conflicts | Move import actions out of Data Sources page |
| Pros | Minimal UI change | Clear intent and fewer accidental edits; aligns with user request | Cleaner separation for future large workflows |
| Cons | Ambiguous click behavior (edit vs expand) | Slightly more UI controls on row | Bigger navigation change and scope creep |
| Decision Criteria | Works only if click conflicts are solved elegantly | Best usability for current page and requested behavior | Better for later if imports grow complex |
| Chosen |  | Yes |  |

Rationale:
- Explicit buttons reduce ambiguity and support both edit and expand actions reliably.

## 4. Logical Flow

### 4.1 View Data Source Imports

1. User opens Data Sources page.
2. App fetches `data_sources` and displays rows.
3. User clicks `Expand` on a data source.
4. App fetches `raw_exports` filtered by `data_source_id`, ordered by `created_at desc`.
5. Expanded section shows recent import chunks with type, description, rows, columns, status, timestamp.

### 4.2 CSV Import Creation

1. User expands a data source and clicks `Import CSV`.
2. Form opens in the expanded panel.
3. User selects file, enters description, chooses import type (or Other).
4. Frontend validates file extension/size and required fields.
5. Frontend parses CSV client-side (headers + rows).
6. Frontend inserts `raw_exports` row with metadata, column list, full payload JSON, and status `uploaded`.
7. UI refreshes import chunk list and shows new row.

### 4.3 Edit Data Source

1. User clicks explicit `Edit` button on row.
2. Existing edit modal opens.
3. User updates details/API keys.
4. App persists via existing thunk/service path.

### 4.4 View Chunk Details

1. User clicks `View details` on a raw export chunk.
2. App opens a details panel/modal in context.
3. UI displays metadata fields (id, ingest method, import type, description, row count, columns, status, source file name, created timestamp), excluding full payload data.
4. User closes details and returns to chunk list.

### 4.5 View Chunk Data Grid

1. User clicks `View data` on a raw export chunk.
2. App navigates to a dedicated route, e.g. `/data-sources/raw-exports/:id`.
3. Page loads the chunk and renders a full table grid:
   - header row from `column_list`
   - body rows from `payload_jsonb`
4. User clicks Back button.
5. App navigates back to Data Sources (restoring prior context where practical).

## 5. Technical Design

### 5.1 Database: `raw_exports` Table

Create a new migration adding `public.raw_exports` with:
- `id uuid primary key default gen_random_uuid()`
- `user_id text not null`
- `data_source_id uuid not null references public.data_sources(id) on delete cascade`
- `ingest_method text not null check (ingest_method in ('csv','api'))`
- `import_type text not null`
- `description text`
- `source_file_name text`
- `export_start_date timestamptz`
- `export_end_date timestamptz`
- `row_count integer`
- `column_list jsonb not null default '[]'::jsonb`
- `payload_jsonb jsonb not null`
- `status text not null default 'uploaded'`
- `created_at timestamptz not null default now()`

Indexes:
- `(user_id, data_source_id, created_at desc)`

RLS policies mirror current pattern:
- Select/Insert/Update/Delete allowed only when `user_id = jwt sub`

### 5.2 Payload Guardrails

Even with full payload-in-DB selected, F4a should include practical limits:
- Soft guidance target: ~500KB CSV files
- Hard rejection threshold: configurable (for example, 1MB in F4a)
- Keep a clear error message instructing the user to split larger exports

These guardrails keep DB row sizes reasonable while we validate real usage patterns.

### 5.3 Frontend Types and Service Layer

Add `RawExportChunk` type and service module, e.g. `app/src/services/rawExportsService.ts`.

Service responsibilities:
- `listByDataSource(dataSourceId)`
- `createCsvImport({...})`
- `getById(rawExportId)`
- parse CSV (headers + rows)
- infer columns + row count
- insert `raw_exports` row with full payload JSON

### 5.4 Redux Slice Additions

Add a new slice for raw exports or extend existing structure (preferred: dedicated `rawExportsSlice`).

State:
- by data source list
- loading/error per data source expansion
- upload in-progress flag

Thunks:
- `fetchRawExportsByDataSource`
- `createCsvRawExport`
- `fetchRawExportById`

### 5.5 Data Sources UI Refactor

In Data Sources list row:
- Replace row-click edit behavior with explicit `Edit` button.
- Add `Expand/Collapse` toggle button.
- Keep API key badge and current summary info.

Expanded panel contents:
- buttons: `Import with API` (disabled), `Import CSV`
- inline/slide-down CSV form
- table/list of import chunks
- per-chunk actions: `View details`, `View data`

### 5.6 Raw Export Data Grid Page

Add a dedicated page component, e.g. `app/src/pages/RawExportDataPage.tsx`:
- route parameter: raw export id
- fetch chunk by id
- render full table grid with sticky header row where practical
- show empty-cell placeholder for missing values
- include Back button to return to Data Sources

Routing updates:
- add route under authenticated layout for raw export data page
- keep Data Sources route as main entry

### 5.7 CSV Import Form UX

Fields:
- `File` input (accept `.csv`)
- `Description` text input
- `Import Type` dropdown with values:
  - Trades
  - Deposits
  - Withdrawals
  - Transfers
  - Rewards
  - Other
- `Export start datetime` input (optional, native `datetime-local`)
- `Export end datetime` input (optional, native `datetime-local`)

Validation:
- file required
- import type required
- start date must be <= end date when both are present
- max file size threshold (configurable, e.g. 1MB for F4a)
- show parse/upload errors inline

### 5.8 Error Handling and Observability

Capture and show errors for:
- parsing failure
- metadata insert failure
- list fetch failure

Add concise status labels in chunk list:
- `uploaded`
- `failed`

For details/data views:
- handle missing/deleted chunk id with clear not-found state
- prevent cross-user chunk access via RLS and show access-denied-safe message

### 5.9 Deferred API Import Placeholder

`Import with API` button exists for discoverability but disabled in F4a.
Tooltip/text: `Coming in F4b`.

This keeps UI continuity while deferring implementation risk.

## 6. Testing Plan

| Test | Method | Pass Criteria |
|---|---|---|
| Expand data source row | Manual UI | Expand/collapse works without triggering edit modal |
| Edit button behavior | Manual UI | Edit opens modal only when Edit clicked |
| Raw export list fetch | Manual + network inspect | Only chunks for selected data source are shown |
| CSV form required fields | Manual UI | Missing file/type blocks submit with clear message |
| CSV import success | Manual end-to-end | Row created, list refreshes with new chunk |
| Column inference | Manual with sample CSV | `column_list` reflects CSV headers accurately |
| Full payload persistence | Manual + DB check | `payload_jsonb` stores all parsed CSV rows |
| View details action | Manual UI | Metadata view opens and excludes payload grid data |
| View data action | Manual UI | Navigates to data-grid page and renders rows/columns correctly |
| Back navigation from data page | Manual UI | Back returns to Data Sources |
| RLS isolation list | Multi-user manual | User A cannot view User B chunks |
| RLS isolation write | Multi-user manual | User A cannot insert chunk for User B |
| RLS isolation read-by-id | Multi-user manual | User A cannot open User B chunk data page |
| Disabled API import button | Manual UI | Button visible but disabled with F4b message |
| Large CSV guard | Manual UI | Over-threshold file rejected with clear guidance |
| Error path handling | Manual (force failures) | User sees non-crashing inline error and can retry |

## 7. Task List

1. Create migration for `raw_exports` table, index, and RLS policies.
2. Add raw exports types and service module for list/parse/create flows.
3. Add Redux raw exports slice with async thunks and selectors.
4. Refactor Data Sources row actions: explicit `Edit` and `Expand` buttons.
5. Build expandable panel layout with chunk list and action buttons.
6. Implement CSV import form (file, description, import type).
7. Wire CSV submit flow: validate -> parse -> infer columns/row count -> insert full payload row.
8. Add per-chunk actions for `View details` and `View data`.
9. Build raw export data-grid page with Back button and route wiring.
10. Add disabled API import placeholder button with `Coming in F4b` messaging.
11. Add loading/error states for chunk list, details, data page, and CSV import.
12. Perform manual verification using the testing plan.
13. Update release notes for F4a implementation batch when coding is complete.
