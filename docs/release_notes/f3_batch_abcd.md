# F3 — Batch A–D: Data Sources View & Navigation

**Date:** 2026-03-17
**Branch:** `feature/f3/data_sources`

## What was created

### `app/src/data/platforms.ts` (new)
- Predefined platform registry: 11 platforms across exchanges (Binance, Coinbase, Crypto.com, Kraken, Bybit, KuCoin), banks (Lloyds, Monzo, Revolut), and wallets (MetaMask, Ledger)
- `PlatformDef` interface with `id`, `name`, `category`
- `getPlatformById()` lookup helper

### `app/src/store/dataSourcesSlice.ts` (new)
- Redux slice with `DataSource` and `ApiCredentials` types
- Actions: `addSource` (with auto-generated UUID + timestamp via prepare callback), `updateSource`, `removeSource`, `setCredentials`
- Selectors: `selectAllSources`, `selectSourceById`, `selectSourceCount`
- In-memory only (F3 scope) — data is lost on page refresh

### `app/src/components/BottomNav.tsx` (new)
- Fixed bottom navigation bar with Dashboard and Data Sources tabs
- Uses `NavLink` from React Router for active-tab highlighting
- Emoji icons as placeholders (🏠, 🔗)

### `app/src/components/DataSourceModal.tsx` (new)
- Native `<dialog>` element — no library dependency
- Add mode: platform dropdown (predefined + Custom), display name, optional API credentials
- Edit mode: pre-populated form, masked credential display, update/remove credentials, delete source
- Validation: requires platform selection, custom name if Custom, both key+secret or neither
- Backdrop click and Cancel button to close without changes
- Delete with `window.confirm` prompt

### `app/src/pages/DataSourcesPage.tsx` (new)
- Lists all data sources as cards with platform name, display name, and credential badge
- Empty state: "No data sources yet. Add one to get started."
- "+ Add Data Source" button opens modal in create mode
- Clicking a card opens modal in edit mode

### `features/f3_data_sources.md` (new)
- Full design document following F1/F2 conventions: introduction, requirements, 4 design option tables, logical flow, technical design (8 subsections), testing plan (16 tests), task list

## What was modified

### `app/src/App.tsx`
- Added `/data-sources` route under the `AppLayout` guard
- Imported `DataSourcesPage`

### `app/src/components/AppLayout.tsx`
- Added `<BottomNav />` below `<Outlet />`

### `app/src/store/index.ts`
- Registered `dataSourcesReducer` in the store

### `app/src/styles/App.css`
- Bottom nav styles (fixed positioning, tab layout, active colour)
- Main content bottom padding for nav clearance
- Data source cards, credential badges, empty state
- Modal styles (dialog, form, inputs, action buttons, credential display)
- Responsive breakpoints for mobile

### `app/src/styles/index.css`
- Changed `body` from `place-items: center` to `align-items: start` so the app fills the viewport instead of centering vertically

### `docs/roadmap.md`
- Updated F3 description to note frontend-only scope
- Added F3.5 for backend persistence (DynamoDB, API Gateway, Lambda, KMS)

## Manual steps during implementation

- **AWS CLI installed** on the Mac (`AWSCLIV2.pkg` from Amazon) — was not previously installed
- **AWS credentials configured** via `aws configure` (IAM user for account `533267126035`, region `eu-west-2`)
- **`app/.env` created** with Cognito values from AuthStack CloudFormation outputs (User Pool ID, Client ID, domain, localhost redirect URLs). This file is gitignored.
- **`npm install`** run in `app/` — `node_modules` was missing locally

## Issues encountered

- `npm run typecheck` / `npm run build` initially failed with `command not found` because `node_modules` didn't exist — resolved by running `npm install`
- Dev server started on port 5174 because old 5173 server was still running — resolved by killing old processes and restarting

## Verification

- `npm run typecheck` — zero errors
- `npm run build` — clean build (337KB JS bundle)
- All 16 manual test cases from the F3 testing plan passed locally
