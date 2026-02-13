# F2 Batches C & D — Frontend Auth Code + AuthStack Deploy

**Date:** 2026-02-13
**Branch:** `feature/f2/oauth_login`

## Summary

Batch D (frontend) was implemented first, followed by Batch C (deploy AuthStack). Local testing confirmed the full Google OAuth flow works end-to-end.

---

## Batch D — Frontend Auth Code (T5–T14)

### Created
- `app/src/config/amplify.ts` — Amplify.configure() with Cognito settings via VITE_ env vars
- `app/src/store/index.ts` — Redux store (configureStore + RootState/AppDispatch types)
- `app/src/store/authSlice.ts` — Auth state, reducers (loginStart/Success/Failure, logout), selectors
- `app/src/pages/LoginPage.tsx` — "Sign in with Google" button using `signInWithRedirect`
- `app/src/hooks/useAuthInit.ts` — Custom hook: checks session on mount via `getCurrentUser`/`fetchAuthSession`, dispatches to Redux
- `app/src/components/AppLayout.tsx` — Layout route guard with loading state, auth redirect, sign-out button, Outlet
- `app/src/pages/HomePage.tsx` — Authenticated placeholder page

### Modified
- `app/src/main.tsx` — Added Redux `<Provider>` wrapper and Amplify config side-effect import
- `app/src/App.tsx` — Replaced placeholder with BrowserRouter + Routes (public `/login`, protected layout route)
- `app/src/styles/App.css` — Added header flexbox styles to fix spacing between title, email, and sign-out button

### Installed
- `aws-amplify` v6 — adds ~330KB gzipped to production bundle (651 modules total after build)

### Verified
- `npm run build` passed cleanly — 0 TypeScript errors
- Lint-staged hooks passed on commit

---

## Batch C — Deploy AuthStack (T4)

### Sequence of Events

1. **First deploy attempt failed** — `Could not parse SecretString JSON` on the Google IdP resource.
2. **Root cause:** The Secrets Manager secret created in Batch A had malformed JSON — `{clientId:...,clientSecret:...}` without quotes around keys/values. This was caused by PowerShell stripping inner quotes even from single-quoted `$json` variables when passing to external CLI commands.
3. **Fix:** Used the file-based workaround — wrote JSON to a temp file with `Out-File -Encoding ascii -NoNewline`, then passed `file://$env:TEMP\secret.json` to `aws secretsmanager put-secret-value`. Verified the secret now contained properly quoted JSON.
4. **Deleted the ROLLBACK_COMPLETE stack** — `aws cloudformation delete-stack` (took two attempts; the first `delete-stack` appeared not to register, the second succeeded).
5. **Redeployed successfully** — all 6 resources created (UserPool, Domain, GoogleIdP, WebAppClient, CDKMetadata, stack).

### CDK Output Values
| Output | Value |
|---|---|
| UserPoolId | `eu-west-2_vLIzAhvnA` |
| UserPoolClientId | `49201onul289kk1rumo2orbdts` |
| CognitoDomain | `crypto-tx-tracker.auth.eu-west-2.amazoncognito.com` |

### Manual Steps
- **Google Cloud Console:** Added authorised redirect URI `https://crypto-tx-tracker.auth.eu-west-2.amazoncognito.com/oauth2/idpresponse` to the OAuth Client ID (encountered a "Save failed" error on first attempt; succeeded on retry).
- **`.env` updated:** Replaced placeholder Cognito values with the real output values above.

---

## Local Testing

- Dev server started on `http://localhost:5173/`
- App redirects unauthenticated users to `/login` (loading → redirect works, no flash of app content)
- "Sign in with Google" triggers Cognito → Google consent → redirect back to app
- After auth: Dashboard page renders with user email displayed in header
- Header spacing was initially broken (elements ran together) — fixed with CSS flexbox styles

---

## Other Changes This Session
- **Instructions file:** Added PowerShell quote-stripping workaround, CloudFormation commands to Command Index, updated batch release notes rule to re-read conversation history before writing
- **Roadmap:** Added future extension item #4 — age verification & user profile data (DOB, country, address, tax ID, base currency, filing status, display name)
