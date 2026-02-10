# F1: Host App Such That It Runs

## Overview
This feature covers scaffolding the React web app, setting up the infrastructure, and deploying it to AWS so it is accessible from both a web browser (desktop) and a mobile device. By the end of F1 the app should be a live, publicly reachable page — even if that page is just a placeholder.

---

## 1. How React Works (Quick Primer)

### What is React?
React is a JavaScript library for building user interfaces out of **components** — small, reusable pieces of UI that manage their own state and compose together into full pages.

### Key Concepts
| Concept | What It Means |
|---|---|
| **Component** | A function (or class) that returns JSX — a syntax that looks like HTML but lives inside JavaScript. Each component can accept inputs called *props* and maintain internal *state*. |
| **JSX** | A syntax extension that lets you write `<Button label="Save" />` inside JS. It is compiled to regular JavaScript by a build tool (Vite, in our case). |
| **Virtual DOM** | React keeps a lightweight copy of the real DOM in memory. When state changes it diffs the virtual DOM against the real one and only updates what actually changed, making UI updates fast. |
| **State & Props** | *State* is data owned by a component (mutable via `useState`). *Props* are data passed down from a parent component (read-only to the child). |
| **Hooks** | Functions like `useState`, `useEffect`, `useContext` that let function components use React features (state, side effects, context, etc.) without classes. |

### Why React + TypeScript?
- TypeScript adds static types on top of JavaScript, catching bugs at compile time and improving editor auto-complete.
- The React + TS combo is the most popular web UI stack, so library support, hiring, and community help are all excellent.

### Build Tooling — Why Vite?
- **Vite** is the modern replacement for Create React App (CRA). CRA is effectively deprecated.
- Vite uses **native ES modules** during development, so the dev server starts in milliseconds — no full bundle rebuild on every save.
- For production it bundles with **Rollup**, producing optimised output with code-splitting and tree-shaking.
- Vite is the default recommendation from the React team for new projects.

---

## 2. Project Structure After Scaffolding

```
crypto_tx_tracker/
├── app/                        # All application source code lives here
│   ├── public/                 # Static assets served as-is (favicon, robots.txt)
│   ├── src/
│   │   ├── main.tsx            # Entry point — mounts the React root
│   │   ├── App.tsx             # Top-level component (router shell)
│   │   ├── components/         # Shared/reusable UI components
│   │   ├── pages/              # One file per route/view (placeholder stubs)
│   │   ├── store/              # Redux Toolkit slices and store config
│   │   ├── styles/             # Global CSS / theme
│   │   └── vite-env.d.ts       # Vite TS type shim
│   ├── index.html              # HTML shell that Vite injects the bundle into
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── infra/                      # Infrastructure-as-code (CDK / CloudFormation)
├── docs/
├── features/
└── README.md
```

> **Why an `app/` sub-folder?** Keeps the React project self-contained so infra code, docs, and feature specs don't clutter the JS toolchain (and vice versa).

---

## 3. Requirements & Dependencies

### 3.1 Node.js & npm
- **Node.js ≥ 18 LTS** — the JavaScript runtime used to run Vite, install packages, and execute build scripts.
- **npm** (bundled with Node) — package manager. Alternatives like `pnpm` or `yarn` work too, but npm is simplest to start with.
- **Why needed:** React itself is a library distributed as an npm package. Vite, TypeScript, and every other tool are also npm packages. Node runs all of this locally.

### 3.2 Core npm Packages

| Package | Purpose | Why It's Needed |
|---|---|---|
| `react`, `react-dom` | Core UI library + browser rendering | The foundation — everything else builds on React |
| `typescript` | Static type checker | Catches type errors before runtime; enables better IDE support |
| `vite`, `@vitejs/plugin-react` | Dev server + production bundler | Compiles TSX → JS, hot-reloads during dev, outputs optimised bundles |
| `react-router-dom` | Client-side routing | Lets us have multiple "pages" (views) inside a single-page app without full page reloads |
| `@reduxjs/toolkit`, `react-redux` | State management | Centralised store for app-wide state (chosen in D1 planning) |

### 3.3 Dev Dependencies

| Package | Purpose |
|---|---|
| `eslint`, `@typescript-eslint/*` | Linting — catches common mistakes and enforces code style |
| `prettier` | Code formatting — consistent style across the team |

---

## 4. Mobile + Web Accessibility

### How does one codebase serve both?
Because we chose a **web app** (not a native app), the same URL works on any device with a browser — desktop, tablet, or phone. No App Store or Play Store needed.

### What makes it work well on mobile?
1. **Responsive CSS** — use CSS media queries, flexbox, and grid so layouts adapt to screen width.
2. **Viewport meta tag** — the HTML `<meta name="viewport" content="width=device-width, initial-scale=1" />` tag tells mobile browsers to render at the device's real width instead of a fake 980px desktop viewport.
3. **Touch-friendly targets** — buttons and interactive elements should be at least 44×44 px (Apple HIG guideline).
4. **PWA (Progressive Web App) — optional but recommended:**
   - A **service worker** + **web manifest** let users "install" the site to their home screen so it behaves like a native app.
   - This is not required for F1 but is a natural next step once the skeleton is live.

### Minimum for F1
- The viewport meta tag is included in `index.html`.
- A simple responsive layout is applied (single centered card/page is fine for now).
- The site is served over HTTPS (required for mobile browsers to allow service workers later, and good practice regardless).

---

## 5. Hosting on AWS

### Why AWS?
- Decided in D1: cloud-first storage, AWS preferred.
- AWS has a generous free tier for static hosting.

### Hosting Options for a React SPA

| Service | How It Works | Cost | Complexity |
|---|---|---|---|
| **S3 + CloudFront** | S3 bucket holds the built files; CloudFront CDN serves them globally with HTTPS and caching. | Very cheap / free-tier eligible | Medium — needs S3 bucket policy, CloudFront distribution, and optional Route 53 domain. |
| **AWS Amplify Hosting** | Managed CI/CD pipeline: connect a Git repo, Amplify builds and deploys on every push. | Free tier covers small apps | Low — almost zero config; Amplify handles S3+CloudFront under the hood. |
| **EC2 / ECS** | Full server hosting. | Overkill for a static SPA | High |

### Chosen for F1: **AWS Amplify Hosting**
- Lowest setup friction — connect GitHub repo, pick branch, done.
- Automatic HTTPS certificate.
- Automatic builds on push.
- We can migrate to S3 + CloudFront later if we need finer control.

### Amplify Setup Steps (High Level)
1. Push the scaffolded React app to the GitHub repo.
2. Log in to the AWS Console → **AWS Amplify**.
3. Choose **Host web app** → connect the GitHub repo.
4. Amplify auto-detects Vite and proposes a build config (`amplify.yml`). Verify:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd app
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: app/dist
       files:
         - '**/*'
     cache:
       paths:
         - app/node_modules/**/*
   ```
5. Deploy. Amplify provides a `https://<branch>.<app-id>.amplifyapp.com` URL.
6. (Optional) Connect a custom domain via Route 53 or external DNS.

### SPA Routing Note
Single-page apps use client-side routing — all paths (e.g., `/dashboard`, `/settings`) should serve `index.html` and let React Router resolve the route in the browser. Amplify supports this via a **rewrite rule**:

| Source | Target | Type |
|---|---|---|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json)$)([^.]+$)/>` | `/index.html` | 200 (Rewrite) |

This tells the CDN: "if the URL doesn't look like a static file, serve `index.html` instead of returning 404."

---

## 6. Local Development Workflow

```bash
# 1. Install dependencies (run once, or after package.json changes)
cd app
npm install

# 2. Start the Vite dev server
npm run dev
# → opens http://localhost:5173 with hot-reload

# 3. Production build (for deployment or testing)
npm run build
# → outputs optimised files to app/dist/

# 4. Preview the production build locally
npm run preview
# → serves app/dist/ on http://localhost:4173
```

### What `npm run dev` does under the hood
- Vite starts a local HTTP server.
- It serves your source files using native ES module imports (no bundling step).
- When you edit a file, Vite sends only the changed module to the browser via a WebSocket (**Hot Module Replacement / HMR**), so the page updates without a full reload and component state is preserved.

---

## 7. HTTPS in Development (Optional)
For testing OAuth or service workers locally you may need HTTPS. Vite supports this via the `@vitejs/plugin-basic-ssl` plugin, which generates a self-signed certificate:

```ts
// vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: { https: true },
});
```

Not required for F1 but useful when F2 (OAuth) begins.

---

## 8. Acceptance Criteria for F1

- [ ] React + TypeScript app scaffolded with Vite inside `app/`.
- [ ] `npm run dev` serves a placeholder page locally.
- [ ] `npm run build` produces a production bundle in `app/dist/`.
- [ ] App is deployed to AWS Amplify (or S3+CloudFront) and accessible via a public HTTPS URL.
- [ ] The page is viewable and usable on a mobile browser (viewport meta tag, basic responsive layout).
- [ ] A simple "Hello World" or branded landing placeholder is shown — confirms the full pipeline works end to end.

---

## 9. Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Build tool | Vite | Fastest DX, recommended by React team, CRA is deprecated |
| Hosting | AWS Amplify Hosting | Lowest friction for static SPA; auto HTTPS, auto CI/CD |
| App sub-folder | `app/` | Isolates JS toolchain from docs/infra; cleaner repo root |
| Mobile strategy | Responsive web (same URL) | Single codebase; no app store overhead; PWA possible later |
| State management | Redux Toolkit | Decided in D1 — scalable, well-documented, good DevTools |

---

## 10. Open Questions / Future Considerations

1. **Custom domain** — do we want one for F1, or is the Amplify default URL fine for now?
2. **CI checks** — should Amplify run lint + type-check before deploying?
3. **Environment variables** — Amplify supports env vars for secrets (API keys, OAuth client IDs). Plan for this before F2.
4. **PWA manifest** — worth adding early for mobile home-screen install, or defer?
