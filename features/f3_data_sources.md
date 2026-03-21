# F3: Data Sources View & Navigation

## 1. Introduction

This feature introduces two foundational pieces to the app:

1. **A bottom navigation bar** — the persistent menu that lets users switch between views (Dashboard, Data Sources, and future views from F4+).
2. **A Data Sources view** — where users can see their configured data sources (crypto exchanges, banks, etc.), add new ones, and manage API credentials for each.

### Why is this needed?

Before the app can ingest transaction data (F4), it needs to know *where* the data comes from. A "data source" represents a financial platform — e.g. Binance, Coinbase, Crypto.com, Lloyds — that holds the user's assets or transaction history. Some data sources offer APIs for programmatic data retrieval (F4b); others only support file-based import (F4a). F3 lays the groundwork by letting the user declare which platforms they use, and optionally provide API credentials for later use.

### Key Concepts

**Data source** — A record representing a financial platform the user interacts with. It has a platform type (e.g. "Binance"), an optional display name, and optional API credentials. A data source does not contain transaction data itself — it is the *origin* that transaction data is associated with.

**API credentials** — A key/secret pair (sometimes with additional fields like a passphrase) that authorises programmatic access to a platform's API. Not all data sources require API credentials — some may only be used for manual file imports. Credentials are sensitive; their storage model matters and is discussed in Design Options below.

**Bottom navigation bar** — A fixed bar at the bottom of the viewport with tab-style buttons for switching between top-level views. This is the standard mobile navigation pattern (iOS tab bar, Android bottom nav), and works well on desktop too. The roadmap specifies "menu bar at bottom of page".

---

## 2. Requirements

### 2.1 First Stage (F3 Scope)

1. **Bottom navigation bar** — persistent across all authenticated views. Shows tabs for: Dashboard (home), Data Sources. Future features add more tabs here.
2. **Data Sources list view** — displays all configured data sources as a list/card layout. Each entry shows the platform name, display name, and whether API credentials are configured.
3. **Add a data source** — user can add a new data source by selecting a platform from a predefined list and optionally providing a display name. At the point of creation, the user can optionally add API credentials immediately.
4. **Edit a data source** — user can open an existing data source to edit its display name or manage its API credentials (add, update, or remove).
5. **Delete a data source** — user can remove a data source they no longer need.
6. **API key management** — for any data source (new or existing), the user can add, view (masked), update, or clear API credentials. Credentials consist of at minimum an API key and API secret.
7. **State management** — data sources are stored in a Redux slice. State persists across page navigation within a session but is **not** persisted to a backend or localStorage in F3 (deferred).
8. **Responsive layout** — the navigation bar and data sources view must work on both desktop and mobile viewports.

### 2.2 Next Steps (Deferred — Not F3)

- **Backend persistence (F3.5)** — saving data sources and credentials to a database via an API. F3 is frontend-only; data lives in Redux and is lost on page refresh. F3.5 will add DynamoDB, API Gateway + Lambda CRUD endpoints, Cognito authoriser, and KMS encryption for credentials.
- **Credential encryption (F3.5)** — encrypting API keys at rest with KMS. Part of the F3.5 backend scope.
- **Platform-specific credential fields** — some exchanges need a passphrase (Coinbase Pro) or sub-account ID. F3 uses a generic key/secret model. Platform-specific fields can be added later without changing the overall architecture.
- **API connection testing** — verifying that provided credentials actually work by making a test call to the platform's API.
- **Importing data sources from file** — auto-detecting platforms from uploaded CSVs/XLSX. This belongs to F4.

---

## 3. Design Options

### 3.1 Navigation Pattern

| | **Option A: Bottom Tab Bar** | **Option B: Sidebar Navigation** | **Option C: Top Navbar with Dropdowns** |
|---|---|---|---|
| **Method** | Fixed bar at bottom of viewport with icon+label tabs. Active tab highlighted. Tapping switches the view. | Collapsible sidebar on the left. Hamburger menu toggle on mobile. | Horizontal nav links in the existing top header bar, possibly with dropdowns for grouping. |
| **Pros** | Mobile-native pattern; thumb-friendly; always visible; scales to 4–5 tabs cleanly; explicit in the roadmap requirement. | More room for menu items; can show long labels; familiar on desktop. | No extra UI element — reuses the existing header; clean on desktop. |
| **Cons** | Limited to ~5 tabs before it becomes crowded; takes vertical space on small screens. | Hamburger menu is a discoverability problem on mobile; takes horizontal space on desktop; more complex animation/state. | Awkward on mobile (small tap targets); dropdowns are fiddly on touch; doesn't match the roadmap's "bottom of page" specification. |
| **Decision Criteria** | Best when the app has 3–5 top-level views and needs to work well on mobile. | Best for apps with many navigation items (10+) or heavy desktop focus. | Best for simple desktop apps with few links. |
| **Chosen** | **Yes** | | |

**Rationale:** The roadmap explicitly specifies "menu bar at bottom of page". The app will have 5–6 top-level views (Dashboard, Data Sources, Data Input, Transactions, Buckets, optionally Purchase Review). A bottom tab bar handles this comfortably and is the most natural mobile-first pattern.

### 3.2 Data Source CRUD UI Pattern

| | **Option A: Modal Dialogs** | **Option B: Dedicated Add/Edit Page** | **Option C: Inline Expansion** |
|---|---|---|---|
| **Method** | Clicking "Add" or "Edit" opens a modal overlay with a form. The list remains visible in the background. | Navigation to a separate `/data-sources/new` or `/data-sources/:id/edit` route. | Clicking a data source card expands it inline to reveal editable fields (accordion style). |
| **Pros** | Keeps the user in context (list visible behind the modal); no route change needed; natural for short forms. | Clean URL-driven state; easy to deep-link; separates concerns well. | No overlay or route change; compact; everything is on one screen. |
| **Cons** | Modals can be awkward on small screens if not carefully sized; accessibility requires focus trapping. | Loses the list context; feels heavy for a form with only 3–4 fields; over-engineered for the data volume. | Gets messy if multiple items are expanded; harder to style consistently; editing one item while seeing others can be distracting. |
| **Decision Criteria** | Best for short forms (< 6 fields) where context retention matters. | Best for complex forms with many fields or sub-sections. | Best for very simple toggle/display-only interactions. |
| **Chosen** | **Yes** | | |

**Rationale:** The add/edit form for a data source is small: platform selector, display name, API key, API secret. A modal keeps the user within the data sources list and avoids the overhead of separate routes. We'll ensure the modal is responsive and accessible.

### 3.3 Predefined Platform List vs Free-Text Entry

| | **Option A: Predefined List Only** | **Option B: Free-Text Only** | **Option C: Predefined + Custom** |
|---|---|---|---|
| **Method** | User selects a platform from a hardcoded dropdown (Binance, Coinbase, Crypto.com, etc.). | User types any platform name as free text. | Predefined dropdown with an "Other / Custom" option that reveals a text field. |
| **Pros** | Consistent naming; enables platform-specific logic later (API endpoints, credential shapes); cleaner UI. | Maximum flexibility; no maintenance of a platform list. | Flexibility without sacrificing consistency; users can add niche platforms while common ones are standardised. |
| **Cons** | Can't add a platform we haven't listed; requires maintaining the list. | Typos and inconsistency ("binance" vs "Binance" vs "Binance.com"); harder to attach platform-specific logic later. | Slightly more complex UI; custom entries won't get platform-specific features. |
| **Decision Criteria** | Best when the app needs to attach platform-specific behaviour (API URLs, logos, etc.). | Best for a minimal prototype with no platform-specific logic. | Best when most users pick common platforms but some need niche ones. |
| **Chosen** | | | **Yes** |

**Rationale:** Most users will use well-known exchanges. A predefined list gives us clean data and enables platform-specific features in the future (auto-filling API base URLs in F4b, displaying logos, etc.). But crypto is a long tail — users may have accounts on obscure platforms. The "Custom" escape hatch prevents the app from being limiting.

### 3.4 Credential Storage (F3 Scope)

| | **Option A: Redux Only (In-Memory)** | **Option B: Redux + localStorage** | **Option C: Redux + Backend API** |
|---|---|---|---|
| **Method** | Credentials live in the Redux store. Lost on page refresh. | Credentials persisted to localStorage via `redux-persist` or manual sync. Survives refresh. | Credentials sent to and stored in a backend (DynamoDB + KMS encryption). |
| **Pros** | Simplest; no sensitive data at rest in the browser; easy to implement. | Survives refresh; better UX during development. | Secure at-rest encryption; survives across devices; production-grade. |
| **Cons** | Users must re-enter credentials after every refresh — acceptable during development, not for production. | API keys in localStorage are visible to any JS running on the page (XSS risk); cleartext; not production-safe. | Requires a backend API (Lambda + API Gateway + DynamoDB) that doesn't exist yet; significant scope increase. |
| **Decision Criteria** | Best when no backend exists and data loss on refresh is acceptable. | Best for a better dev experience when backend is not yet built. | Best for production. |
| **Chosen** | **Yes** | | |

**Rationale:** There is no backend yet. Storing credentials in localStorage exposes them to XSS and creates a false sense of persistence — better to keep them in-memory only and make it clear to the user that this is a prototype. When a backend is built (likely F4b or later), credentials will be stored server-side with encryption. Until then, Redux-only is the safest and simplest approach.

---

## 4. Logical Flow

### 4.1 Navigating Between Views

```
1. User is authenticated → AppLayout renders
2. Bottom nav bar is visible at all times, with tabs: Dashboard, Data Sources
3. User taps "Data Sources" tab
4. React Router navigates to /data-sources
5. DataSourcesPage component renders, showing the list of configured data sources
6. User taps "Dashboard" tab → navigates back to /
```

### 4.2 Adding a New Data Source

```
1. User is on the Data Sources view
2. User taps the "Add Data Source" button
3. A modal dialog opens with:
   a. Platform selector dropdown (predefined list + "Custom" option)
   b. Display name text field (optional, defaults to platform name)
   c. "Add API credentials" toggle/section (collapsed by default)
4. If user selects "Custom", a text field appears for the platform name
5. If user expands the API credentials section:
   a. API Key text field
   b. API Secret text field (masked)
6. User fills in the desired fields and clicks "Save"
7. Validation runs:
   - Platform must be selected (or custom name provided)
   - If credentials section is open, both key and secret must be filled (or both empty)
8. On success: modal closes, new data source appears in the list
9. Redux store is updated with the new data source
```

### 4.3 Editing an Existing Data Source

```
1. User taps/clicks on a data source card in the list
2. The same modal opens, pre-populated with existing values
3. API credentials section shows:
   - If credentials exist: masked display with "Update" / "Remove" options
   - If no credentials: empty fields with option to add
4. User makes changes and clicks "Save"
5. Redux store is updated; modal closes; list reflects changes
```

### 4.4 Deleting a Data Source

```
1. User opens the edit modal for a data source
2. User clicks "Delete" button (styled as destructive / red)
3. A confirmation prompt appears: "Delete [platform name]? This cannot be undone."
4. User confirms → data source is removed from Redux store → modal closes
5. List updates to reflect the removal
```

---

## 5. Technical Design

### 5.1 Predefined Platform Registry

Create a platforms registry file that enumerates supported platforms with metadata. This is a static data file, not a component.

**New file: `app/src/data/platforms.ts`**

```typescript
export interface PlatformDef {
  id: string;       // Unique key, e.g. 'binance', 'coinbase', 'lloyds'
  name: string;     // Display name, e.g. 'Binance', 'Coinbase'
  category: 'exchange' | 'bank' | 'wallet' | 'other';
}

// The "custom" platform is not in this list — it's handled separately in the UI.
export const platforms: PlatformDef[] = [
  { id: 'binance',     name: 'Binance',      category: 'exchange' },
  { id: 'coinbase',    name: 'Coinbase',      category: 'exchange' },
  { id: 'crypto_com',  name: 'Crypto.com',    category: 'exchange' },
  { id: 'kraken',      name: 'Kraken',        category: 'exchange' },
  { id: 'bybit',       name: 'Bybit',         category: 'exchange' },
  { id: 'kucoin',      name: 'KuCoin',        category: 'exchange' },
  { id: 'lloyds',      name: 'Lloyds',        category: 'bank' },
  { id: 'monzo',       name: 'Monzo',         category: 'bank' },
  { id: 'revolut',     name: 'Revolut',       category: 'bank' },
  { id: 'metamask',    name: 'MetaMask',      category: 'wallet' },
  { id: 'ledger',      name: 'Ledger',        category: 'wallet' },
];

/** Look up a platform by its ID. Returns undefined for custom platforms. */
export function getPlatformById(id: string): PlatformDef | undefined {
  return platforms.find((p) => p.id === id);
}
```

This file is consumed by the data sources slice (for validation/defaults) and by the modal form (for the dropdown).

### 5.2 Redux Slice — `dataSourcesSlice`

Create a new Redux slice to manage data source state. This follows the same conventions as `authSlice`.

**New file: `app/src/store/dataSourcesSlice.ts`**

**State shape:**

```typescript
export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface DataSource {
  id: string;             // UUID, generated on creation
  platformId: string;     // Matches PlatformDef.id, or 'custom'
  customPlatformName?: string;  // Only set when platformId === 'custom'
  displayName: string;    // User-facing name, defaults to platform name
  credentials: ApiCredentials | null;
  createdAt: string;      // ISO timestamp
}

interface DataSourcesState {
  sources: DataSource[];
}
```

**Reducers (actions):**

| Action | Payload | Effect |
|---|---|---|
| `addSource` | `Omit<DataSource, 'id' \| 'createdAt'>` | Generates a UUID + timestamp, adds to `sources` array |
| `updateSource` | `{ id: string } & Partial<Omit<DataSource, 'id' \| 'createdAt'>>` | Finds source by ID, merges changes |
| `removeSource` | `string` (the ID) | Removes the source from the array |
| `setCredentials` | `{ id: string; credentials: ApiCredentials \| null }` | Sets or clears credentials for a source |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectAllSources` | `DataSource[]` |
| `selectSourceById(id)` | `DataSource \| undefined` |
| `selectSourceCount` | `number` |

**UUID generation:** Use `crypto.randomUUID()` (available in all modern browsers). No library needed.

**Store registration:** Add `dataSources: dataSourcesReducer` to the store's `reducer` object in `app/src/store/index.ts`.

### 5.3 Bottom Navigation Bar Component

Create a navigation bar component that renders at the bottom of the viewport inside `AppLayout`. It uses React Router's `useLocation` and `useNavigate` (or `<NavLink>`) to highlight the active tab and handle navigation.

**New file: `app/src/components/BottomNav.tsx`**

**Structure:**
- A `<nav>` element fixed to the bottom of the viewport.
- Each tab is a `<NavLink>` to its route, containing an icon (or emoji/text placeholder initially) and a label.
- Active tab is visually distinguished via the `active` class that `NavLink` provides.

**Tabs (initial set for F3):**

| Label | Route | Icon placeholder |
|---|---|---|
| Dashboard | `/` | 🏠 (replaced with proper icon in future) |
| Data Sources | `/data-sources` | 🔗 |

Future features will add tabs here: Data Input (`/data-input`), Transactions (`/transactions`), Buckets (`/buckets`).

**Connection to AppLayout:** The `BottomNav` is rendered inside `AppLayout`, below the `<Outlet />`. The layout structure becomes:

```
<div className="app-layout">
  <header>...</header>
  <main><Outlet /></main>
  <BottomNav />
</div>
```

`<main>` needs bottom padding equal to the nav bar height so content is not hidden behind it.

### 5.4 Data Sources Page

Create the page component that renders the list of data sources and the "Add" button.

**New file: `app/src/pages/DataSourcesPage.tsx`**

**Responsibilities:**
- Reads `selectAllSources` from Redux.
- Renders a list of data source cards. Each card shows:
  - Platform name (from `PlatformDef.name` lookup, or `customPlatformName`)
  - Display name (if different from platform name)
  - Credential status indicator: "API configured" (green) or "No API key" (grey)
- An "Add Data Source" floating action button or prominent button at the top.
- Clicking a card opens the edit modal (see 5.5).
- Clicking "Add" opens the same modal in create mode.
- If the list is empty, shows an empty state message: "No data sources yet. Add one to get started."

**Route registration:** Add `<Route path="/data-sources" element={<DataSourcesPage />} />` as a sibling of the HomePage route inside the `<Route element={<AppLayout />}>` group in `App.tsx`.

### 5.5 Data Source Modal Component

Create a reusable modal component for adding and editing data sources.

**New file: `app/src/components/DataSourceModal.tsx`**

**Props:**

```typescript
interface DataSourceModalProps {
  open: boolean;
  onClose: () => void;
  existingSource?: DataSource;  // If provided, modal is in "edit" mode
}
```

**Form fields:**

1. **Platform** — `<select>` dropdown populated from `platforms` array, plus a "Custom" option at the end. Disabled in edit mode (platform can't be changed after creation).
2. **Custom platform name** — `<input type="text">`, only visible when "Custom" is selected.
3. **Display name** — `<input type="text">`, optional. Placeholder = platform name.
4. **API Credentials section** — collapsible. Contains:
   - **API Key** — `<input type="text">`
   - **API Secret** — `<input type="password">` with a show/hide toggle
5. **Save button** — dispatches `addSource` (create mode) or `updateSource` (edit mode) to Redux.
6. **Delete button** — only visible in edit mode. Dispatches `removeSource` after confirmation.
7. **Cancel button** — closes modal without changes.

**Validation (on submit):**
- Platform must be selected.
- If platformId is "custom", custom platform name must be non-empty.
- If either API key or API secret is provided, both must be provided (partial credentials are invalid).

**Modal implementation:** Use a plain HTML `<dialog>` element. The `<dialog>` element is natively supported in all modern browsers, provides built-in focus trapping and backdrop, and requires no library. Open it with `dialogRef.current?.showModal()` and close with `dialogRef.current?.close()`.

**In edit mode, credential display:**
- If credentials exist, show masked values (e.g. `••••••••abcd` — last 4 characters of the key).
- An "Update credentials" button reveals the input fields pre-cleared (for security, we don't echo full credentials into editable fields).
- A "Remove credentials" button clears credentials (with confirmation).

### 5.6 Styling

All new styles go in `app/src/styles/App.css` to keep the existing single-stylesheet convention.

**Key style additions:**

- **Bottom nav**: Fixed position at bottom, `z-index` above content, flex row, equal-width tabs, active tab colour highlight. Height ~60px.
- **App layout adjustment**: `<main>` gets `padding-bottom: 70px` to account for the fixed nav bar. The existing `body` centering (`place-items: center`) in `index.css` will need to be changed to `align-items: start` so the app layout fills the viewport rather than centering vertically.
- **Data source cards**: Simple list items with horizontal layout — platform name on the left, credential badge on the right. Subtle border/separator between items.
- **Modal**: Centered `<dialog>` with max-width ~400px, padding, backdrop dimming. Form elements stacked vertically with labels above inputs.
- **Empty state**: Centred text with muted colour.
- **Responsive**: Cards stack full-width on mobile. Modal becomes near-full-width on small screens with margin.

### 5.7 Route & Layout Updates

**File: `app/src/App.tsx`** — add the `/data-sources` route:

```typescript
import DataSourcesPage from './pages/DataSourcesPage';

// Inside the AppLayout route group:
<Route path="/data-sources" element={<DataSourcesPage />} />
```

**File: `app/src/components/AppLayout.tsx`** — add `<BottomNav />` below `<Outlet />`:

```typescript
import BottomNav from './BottomNav';

// In the return JSX:
<div className="app-layout">
  <header>...</header>
  <main><Outlet /></main>
  <BottomNav />
</div>
```

**File: `app/src/store/index.ts`** — register the new slice:

```typescript
import dataSourcesReducer from './dataSourcesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dataSources: dataSourcesReducer,
  },
});
```

### 5.8 Updated File Structure (After F3)

```
app/src/
├── components/
│   ├── AppLayout.tsx          # Updated — adds BottomNav
│   ├── BottomNav.tsx          # NEW — bottom navigation bar
│   └── DataSourceModal.tsx    # NEW — add/edit data source modal
├── data/
│   └── platforms.ts           # NEW — predefined platform registry
├── pages/
│   ├── HomePage.tsx           # Existing — no changes
│   ├── LoginPage.tsx          # Existing — no changes
│   └── DataSourcesPage.tsx    # NEW — data sources list view
├── store/
│   ├── authSlice.ts           # Existing — no changes
│   ├── dataSourcesSlice.ts    # NEW — data sources Redux slice
│   └── index.ts               # Updated — registers new slice
├── styles/
│   ├── App.css                # Updated — new styles for nav, cards, modal
│   └── index.css              # Updated — layout adjustments for bottom nav
├── App.tsx                    # Updated — new route
└── ...
```

---

## 6. Testing Plan

| # | Test | Method | Pass Criteria |
|---|---|---|---|
| 1 | Bottom nav renders on all authenticated pages | Manual — navigate between Dashboard and Data Sources | Nav bar visible at bottom on both; active tab highlighted correctly |
| 2 | Bottom nav hidden on login page | Manual — load `/login` | No bottom nav visible |
| 3 | Data Sources page shows empty state | Manual — navigate to Data Sources with no sources added | "No data sources yet" message displayed |
| 4 | Add a data source with a predefined platform | Manual — click "Add", select Binance, save | New card appears in list with "Binance" label |
| 5 | Add a data source with a custom platform | Manual — click "Add", select Custom, type "OKX", save | New card appears with "OKX" label |
| 6 | Add API credentials at creation time | Manual — add a source, expand credentials, enter key+secret, save | Card shows "API configured" indicator |
| 7 | Add API credentials to an existing source | Manual — tap a source without credentials, add key+secret, save | Card updates to show "API configured" |
| 8 | Edit a data source display name | Manual — tap a source, change display name, save | Card reflects new display name |
| 9 | Remove API credentials from a source | Manual — tap a source with credentials, click "Remove credentials", confirm | Card updates to show "No API key" |
| 10 | Delete a data source | Manual — open edit modal, click Delete, confirm | Source removed from list |
| 11 | Validation — partial credentials rejected | Manual — enter API key but not secret, try to save | Error message shown; save blocked |
| 12 | Validation — custom platform requires name | Manual — select Custom, leave name empty, try to save | Error message shown; save blocked |
| 13 | Modal closes on cancel | Manual — open modal, click Cancel | Modal closes; no state changes |
| 14 | Responsive layout — mobile | Manual — resize viewport to 375px wide | Nav bar, list, and modal all usable on small screen |
| 15 | Type-check passes | Run `npm run typecheck` | No TypeScript errors |
| 16 | Build succeeds | Run `npm run build` | Clean build with no errors |

---

## 7. Task List

Tasks are ordered to match the Technical Design subsections. Each task should be independently committable.

### Batch A — State & Data Layer
- [ ] **A1.** Create platform registry file (`app/src/data/platforms.ts`) — section 5.1
- [ ] **A2.** Create `dataSourcesSlice` with state shape, reducers, and selectors — section 5.2
- [ ] **A3.** Register `dataSourcesSlice` in the Redux store (`app/src/store/index.ts`) — section 5.2
- [ ] **A4.** Run type-check to verify state layer compiles cleanly

### Batch B — Navigation
- [ ] **B1.** Create `BottomNav` component (`app/src/components/BottomNav.tsx`) — section 5.3
- [ ] **B2.** Update `AppLayout` to render `BottomNav` below `<Outlet />` — section 5.7
- [ ] **B3.** Add bottom nav styles to `App.css` and adjust layout in `index.css` — section 5.6
- [ ] **B4.** Verify nav renders and switches between Dashboard and Data Sources (empty page for now)

### Batch C — Data Sources Page & Modal
- [ ] **C1.** Create `DataSourcesPage` component with list, empty state, and "Add" button — section 5.4
- [ ] **C2.** Create `DataSourceModal` component with add/edit/delete modes — section 5.5
- [ ] **C3.** Add `/data-sources` route in `App.tsx` — section 5.7
- [ ] **C4.** Add styles for data source cards, modal, and empty state — section 5.6

### Batch D — Integration & Verification
- [ ] **D1.** End-to-end manual test: add, edit, delete data sources — test plan items 3–13
- [ ] **D2.** Responsive testing on mobile viewport — test plan item 14
- [ ] **D3.** Run type-check and build — test plan items 15–16
- [ ] **D4.** Commit and write batch release notes
