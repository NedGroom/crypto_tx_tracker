# Initial Tooling Planning (Concluded)

## Goal
Decide the app stack with a **strong emphasis on UI** for a large, pannable/zoomable canvas that visualizes balances over time and interconnecting transactions. Data processing is not intensive; UI capabilities are the key decision factor.

## Primary UI Requirements (from roadmap)
- Multi‑panel layout with tables in each panel
- Large scrollable canvas/map view
  - Horizontal buckets (locations/assets)
  - Arrows between buckets for flows
  - Pan/scroll in all directions
  - Default center positions
  - Click handlers on arrows and buckets
  - Very large canvas with smooth zoom/pan

## Non‑UI Requirements
- Google OAuth login from day 1
- 2FA (TOTP or platform-supported MFA)
- Cloud-first storage is acceptable (AWS or similar)
- Data layer should be abstracted to allow local ↔ cloud swap later
- At least one mobile client (iPhone/iPad) for non-map views
- Low friction dev workflow

---

## Candidate Approaches (UI‑First Comparison)

### Option A — Desktop Web Tech (Electron + React)
**Summary:** Use Electron for desktop shell, React for UI, and a canvas/SVG engine for the map.

**Pros**
- Best-in-class UI ecosystem: React + SVG/Canvas/WebGL
- Strong layout libraries and table components
- Huge ecosystem for graph/diagramming and pan/zoom
- Easy prototyping and iteration

**Cons**
- Heavier runtime footprint
- More app packaging work
- OAuth/MFA flows require embedded browser or external auth handling
- Mobile client would be separate (web or native)

**UI Libraries that fit the map requirement**
- **React Flow** (node/edge flows, pan/zoom, drag, selection)
- **Cytoscape.js** (graph layout + interaction)
- **PixiJS** (WebGL for huge canvas performance)
- **Konva** (Canvas scene graph with pan/zoom)
- **D3 + SVG** (custom control, more manual)

**Table candidates**
- **AG Grid** (rich, heavy)
- **TanStack Table** (lightweight, flexible)

**Verdict:** Strongest desktop UI capability; needs a separate mobile client (web or native).

---

### Option B — Desktop Web Tech (Tauri + React)
**Summary:** Similar UI stack as Electron but with smaller runtime.

**Pros**
- Smaller binary footprint than Electron
- Same UI ecosystem as React

**Cons**
- Some native integration complexity
- Slightly smaller community vs Electron
- OAuth/MFA flows require embedded browser or external auth handling
- Mobile client would be separate (web or native)

**Verdict:** Good if desktop-only and you want smaller app size. UI capability same as Electron; needs separate mobile client.

---

### Option C — Web App (React + browser)
**Summary:** Host locally or deploy to cloud, use standard web UI.

**Pros**
- Best UI flexibility
- Easy access on multiple devices
- No packaging
- OAuth + MFA is straightforward with standard web auth flows
- Single codebase for desktop + mobile (responsive)

**Cons**
- Local-first database and file access more complex
- Harder offline support and file system integration

**Verdict:** Great for UI and mobile access; cloud-first storage is easiest here.

---

### Option D — Python Desktop (PyQt/PySide)
**Summary:** Native desktop UI with Qt widgets and graphics view.

**Pros**
- Strong desktop widgets and tables
- GraphicsView can support complex canvas

**Cons**
- Slower to iterate on complex UI/graphics
- Fewer modern graph/flow libraries than web
- OAuth/MFA flows are more bespoke
- Mobile client would be separate

**Verdict:** Viable, but more UI engineering effort for the map and auth flows.

---

### Option E — .NET Desktop (WPF/WinUI)
**Summary:** Windows‑first native UI.

**Pros**
- Strong desktop UI toolkit
- Good performance and layout tools

**Cons**
- Windows-only
- Smaller ecosystem for graph canvas than web
- OAuth/MFA flows are more bespoke
- Mobile client would be separate

**Verdict:** Good if Windows-only, but less flexible for map UI and auth.

---

### Option F — Flutter Desktop
**Summary:** Cross‑platform UI using Flutter.

**Pros**
- Fast, smooth UI
- Good canvas drawing APIs

**Cons**
- Smaller ecosystem for graph tooling
- Requires Dart + Flutter stack adoption
- OAuth/MFA requires additional setup

**Verdict:** Possible, but web tech has better graph libraries and simpler auth.

---

### Option G — React Native
**Summary:** Mobile‑first framework.

**Pros**
- Mobile access

**Cons**
- Complex for large desktop-style canvas
- Weaker for multi‑panel table-heavy desktop UI
- OAuth/MFA is fine, but desktop web UI would still be needed

**Verdict:** Not ideal for the map view; good only as a companion mobile client.

---

## Quick Comparison Matrix (UI + Auth + Mobile)

| Option | Canvas/Graph UI | Table/Panel UI | Auth/MFA | Cloud‑First Storage | Mobile Access |
| --- | --- | --- | --- | --- | --- |
| Electron + React | Excellent | Excellent | Moderate | Good (via API) | Separate client needed |
| Tauri + React | Excellent | Excellent | Moderate | Good (via API) | Separate client needed |
| Web App (React) | Excellent | Excellent | Excellent | Excellent | Built-in (responsive) |
| PyQt/PySide | Good | Good | Moderate | Good (via API) | Separate client needed |
| WPF/WinUI | Good | Good | Moderate | Good (via API) | Separate client needed |
| Flutter | Good | Good | Good | Good (via API) | Good |
| React Native | Fair | Fair | Good | Good (via API) | Good (mobile only) |

---

## Recommended Direction (Re‑analysis)
Given the new requirements (OAuth + 2FA, cloud-first storage, and mobile access), two strong paths emerge:

**Option 1 — Web App First (Recommended):**
- **React web app** + cloud backend + OAuth/MFA.
- Immediate mobile access via responsive design.
- Simplest auth flow and cloud storage integration.
- Map view still feasible using web libraries (React Flow/PixiJS/Konva).

**Option 2 — Desktop + Web Companion:**
- **Electron/Tauri** for the desktop-heavy workflow.
- **Web/mobile companion** for lightweight views.
- More moving parts, but preserves best desktop UI.

**Why Option 1 fits best now:**
- Single codebase for desktop + mobile
- OAuth/MFA and cloud storage are standard on web
- Still provides best-in-class UI tooling

---

## Proposed UI Stack (if choosing Web‑First)
- **UI framework:** React + TypeScript
- **Layout:** CSS Grid / Flex + panel library (e.g., Golden Layout or custom)
- **Tables:** AG Grid or TanStack Table
- **Canvas map:** React Flow (start), then evaluate PixiJS/Konva for performance
- **State management:** Zustand or Redux Toolkit

---

## Data/Storage (Cloud‑First Draft)
- **Database:** Managed Postgres (e.g., AWS RDS) or DynamoDB
- **API:** Backend service with auth (OAuth + MFA)
- **Abstraction:** Repository/service layer to allow future local storage swap

---

## Open Questions
1. Is web‑first acceptable as the primary UI, with desktop-only later if needed?
2. Preferred auth provider for OAuth + MFA (Google only or multi‑provider)?
3. Cloud stack preference (AWS vs other)?
4. Do we need GPU‑accelerated rendering (PixiJS) for the map?
5. Should the map be node/edge (React Flow) or custom canvas (PixiJS/Konva)?

---

## Next Steps
1. Decide target platform (web‑first vs desktop + web companion).
2. Choose auth provider and MFA approach.
3. Prototype a minimal map view using React Flow or Konva.
4. Validate pan/zoom smoothness with 1k+ nodes/edges.
5. Pick table library based on required features (filters, pinned columns, inline edit).
6. Finalize stack decision and document in architecture notes.

---

# Conclusion (Current Decision)

## Decision Summary
**Chosen option:** **Option C — React Web App**

**Rationale:**
- Best UI ecosystem for complex tables and future canvas/map work
- Single codebase for desktop + mobile access
- Simplest hosting path for an initial deployment
- Aligns with AWS cloud‑first storage

**Note on Flutter:** Flutter does support both mobile and desktop, but it has a smaller ecosystem for complex graph/canvas tooling compared to the web stack.

## Current Execution Plan
- **State management:** Redux Toolkit (chosen over Zustand)
- **Map view:** Deferred until after skeleton/hosting/auth/data input views
- **Auth:** Planned after initial deployment; Google OAuth first, abstracted for multi‑provider and MFA later
- **Hosting:** AWS, with cloud‑first storage and an abstraction layer for potential local swap

## Updated Next Steps
1. Scaffold the React web app skeleton.
2. Deploy to AWS with a minimal working page.
3. Introduce basic navigation between placeholder views.
4. Begin authentication planning after deployment is confirmed.
5. Start data input view planning and table library selection.